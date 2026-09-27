const day=value=>/^\d{4}-\d{2}-\d{2}$/.test(String(value||''));
const clean=value=>String(value||'').trim();

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
   before===JSON.stringify(calendarFields)?summary.unchanged++:summary.updated++;
  }else{
   next.calendarMeetings.push({id:'gcal:'+googleEventId,...calendarFields,contactId:matched?contactId:'',excludeFromStats:!matched});summary.added++;
   if(!matched){review.push({googleEventId,title:calendarFields.title,reason:'choose the correct Relay contact'});summary.unmatched++;}
  }
 }
 next.calendarSync={importedAt:new Date().toISOString(),sourceUpdatedAt:clean(bundle.updatedAt),review,summary};
 return next;
}
