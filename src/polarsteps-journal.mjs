const text=value=>String(value||'').trim().toLowerCase();
const choice=value=>['yes','no'].includes(value)?value:'unknown';
const clean=value=>String(value||'').trim();

function contactFor(state,entry){
 if(entry.contactId&&state.contacts.some(contact=>contact.id===entry.contactId))return entry.contactId;
 const matches=state.contacts.filter(contact=>(!entry.pastor||text(contact.pastor)===text(entry.pastor))&&(!entry.church||text(contact.church).includes(text(entry.church))));
 return matches.length===1?matches[0].id:'';
}

function mergeDebrief(current={},fields={},importedAt){
 const sermons=[...new Set([...(current.sermons||[]),...(Array.isArray(fields.sermons)?fields.sermons.map(clean).filter(Boolean):[])])];
 const incomingJournal=clean(fields.journal),journal=current.journal&&current.journal.includes(incomingJournal)?current.journal:[current.journal,incomingJournal].filter(Boolean).join('\n\n');
 return {...current,status:current.status||'completed',preached:current.preached&&current.preached!=='unknown'?current.preached:choice(fields.preached),sermons,handout:current.handout&&current.handout!=='unknown'?current.handout:choice(fields.handout),outreach:current.outreach||clean(fields.outreach),salvations:current.salvations??(Number.isFinite(Number(fields.salvations))?Math.max(0,Math.trunc(Number(fields.salvations))):null),biblesPassed:current.biblesPassed??(Number.isFinite(Number(fields.biblesPassed))?Math.max(0,Math.trunc(Number(fields.biblesPassed))):null),visitors:current.visitors&&current.visitors!=='unknown'?current.visitors:choice(fields.visitors),lodging:current.lodging&&current.lodging!=='unknown'?current.lodging:choice(fields.lodging),support:current.support&&current.support!=='unknown'?current.support:choice(fields.support),journal,photo:current.photo||'',polarstepsUpdated:true,completedAt:current.completedAt||importedAt,snoozedUntil:'',polarstepsImport:true};
}

export function importPolarstepsJournal(state,bundle,now=new Date().toISOString()){
 if(bundle?.kind!=='relay-polarsteps-journal-update'||bundle?.version!==1||!Array.isArray(bundle.entries))throw Error('Choose a Relay Polarsteps journal update file.');
 if(!Array.isArray(state.calendarMeetings))state.calendarMeetings=[];
 let added=0,updated=0,unmatched=0;
 for(const entry of bundle.entries){
  if(!entry||!clean(entry.id)||!/^\d{4}-\d{2}-\d{2}$/.test(entry.date)||!entry.fields||typeof entry.fields!=='object')throw Error('The Polarsteps journal update contains an invalid entry.');
  let meeting=state.calendarMeetings.find(row=>row.id===entry.id);
  const contactId=contactFor(state,entry);
  if(!meeting)meeting=state.calendarMeetings.find(row=>row.date===entry.date&&contactId&&row.contactId===contactId);
  if(!meeting){meeting={id:clean(entry.id),title:clean(entry.title)||'Polarsteps ministry visit',date:entry.date,end:entry.end||entry.date,contactId,kind:'meeting',source:'Polarsteps journal'};state.calendarMeetings.push(meeting);added++;}
  else updated++;
  if(!meeting.contactId&&contactId)meeting.contactId=contactId;
  if(!meeting.contactId)unmatched++;
  meeting.debrief=mergeDebrief(meeting.debrief,entry.fields,now);
 }
 state.polarstepsJournalImport={importedAt:now,added,updated,unmatched,count:bundle.entries.length};
 return {state,summary:state.polarstepsJournalImport};
}
