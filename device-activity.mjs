const digits=value=>String(value||'').replace(/\D/g,'').slice(-10);
const numbers=contact=>[contact.phone,contact.cell].flat().flatMap(v=>String(v||'').split(/[\n;,]/)).map(digits).filter(Boolean);
export function importDeviceActivity(state,bundle){
 if(bundle?.kind!=='relay-device-activity'||!Array.isArray(bundle.records))throw Error('Choose a Relay call/text activity file.');
 const known=new Set((state.logs||[]).map(row=>row.deviceActivityId).filter(Boolean)),owners=new Map();
 for(const contact of state.contacts||[])for(const number of numbers(contact))owners.set(number,[...(owners.get(number)||[]),contact.id]);
 let added=0,unmatched=0,ambiguous=0;
 for(const row of bundle.records){
  if(!['call','text'].includes(row.kind)||!row.occurredAt||row.content||row.body||row.message)throw Error('The activity file is invalid or contains message content. Nothing was imported.');
  const activityId=String(row.id||`${row.kind}:${row.occurredAt}:${digits(row.phone)}:${row.direction||''}`);if(known.has(activityId))continue;
  const matches=[...new Set(owners.get(digits(row.phone))||[])];if(matches.length!==1){matches.length?ambiguous++:unmatched++;continue;}
  state.logs.push({id:crypto.randomUUID(),deviceActivityId:activityId,contactId:matches[0],type:row.kind,date:String(row.occurredAt).slice(0,10),time:String(row.occurredAt).slice(11,16),result:row.kind==='text'?(row.direction==='outgoing'?'sent':'received'):'conversation',details:row.kind==='text'?`Text ${row.direction==='outgoing'?'sent':'received'} · content not stored`:`${row.direction==='outgoing'?'Outgoing':'Incoming'} call · ${Number(row.durationSeconds)||0} seconds`,createdAt:new Date().toISOString(),metadataOnly:true});known.add(activityId);added++;
 }
 state.deviceActivityReview={importedAt:new Date().toISOString(),added,unmatched,ambiguous};return {state,added,unmatched,ambiguous};
}
