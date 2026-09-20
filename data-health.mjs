const validDate=value=>/^\d{4}-\d{2}-\d{2}$/.test(String(value||''));
export function dataHealth(state){
 const contacts=new Set((state.contacts||[]).map(c=>c.id)),issues=[];
 const duplicateIds=(rows,label)=>{const seen=new Set(),dupes=new Set();for(const row of rows||[]){if(!row.id)issues.push({kind:'missing-id',label});else if(seen.has(row.id))dupes.add(row.id);seen.add(row.id);}if(dupes.size)issues.push({kind:'duplicate-id',label,count:dupes.size});};
 duplicateIds(state.contacts,'contacts');duplicateIds(state.logs,'history');duplicateIds(state.meetings,'meetings');duplicateIds(state.tides,'tides');duplicateIds(state.gifts,'gifts');
 for(const [label,rows] of [['history',state.logs],['meetings',state.meetings],['tides',state.tides],['gifts',state.gifts]]){
  const orphaned=(rows||[]).filter(row=>row.contactId&&!contacts.has(row.contactId));if(orphaned.length)issues.push({kind:'orphaned-contact',label,count:orphaned.length});
 }
 const calendar=(state.calendarMeetings||[]).filter(m=>!m.excludeFromStats),keys=new Map();
 for(const m of calendar){if(!validDate(m.date)||!validDate(m.end||m.date))issues.push({kind:'invalid-date',label:'calendar'});const key=[m.contactId,m.date,m.end||m.date].join('|');keys.set(key,(keys.get(key)||0)+1);}
 const overlaps=[...keys.values()].filter(n=>n>1).length;if(overlaps)issues.push({kind:'duplicate-meeting-range',label:'calendar',count:overlaps});
 const missingContact=calendar.filter(m=>!m.contactId).length;if(missingContact)issues.push({kind:'unmatched-meeting',label:'calendar',count:missingContact});
 return {ok:issues.length===0,issues,checkedAt:new Date().toISOString(),counts:{contacts:state.contacts?.length||0,history:state.logs?.length||0,meetings:calendar.length,tides:state.tides?.length||0,gifts:state.gifts?.length||0}};
}
