// Read-only checks: missing links are retained, never deleted or reassigned.
export function auditData(state){
 const contacts=state.contacts||[],ids=new Set(contacts.map(c=>c.id));
 const issues=[];
 const seen=new Set();
 for(const c of contacts){if(!c.id||seen.has(c.id))issues.push({table:'contacts',id:c.id||'',reason:!c.id?'missing-id':'duplicate-id'});seen.add(c.id);}
 for(const table of ['logs','gifts','tides','meetings','events','calendarMeetings']){
  for(const row of state[table]||[])if(row.contactId&&!ids.has(row.contactId))issues.push({table,id:row.id,contactId:row.contactId,reason:'missing-contact'});
 }
 return {calendarAvailable:Array.isArray(state.calendarMeetings),calendarCount:state.calendarMeetings?.length||0,issues};
}
