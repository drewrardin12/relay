const day=value=>String(value||'').slice(0,10);
const choice=value=>['yes','no'].includes(value)?value:'unknown';
const count=value=>value===''||value===null||value===undefined?null:Math.max(0,Math.trunc(Number(value)||0));
export function journalMeetings(state){
 const rows=Array.isArray(state?.calendarMeetings)&&state.calendarMeetings.length?state.calendarMeetings:(state?.meetings||[]);
 return rows.filter(meeting=>!meeting.excludeFromStats);
}

export function meetingEnd(meeting){return day(meeting?.end||meeting?.date);}

export function debriefComplete(meeting){
 return Boolean(meeting?.debrief?.completedAt||['cancelled','postponed'].includes(meeting?.debrief?.status));
}

export function pendingMeetingDebriefs(state,today=new Date().toISOString().slice(0,10)){
 const enabled=day(state?.settings?.meetingDebriefEnabledAt||today);
 return journalMeetings(state).filter(meeting=>{
  const started=day(meeting?.date),snoozed=day(meeting?.debrief?.snoozedUntil);
  return started&&started>=enabled&&started<=today&&!debriefComplete(meeting)&&(!snoozed||snoozed<=today);
 }).sort((a,b)=>day(a.date).localeCompare(day(b.date)));
}

export function pastMeetingDebriefs(state,today=new Date().toISOString().slice(0,10)){
 return journalMeetings(state).filter(meeting=>meetingEnd(meeting)&&meetingEnd(meeting)<today&&!debriefComplete(meeting)).sort((a,b)=>meetingEnd(b).localeCompare(meetingEnd(a)));
}

export function snoozeMeetingDebrief(meeting,today=new Date().toISOString().slice(0,10)){
 const next=new Date(`${today}T12:00:00`);next.setDate(next.getDate()+1);
 meeting.debrief={...(meeting.debrief||{}),snoozedUntil:next.toISOString().slice(0,10)};
 return meeting;
}

export function snoozeMeetingDebriefById(state,id,today=new Date().toISOString().slice(0,10)){
 const meeting=journalMeetings(state).find(row=>row.id===id);
 return meeting?snoozeMeetingDebrief(meeting,today):null;
}

export function saveMeetingDebrief(meeting,fields,now=new Date().toISOString()){
 const attended=fields.attended==='no'?'no':'yes';
 const legacySermons=String(fields.sermons||'').split(/\n+/).map(v=>v.trim()).filter(Boolean);
 const sermonEntries=Array.isArray(fields.sermonEntries)?fields.sermonEntries.map(row=>({title:String(row?.title||'').trim(),service:String(row?.service||'').trim(),serviceOther:String(row?.serviceOther||'').trim()})).filter(row=>row.title):legacySermons.map(title=>({title,service:'',serviceOther:''}));
 const results={};for(const key of ['biblesDistributed','doorsKnocked','visitsMade','gospelConversations','promises','salvations','visitors','baptisms'])results[key]=count(fields?.outreachResults?.[key]??fields[key]??(key==='biblesDistributed'?fields.biblesPassed:key==='salvations'?fields.salvations:null));
 meeting.debrief={
  ...(meeting.debrief||{}),version:2,attended,status:attended==='no'?'cancelled':(fields.status||'completed'),
  preached:choice(fields.preached),
  sermonCount:sermonEntries.length,sermonEntries,sermons:sermonEntries.map(row=>row.title),
  presentedMinistry:choice(fields.presentedMinistry),didOutreach:choice(fields.didOutreach),
  outreachTypes:Array.isArray(fields.outreachTypes)?fields.outreachTypes:[],outreachOther:String(fields.outreachOther||'').trim(),outreachResults:results,outreachNotes:String(fields.outreachNotes||'').trim(),
  handout:fields.didOutreach==='yes'?(Array.isArray(fields.outreachTypes)&&fields.outreachTypes.includes('Bible handout')?'yes':'no'):choice(fields.handout),outreach:String(fields.outreachNotes||fields.outreach||'').trim(),
  salvations:results.salvations,biblesPassed:results.biblesDistributed,visitorsCount:results.visitors,visitors:results.visitors>0?'yes':'no',baptisms:results.baptisms,promises:results.promises,gospelConversations:results.gospelConversations,doorsKnocked:results.doorsKnocked,visitsMade:results.visitsMade,
  served:choice(fields.served),serviceRoles:Array.isArray(fields.serviceRoles)?fields.serviceRoles:[],serviceRoleOther:String(fields.serviceRoleOther||'').trim(),
  newSupport:choice(fields.newSupport),existingSupport:choice(fields.existingSupport),support:fields.newSupport==='yes'||fields.existingSupport==='yes'?'yes':fields.newSupport==='no'&&fields.existingSupport==='no'?'no':choice(fields.support),
  lodging:choice(fields.churchLodging??fields.lodging),lodgingNotes:String(fields.lodgingNotes||'').trim(),
  journal:String(fields.journalNotes??fields.journal??'').trim(),
  photo:fields.photo||meeting.debrief?.photo||'',polarstepsUpdated:Boolean(fields.polarstepsUpdated),
  completedAt:now,snoozedUntil:''
 };
 return meeting;
}

export function applyDebriefToContact(contact,debrief){
 if(!contact||!debrief)return contact;
 if(debrief.lodging==='yes')contact.lodging='Available';
 if(debrief.lodging==='no')contact.lodging='Unavailable';
 if(debrief.handout==='yes')contact.handouts='Available';
 if(debrief.handout==='no')contact.handouts='Unavailable';
 if(debrief.support==='yes')contact.supportStatus='Supporting';
 if(debrief.support==='no')contact.supportStatus='Non-supporting';
 return contact;
}

export function polarstepsCatchup(state,today=new Date().toISOString().slice(0,10)){
 const since=day(state?.settings?.polarstepsCatchupFrom||'2026-05-21');
 return journalMeetings(state).filter(meeting=>meetingEnd(meeting)&&meetingEnd(meeting)>since&&meetingEnd(meeting)<today&&!meeting?.debrief?.polarstepsUpdated&&!['cancelled','postponed'].includes(meeting?.debrief?.status)).sort((a,b)=>meetingEnd(a).localeCompare(meetingEnd(b)));
}

export function ministryJournalStats(state,year=null){
 const debriefs=journalMeetings(state).filter(meeting=>year===null||day(meeting.date).startsWith(`${year}-`)).map(meeting=>meeting.debrief).filter(d=>d?.completedAt&&d.status==='completed');
 const numeric=value=>{const n=Number(value);return Number.isFinite(n)?n:0;};
 const total=key=>debriefs.reduce((sum,d)=>sum+numeric(d.outreachResults?.[key]??d[key]),0);
 return {visits:debriefs.length,sermons:debriefs.reduce((sum,d)=>sum+(Array.isArray(d.sermons)?d.sermons.length:numeric(d.sermonCount)),0),bibles:debriefs.reduce((sum,d)=>sum+numeric(d.outreachResults?.biblesDistributed??d.biblesPassed),0),salvations:total('salvations'),doorsKnocked:total('doorsKnocked'),visitsMade:total('visitsMade'),gospelConversations:total('gospelConversations'),promises:total('promises'),visitors:total('visitors'),baptisms:total('baptisms')};
}

export function latestJourneyMeeting(state,today=new Date().toISOString().slice(0,10),eligible=()=>true){
 return journalMeetings(state)
  // Google Calendar stores an all-day event's end date as the first day after
  // the event. Use the meeting's start date for the journey map so yesterday's
  // stop is visible today instead of being held back an extra day.
  .filter(meeting=>day(meeting?.date)<today&&!['cancelled','postponed'].includes(meeting?.debrief?.status)&&eligible(meeting))
  .sort((a,b)=>day(b?.date).localeCompare(day(a?.date)))[0]||null;
}
