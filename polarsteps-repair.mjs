const meaningful=value=>value!==undefined&&value!==null&&value!==''&&value!=='unknown';
function mergeDebriefs(a={},b={}){
 const journal=[a.journal,b.journal].filter(Boolean).reduce((all,text)=>all.some(saved=>saved===text||saved.includes(text))?all:[...all,text],[]).join('\n\n');
 return {...a,...b,sermons:[...new Set([...(a.sermons||[]),...(b.sermons||[])])],journal,
  preached:meaningful(a.preached)?a.preached:b.preached,handout:meaningful(a.handout)?a.handout:b.handout,
  visitors:meaningful(a.visitors)?a.visitors:b.visitors,lodging:meaningful(a.lodging)?a.lodging:b.lodging,
  support:meaningful(a.support)?a.support:b.support,outreach:a.outreach||b.outreach||'',
  salvations:a.salvations??b.salvations??null,biblesPassed:a.biblesPassed??b.biblesPassed??null,
  photo:a.photo||b.photo||'',polarstepsImport:Boolean(a.polarstepsImport||b.polarstepsImport),polarstepsUpdated:Boolean(a.polarstepsUpdated||b.polarstepsUpdated)};
}
export function consolidatePolarstepsMeetings(state){
 if(!Array.isArray(state.calendarMeetings))return state;
 const kept=[],seen=new Map();
 for(const meeting of state.calendarMeetings){
  const idKey=`id:${meeting.id}`,semanticKey=meeting.debrief?.polarstepsImport?`polar:${[meeting.date,meeting.contactId,meeting.title].join('\u0000')}`:'';
  const duplicate=seen.get(idKey)||(semanticKey&&seen.get(semanticKey));
  if(!duplicate){seen.set(idKey,meeting);if(semanticKey)seen.set(semanticKey,meeting);kept.push(meeting);continue;}
  duplicate.debrief=mergeDebriefs(duplicate.debrief,meeting.debrief);
 }
 state.calendarMeetings=kept;return state;
}
