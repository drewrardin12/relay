const day=value=>String(value||'').slice(0,10);

export function meetingEnd(meeting){return day(meeting?.end||meeting?.date);}

export function debriefComplete(meeting){
 return Boolean(meeting?.debrief?.completedAt||['cancelled','postponed'].includes(meeting?.debrief?.status));
}

export function pendingMeetingDebriefs(state,today=new Date().toISOString().slice(0,10)){
 const enabled=day(state?.settings?.meetingDebriefEnabledAt||today);
 return (state?.meetings||[]).filter(meeting=>{
  const ended=meetingEnd(meeting),snoozed=day(meeting?.debrief?.snoozedUntil);
  return ended&&ended>=enabled&&ended<today&&!debriefComplete(meeting)&&(!snoozed||snoozed<=today);
 }).sort((a,b)=>meetingEnd(a).localeCompare(meetingEnd(b)));
}

export function pastMeetingDebriefs(state,today=new Date().toISOString().slice(0,10)){
 return (state?.meetings||[]).filter(meeting=>meetingEnd(meeting)&&meetingEnd(meeting)<today&&!debriefComplete(meeting)).sort((a,b)=>meetingEnd(b).localeCompare(meetingEnd(a)));
}

export function snoozeMeetingDebrief(meeting,today=new Date().toISOString().slice(0,10)){
 const next=new Date(`${today}T12:00:00`);next.setDate(next.getDate()+1);
 meeting.debrief={...(meeting.debrief||{}),snoozedUntil:next.toISOString().slice(0,10)};
 return meeting;
}

export function saveMeetingDebrief(meeting,fields,now=new Date().toISOString()){
 meeting.debrief={
  ...(meeting.debrief||{}),status:fields.status||'completed',
  sermons:String(fields.sermons||'').split(/\n+/).map(v=>v.trim()).filter(Boolean),
  handout:fields.handout||'unknown',journal:String(fields.journal||'').trim(),
  photo:fields.photo||meeting.debrief?.photo||'',polarstepsUpdated:Boolean(fields.polarstepsUpdated),
  completedAt:now,snoozedUntil:''
 };
 return meeting;
}
