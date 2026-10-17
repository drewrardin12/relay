const list=value=>Array.isArray(value)?value.map(String).map(s=>s.trim()).filter(Boolean):String(value||'').split(/[\n;,]+/).map(s=>s.trim()).filter(Boolean);
const key=value=>String(value||'').trim().toLowerCase();

export function applyBadEmailPatch(state,patch){
 if(patch?.kind!=='relay-bad-emails-v1'||!Array.isArray(patch.records))throw Error('Choose a reviewed failed-email update, not a backup.');
 const records=new Map(patch.records.filter(row=>row?.address).map(row=>[key(row.address),row]));
 const next={...state,contacts:state.contacts.map(contact=>({...contact}))};
 const updated=[],unmatched=new Set(records.keys());
 for(const contact of next.contacts){
  const removed=[];
  for(const field of ['email','church_email']){
   const before=list(contact[field]),after=before.filter(address=>!records.has(key(address)));
   for(const address of before)if(records.has(key(address)))removed.push(address);
   if(after.length!==before.length)contact[field]=after;
  }
  if(!removed.length)continue;
  const history=(Array.isArray(contact.failedEmails)?contact.failedEmails:[]).map(row=>typeof row==='string'?{address:row}:row).filter(row=>row?.address);
  for(const address of [...new Set(removed)]){
   const record=records.get(key(address));unmatched.delete(key(address));
   const existing=history.find(row=>key(row.address)===key(address));
   const entry={address,date:record.date||patch.reviewedAt?.slice(0,10)||'',status:record.status||'Failed',note:record.note||'Ministry email attempted; delivery did not complete.'};
   if(existing)Object.assign(existing,entry);else history.push(entry);
  }
  contact.failedEmails=history;updated.push(contact.id);
 }
 return {next,updated,unmatched:[...unmatched]};
}
