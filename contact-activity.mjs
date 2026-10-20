export function contactActivityIndex(logs){
 const index=new Map();
 for(const log of logs||[]){
  if(!log.contactId)continue;
  const item=index.get(log.contactId)||{calls:0,sentEmails:0};
  if(log.type==='call')item.calls++;
  if(log.type==='email'&&(log.result==='sent'||log.direction==='outgoing'))item.sentEmails++;
  index.set(log.contactId,item);
 }
 return index;
}
