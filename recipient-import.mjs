export function applyRecipientUpdate(state,update){
 if(state.mode==='demo'||update.kind!=='relay-recipient-update'||!Array.isArray(update.sent)||!Array.isArray(update.contacts))throw Error('Load your real working copy and a valid recipient update.');
 const next=structuredClone(state),sent=new Set(update.sent.map(v=>v.toLowerCase()));let added=0,marked=0;
 const values=v=>(Array.isArray(v)?v.join(' '):String(v||'')).match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)||[];
 for(const item of update.contacts){
  let matches=next.contacts.filter(c=>c.id===item.id);
  if(!matches.length)matches=next.contacts.filter(c=>c.pastor===item.name&&(!item.church||c.church===item.church));
  if(matches.length>1)throw Error('Ambiguous recipient identity: '+item.name);
  let c=matches[0];
  if(!c){if(!item.create)throw Error('Missing recipient: '+item.name);c={id:item.id,pastor:item.name,church:item.church||'',city:item.city||'',state:item.state||'',wing:'voyage',phone:[],email:[],groups:[],supportStatus:'Non-supporting'};next.contacts.push(c);added++;}
  const remove=new Set(item.remove||[]);for(const key of ['email','church_email'])c[key]=values(c[key]).filter(v=>!remove.has(v.toLowerCase()));
  c.email=[...new Set([...c.email,...(item.emails||[])])];c.emailList=true;
  if(['Pastor / church','Personal contact'].includes(item.contactType))c.contactType=item.contactType;
  if(item.friend)c.contactType='Friends & family';
  if(item.needsLetter){c.notes=String(c.notes||'');const note='Needs the ministry letter sent to the original 113 recipients; added afterward.';if(!c.notes.includes(note))c.notes+='\n'+note;}
 }
 for(const c of next.contacts){if([...values(c.email),...values(c.church_email)].some(v=>sent.has(v.toLowerCase()))){c.emailList=true;marked++;}}
 next.recipientUpdate={appliedAt:new Date().toISOString(),added,marked};return next;
}
