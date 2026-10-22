const day=value=>/^\d{4}-\d{2}-\d{2}$/.test(String(value||''));
const clean=value=>String(value||'').trim();
const identity=m=>String(m.googleEventId||m.id||'');
export const sameVisit=(a,b)=>Boolean(a.contactId&&a.contactId===b.contactId&&a.date===b.date&&(a.end||a.date)===(b.end||b.date)&&(!a.time||!b.time||a.time===b.time));
const cancelled=m=>m.calendarStatus==='cancelled'||Boolean(m.relayCancelledAt);
export function cancelMeeting(state,id,stamp=new Date().toISOString()){
 const all=[...(state.calendarMeetings||[]),...(state.meetings||[]),...(state.events||[]).filter(m=>m.kind==='meeting')];
 const target=all.find(m=>m.id===id);if(!target)throw Error('Meeting not found');
 // Persist a local cancellation even while the Google event still exists.
 if(!(state.meetings||[]).some(m=>m.id===id)){state.meetings||=[];state.meetings.push({...target});}
 for(const m of [...all,...state.meetings])if(m.id===target.id||identity(m)===identity(target)||sameVisit(m,target))Object.assign(m,{relayCancelledAt:stamp});
 return target;
}
export function googleMeetingLink(m,c={}){
 if(m.googleEventId&&m.calendarId)return 'https://calendar.google.com/calendar/event?eid='+encodeURIComponent(btoa(m.googleEventId+' '+m.calendarId));
 return 'https://calendar.google.com/calendar/u/0/r/day/'+String(m.date||'').replaceAll('-','/');
}
export function updateMeetingDetails(state,id,fields){
 const all=[...(state.calendarMeetings||[]),...(state.meetings||[]),...(state.events||[]).filter(m=>m.kind==='meeting')];
 const target=all.find(m=>m.id===id);if(!target)throw Error('Meeting not found');
 const matches=all.filter(m=>m.id===id||identity(m)===identity(target)||sameVisit(m,target));
 // Only form-owned fields change; Calendar IDs, history and questionnaires stay intact.
 const patch=Object.fromEntries(['contactId','date','end','time','roles','lodgingVerified','notes'].filter(k=>k in fields).map(k=>[k,fields[k]]));
 for(const m of matches)Object.assign(m,structuredClone(patch));
 return target;
}

// Read-only schedule projection: Google updates never rewrite a questionnaire.
export function calendarSchedule(state){
 const calendar=state.calendarMeetings||[];
 const linked=new Set(calendar.map(identity));
 const cancellations=[...calendar,...(state.meetings||[]),...(state.events||[])].filter(cancelled);
 const isCancelled=m=>cancelled(m)||cancellations.some(c=>identity(c)===identity(m)||sameVisit(c,m));
 // Older manually saved schedules have random IDs. Hide their mirror only
 // when one Calendar occurrence identifies the visit unambiguously. Keep the
 // original records (and every questionnaire) intact for editing/recovery.
 const local=(state.meetings||[]).filter(m=>!isCancelled(m)&&!m.excludeFromStats&&!linked.has(identity(m))&&calendar.filter(c=>sameVisit(m,c)).length!==1);
 const active=calendar.filter(m=>!isCancelled(m)&&!m.excludeFromStats);
 return [...local,...active];
}
export function calendarTimeline(state){
 const meetings=[...(state.meetings||[])];
 for(const e of state.events||[])if(e.kind==='meeting'&&!meetings.some(m=>m.id===e.id))meetings.push(e);
 return [...(state.events||[]).filter(e=>e.kind!=='meeting'),...calendarSchedule({...state,meetings}).map(m=>({...m,kind:'meeting'}))];
}

export function importCalendarMetadata(state,bundle){
 if(bundle?.kind!=='relay-calendar-metadata'||!Array.isArray(bundle.events))throw Error('Choose a Relay Calendar metadata file.');
 const next=structuredClone(state),contacts=new Set((next.contacts||[]).map(c=>c.id));
 next.calendarMeetings=Array.isArray(next.calendarMeetings)?next.calendarMeetings:[];
 const existing=new Map(next.calendarMeetings.map(m=>[clean(m.googleEventId||m.id),m]));
 const seen=new Set(),review=[],summary={added:0,updated:0,cancelled:0,unchanged:0,unmatched:0};
 for(const raw of bundle.events){
  const googleEventId=clean(raw.googleEventId||raw.id),status=clean(raw.status||'confirmed').toLowerCase();
  if(!googleEventId||seen.has(googleEventId))throw Error('Calendar event IDs are missing or repeated. Nothing imported.');
  seen.add(googleEventId);
  if(!['confirmed','tentative','cancelled'].includes(status))throw Error('A Calendar event has an unfamiliar status. Nothing imported.');
  const found=existing.get(googleEventId);
  if(status!=='cancelled'&&(!day(raw.date)||!day(raw.end||raw.date)||(raw.end&&raw.end<raw.date)))throw Error('A Calendar event has invalid dates. Nothing imported.');
  if(status==='cancelled'){
   if(!found){review.push({googleEventId,reason:'cancelled event was not saved in Relay'});summary.unmatched++;continue;}
   if(found.calendarStatus==='cancelled'){summary.unchanged++;continue;}
   Object.assign(found,{calendarStatus:'cancelled',cancelledAt:clean(raw.updatedAt)||new Date().toISOString(),excludeFromStats:true});summary.cancelled++;continue;
  }
  const contactId=clean(raw.contactId||found?.contactId),matched=contactId&&contacts.has(contactId);
  const calendarFields={googleEventId,title:clean(raw.title),date:raw.date,end:raw.end||raw.date,time:clean(raw.time),location:clean(raw.location),calendarStatus:status,calendarUpdatedAt:clean(raw.updatedAt),kind:'meeting'};
  if(found){
   const before=JSON.stringify(Object.fromEntries(Object.keys(calendarFields).map(k=>[k,found[k]??''])));
   Object.assign(found,calendarFields);
   if(matched)found.contactId=contactId;
   delete found.cancelledAt;
   if(found.classificationConfirmed!==true)delete found.excludeFromStats;
   if(!matched){found.excludeFromStats=true;review.push({googleEventId,title:calendarFields.title,reason:'choose the correct Relay contact'});summary.unmatched++;}
   if(matched&&!found.debrief&&!found.debriefDraft){
    const journals=next.calendarMeetings.filter(m=>m!==found&&!m.googleEventId&&!m.excludeFromStats&&m.contactId===contactId&&m.date===found.date&&(m.end||m.date)===(found.end||found.date)&&m.debrief?.completedAt);
    if(journals.length===1){
     const journal=journals[0];
     // Retain the complete source record for recovery. The Calendar row is
     // the active journal so subsequent automatic dates still update it.
     const metadata=new Set(['id','contactId','title','date','end','time','location','kind','excludeFromStats','classificationConfirmed','source','googleEventId','calendarId','calendarStatus','calendarUpdatedAt']);
     for(const [key,value] of Object.entries(journal))if(!metadata.has(key)&&found[key]===undefined)found[key]=structuredClone(value);
     found.journalSourceId=journal.id;
     journal.excludeFromStats=true;journal.classificationConfirmed=true;journal.supersededBy=found.id;
    }
   }
   before===JSON.stringify(calendarFields)?summary.unchanged++:summary.updated++;
  }else{
   next.calendarMeetings.push({id:'gcal:'+googleEventId,...calendarFields,contactId:matched?contactId:'',excludeFromStats:!matched});summary.added++;
   if(!matched){review.push({googleEventId,title:calendarFields.title,reason:'choose the correct Relay contact'});summary.unmatched++;}
  }
 }
 next.calendarSync={importedAt:new Date().toISOString(),sourceUpdatedAt:clean(bundle.updatedAt),review,summary};
 return next;
}
