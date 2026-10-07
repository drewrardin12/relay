import {isFriend} from './recipient-tools.mjs';
const digits=value=>String(value||'').replace(/\D/g,'').slice(-10);
const numbers=contact=>[contact.phone,contact.cell].flat().flatMap(v=>String(v||'').split(/[\n;,]/)).map(digits).filter(Boolean);
// Display-only grouping: the original activity records remain available in
// backups and synchronization. A window spans seven calendar days, not an
// indefinitely rolling chain of messages.
export function textTimeline(rows){
 const direction=row=>row.result==='sent'?'sent':row.result==='received'?'received':null;
 const eligible=row=>row.type==='text'&&row.deviceActivityId&&direction(row)&&/^\d{4}-\d{2}-\d{2}$/.test(row.date);
 const other=rows.filter(row=>!eligible(row)),groups=new Map();
 for(const row of rows.filter(eligible)){
  const key=row.contactId;
  if(!groups.has(key))groups.set(key,[]);
  groups.get(key).push(row);
 }
 const display=[];
 const flush=window=>{
  const sent=window.filter(row=>direction(row)==='sent').length,received=window.length-sent;
  if(sent&&received){
   const first=window[0],last=window.at(-1);
   display.push({...last,id:`text-conversation:${first.id}`,startDate:first.date,endDate:last.date,timelineLabel:'Text conversation',timelineIcon:'text-conversation',details:`${sent} sent · ${received} received`,textRecordIds:window.map(row=>row.id)});
  }else for(const row of window)display.push({...row,timelineLabel:`Text ${direction(row)}`,timelineIcon:`text-${direction(row)}`,details:''});
 };
 for(const list of groups.values()){
  list.sort((a,b)=>(a.date+'T'+(a.time||'00:00')).localeCompare(b.date+'T'+(b.time||'00:00')));
  let window=[];
  for(const row of list){
   if(window.length&&Date.parse(row.date)-Date.parse(window[0].date)>=7*86400000){flush(window);window=[];}
   window.push(row);
  }
  if(window.length)flush(window);
 }
 return [...other,...display];
}
export function importDeviceActivity(state,bundle){
 if(bundle?.kind!=='relay-device-activity'||!Array.isArray(bundle.records))throw Error('Choose a Relay call/text activity file.');
 const known=new Set((state.logs||[]).map(row=>row.deviceActivityId).filter(Boolean)),owners=new Map();
 for(const contact of state.contacts||[])for(const number of numbers(contact))owners.set(number,[...(owners.get(number)||[]),contact.id]);
 const friends=new Set((state.contacts||[]).filter(isFriend).map(c=>c.id));
 let added=0,unmatched=0,ambiguous=0,skippedFriends=0;
 for(const row of bundle.records){
  if(!['call','text'].includes(row.kind)||!row.occurredAt||row.content||row.body||row.message)throw Error('The activity file is invalid or contains message content. Nothing was imported.');
  const activityId=String(row.id||`${row.kind}:${row.occurredAt}:${digits(row.phone)}:${row.direction||''}`);if(known.has(activityId))continue;
  const matches=[...new Set(owners.get(digits(row.phone))||[])];if(matches.length!==1){matches.length?ambiguous++:unmatched++;continue;}
  if(friends.has(matches[0])){skippedFriends++;continue;}
  state.logs.push({id:crypto.randomUUID(),deviceActivityId:activityId,contactId:matches[0],type:row.kind,date:String(row.occurredAt).slice(0,10),time:String(row.occurredAt).slice(11,16),result:row.kind==='text'?(row.direction==='outgoing'?'sent':'received'):'conversation',details:row.kind==='text'?`Text ${row.direction==='outgoing'?'sent':'received'} · content not stored`:`${row.direction==='outgoing'?'Outgoing':'Incoming'} call · ${Number(row.durationSeconds)||0} seconds`,createdAt:new Date().toISOString(),metadataOnly:true});known.add(activityId);added++;
 }
 state.deviceActivityReview={importedAt:new Date().toISOString(),added,unmatched,ambiguous};return {state,added,unmatched,ambiguous};
}
