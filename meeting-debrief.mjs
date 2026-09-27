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
  const ended=meetingEnd(meeting),snoozed=day(meeting?.debrief?.snoozedUntil);
  return ended&&ended>=enabled&&ended<today&&!debriefComplete(meeting)&&(!snoozed||snoozed<=today);
 }).sort((a,b)=>meetingEnd(a).localeCompare(meetingEnd(b)));
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
 meeting.debrief={
  ...(meeting.debrief||{}),status:fields.status||'completed',
  preached:choice(fields.preached),
  sermons:String(fields.sermons||'').split(/\n+/).map(v=>v.trim()).filter(Boolean),
  handout:choice(fields.handout),outreach:String(fields.outreach||'').trim(),
  salvations:count(fields.salvations),biblesPassed:count(fields.biblesPassed),
  visitors:choice(fields.visitors),lodging:choice(fields.lodging),support:choice(fields.support),
  journal:String(fields.journal||'').trim(),
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

export function ministryJournalStats(state){
 const debriefs=journalMeetings(state).map(meeting=>meeting.debrief).filter(d=>d?.completedAt&&d.status==='completed');
 return {visits:debriefs.length,sermons:debriefs.reduce((sum,d)=>sum+(d.sermons?.length||0),0),bibles:debriefs.reduce((sum,d)=>sum+(d.biblesPassed||0),0),salvations:debriefs.reduce((sum,d)=>sum+(d.salvations||0),0)};
}
