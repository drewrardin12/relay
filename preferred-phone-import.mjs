const key=s=>String(s||'').replace(/\D/g,'').replace(/^1(?=\d{10}$)/,'');
export function applyPreferredPhones(state,patch){
 if(patch?.kind!=='relay-preferred-phones-v1'||!Array.isArray(patch.updates))throw Error('Choose a preferred-number update, not a backup.');
 const next={...state,contacts:state.contacts.map(c=>({...c}))},seen=new Set(),updated=[],skipped=[];
 for(const row of patch.updates){
  const c=next.contacts.find(c=>c.id===row.id);
  if(seen.has(row.id))throw Error('Duplicate contact in update');seen.add(row.id);
  if(!c||c.archived||c.pastor!==row.expectedName||key(c.preferredPhone)!==key(row.expectedPreferred)||key(row.preferredPhone).length<7){skipped.push(row.id);continue;}
  if(key(c.preferredPhone)===key(row.preferredPhone))continue;
  c.preferredPhone=row.preferredPhone;c.preferredPhoneReviewedAt=patch.reviewedAt;updated.push(c.id);
 }
 return {next,updated,skipped};
}
