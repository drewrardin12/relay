export const MAILBOX='';
const address=v=>String(v||'').trim().toLowerCase();
const valid=v=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
export function contactEmails(c){return [c.email,c.church_email].flatMap(v=>Array.isArray(v)?v:String(v||'').split(/[\n;,]/)).map(address).filter(valid);}
export function importEmailHistory(state,bundle){
 const mailbox=state.emailHistory?.mailbox||MAILBOX||address(bundle.mailbox);
 if(!valid(mailbox)||address(bundle.mailbox)!==mailbox||!Array.isArray(bundle.messages))throw Error('Choose an email-history file for your saved mailbox.');
 const incoming=bundle.messages.map(m=>{if(!m.id||!/^\d{4}-\d{2}-\d{2}T/.test(m.date)||!Number.isFinite(Date.parse(m.date))||!valid(address(m.from))||!Array.isArray(m.to)||m.to.some(v=>!valid(address(v))))throw Error('Invalid email record; nothing imported.');return {id:String(m.id),date:m.date,from:address(m.from),to:m.to.map(address),subject:String(m.subject||'').slice(0,500)};});
 const next=structuredClone(state);next.emailHistory||={mailbox,messages:[],ignored:[]};
 const known=new Set(next.emailHistory.messages.map(m=>m.id));for(const m of incoming)if(!known.has(m.id)){next.emailHistory.messages.push(m);known.add(m.id);}
 reconcileEmails(next);return next;
}
export function reconcileEmails(state){
 const history=state.emailHistory;if(!history)return [];
 const MAILBOX=history.mailbox;
 const pending=new Map();
 for(const m of history.messages){const sent=m.from===MAILBOX;if(!sent&&!m.to.includes(MAILBOX))continue;
  for(const email of new Set(sent?m.to:[m.from])){if(email===MAILBOX||history.ignored?.includes(email))continue;
   const matches=state.contacts.filter(c=>contactEmails(c).includes(email));
   if(matches.length!==1){if(!pending.has(email))pending.set(email,{email,count:0,ambiguous:matches.length>1,subject:m.subject});pending.get(email).count++;continue;}
   const c=matches[0],id='gmail:'+m.id+':'+c.id;
   if(!state.logs.some(l=>l.id===id))state.logs.push({id,contactId:c.id,type:'email',result:sent?'sent':'received',date:m.date,details:m.subject||'(No subject)',source:'gmail',mailbox:MAILBOX,emailMessageId:m.id,emailAddress:email});
  }
 }
 history.pending=[...pending.values()];return history.pending;
}
export function assignEmail(state,email,id){
 email=address(email);const c=state.contacts.find(c=>c.id===id);if(!valid(email)||!c)throw Error('Choose a valid address and contact.');
 if(state.contacts.some(other=>other.id!==id&&contactEmails(other).includes(email)))throw Error('This address belongs to multiple contacts. Resolve the shared address before linking.');
 c.email=[...new Set([...contactEmails(c),email])];reconcileEmails(state);
}
export function ignoreEmails(state,values){
 if(!state.emailHistory)return;
 const pending=new Set(reconcileEmails(state).map(r=>r.email));
 const ignored=values.map(address).filter(v=>valid(v)&&pending.has(v));
 state.emailHistory.ignored=[...new Set([...(state.emailHistory.ignored||[]),...ignored])];
 reconcileEmails(state);
}
