const text=value=>String(value??'').trim();
const normalized=value=>text(value).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/&/g,'and').replace(/\bbaptist\s+church\b/g,'baptist church').replace(/[^a-z0-9]+/g,' ').trim();
const emails=value=>[value].flat().flatMap(item=>text(item).split(/[\n;,/]+/)).map(item=>item.trim()).filter(item=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item));
const list=value=>Array.isArray(value)?value.filter(Boolean):text(value)?[value]:[];
const unique=values=>[...new Map(values.filter(Boolean).map(value=>[normalized(value),value])).values()];

function matchesSelector(contact,selector={}){
 if(selector.id&&contact.id!==selector.id)return false;
 if(selector.name&&normalized(contact.pastor)!==normalized(selector.name))return false;
 if(selector.church&&normalized(contact.church)!==normalized(selector.church))return false;
 if(selector.churchEmpty&&text(contact.church))return false;
 if(selector.email){const wanted=new Set(emails(selector.email).map(value=>value.toLowerCase()));if(![...emails(contact.email),...emails(contact.church_email)].some(value=>wanted.has(value.toLowerCase())))return false;}
 return Boolean(selector.id||selector.name||selector.church||selector.email);
}

function resolve(contacts,selector){
 const matches=contacts.filter(contact=>matchesSelector(contact,selector));
 return matches.length===1?{contact:matches[0]}:{matches};
}

function appendNote(current,note){
 const value=text(note);if(!value||text(current).includes(value))return text(current);
 return [text(current),value].filter(Boolean).join('\n');
}

function mergeContact(target,source,reason){
 for(const key of ['phone','cell','email','church_email','groups'])target[key]=unique([...list(target[key]),...list(source[key])]);
 for(const [key,value] of Object.entries(source)){
  if(['id','pastor','church','city','state','address','lat','lng','phone','cell','email','church_email','groups','notes'].includes(key))continue;
  if((target[key]===undefined||target[key]===null||target[key]===''||(Array.isArray(target[key])&&!target[key].length))&&value!==undefined&&value!==null&&value!=='')target[key]=structuredClone(value);
  else if(typeof value==='boolean'&&value)target[key]=true;
 }
 target.notes=appendNote(target.notes,source.notes);
 target.mergedContactRecords=[...(target.mergedContactRecords||[]),{id:source.id,pastor:source.pastor||'',church:source.church||'',mergedAt:new Date().toISOString(),reason}];
}

function replaceIds(value,mapping){
 if(Array.isArray(value))return value.map(item=>replaceIds(item,mapping));
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,replaceIds(item,mapping)]));
 return typeof value==='string'&&mapping.has(value)?mapping.get(value):value;
}

function issue(kind,label,selector,matches=[]){return {kind,label,selector,matches:matches.map(contact=>({id:contact.id,name:contact.pastor||'',church:contact.church||''}))};}

export function previewContactCleanup(state,update){
 if(state.mode==='demo'||update?.kind!=='relay-contact-cleanup'||update?.version!==1)throw Error('Load your real Relay account and a valid reviewed contact cleanup file.');
 const contacts=state.contacts||[],issues=[],resolved={groups:[],merges:[],updates:[],remove:[]};
 for(const row of update.groups||[]){const found=resolve(contacts,row.selector);if(!found.contact)issues.push(issue(found.matches.length?'ambiguous':'unmatched',row.label||row.selector.name,row.selector,found.matches));else resolved.groups.push({...row,contact:found.contact});}
 for(const row of update.merges||[]){
  const keep=resolve(contacts,row.keep),sources=[];
  if(!keep.contact){issues.push(issue(keep.matches.length?'ambiguous':'unmatched',`${row.label} · record to keep`,row.keep,keep.matches));continue;}
  for(const selector of row.remove||[]){const found=resolve(contacts,selector);if(found.contact&&found.contact.id!==keep.contact.id)sources.push(found.contact);else if(found.matches?.length>1)issues.push(issue('ambiguous',`${row.label} · duplicate to remove`,selector,found.matches));}
  resolved.merges.push({...row,target:keep.contact,sources});
 }
 for(const row of update.updates||[]){const found=resolve(contacts,row.selector);if(!found.contact)issues.push(issue(found.matches.length?'ambiguous':'unmatched',row.label||row.selector.name,row.selector,found.matches));else resolved.updates.push({...row,contact:found.contact});}
 for(const row of update.remove||[]){const found=resolve(contacts,row.selector);if(!found.contact){if(found.matches?.length>1)issues.push(issue('ambiguous',row.label||row.selector.name,row.selector,found.matches));}else resolved.remove.push({...row,contact:found.contact});}
 return {resolved,summary:{groups:resolved.groups.length,duplicateSets:resolved.merges.length,duplicateRecords:resolved.merges.reduce((count,row)=>count+row.sources.length,0),updates:resolved.updates.length,removals:resolved.remove.length,issues}};
}

export function applyContactCleanup(state,update){
 const preview=previewContactCleanup(state,update),next=structuredClone(state),byId=new Map(next.contacts.map(contact=>[contact.id,contact])),mapping=new Map();
 for(const row of preview.resolved.groups){const contact=byId.get(row.contact.id);contact.contactType=row.group==='Individual supporter'?'Individual donor':'Friends & family';contact.personalGroup=row.group;contact.wing='manifest';if(row.group==='Individual supporter'){contact.supportStatus='Supporting';contact.emailList=true;contact.individualSupportReviewed=true;contact.donorIdentityNeedsReview=false;}if(row.note)contact.notes=appendNote(contact.notes,row.note);}
 for(const row of preview.resolved.updates){const contact=byId.get(row.contact.id);Object.assign(contact,structuredClone(row.changes||{}));if(row.note)contact.notes=appendNote(contact.notes,row.note);}
 for(const row of preview.resolved.merges){const target=byId.get(row.target.id);for(const sourceRef of row.sources){const source=byId.get(sourceRef.id);if(!source||source.id===target.id)continue;mergeContact(target,source,row.label);mapping.set(source.id,target.id);byId.delete(source.id);}}
 let transformed=replaceIds(next,mapping);transformed.contacts=next.contacts.filter(contact=>!mapping.has(contact.id)).map(contact=>replaceIds(contact,mapping));
 for(const row of preview.resolved.remove){const contact=transformed.contacts.find(item=>item.id===row.contact.id);if(!contact)continue;if(row.moveTo){const found=resolve(transformed.contacts,row.moveTo);if(found.contact){for(const email of emails(contact.email))found.contact.email=unique([...list(found.contact.email),email]);for(const email of emails(contact.church_email))found.contact.church_email=unique([...list(found.contact.church_email),email]);found.contact.notes=appendNote(found.contact.notes,row.note);mapping.set(contact.id,found.contact.id);const remaining=transformed.contacts.filter(item=>item.id!==contact.id),single=new Map([[contact.id,found.contact.id]]);transformed=replaceIds(transformed,single);transformed.contacts=remaining.map(item=>replaceIds(item,single));}else preview.summary.issues.push(issue(found.matches.length?'ambiguous':'unmatched',`${row.label} · destination`,row.moveTo,found.matches));}else{if(row.preserveGiving){const donorLabel=text(contact.givingDonorLabel||contact.pastor||contact.church);for(const gift of transformed.gifts||[]){if(gift.contactId!==contact.id)continue;gift.contactId='';if(!text(gift.donor))gift.donor=donorLabel;if(!text(gift.church_name))gift.church_name=donorLabel;}}transformed.contacts=transformed.contacts.filter(item=>item.id!==contact.id);}}
 transformed.contactCleanup={kind:update.kind,source:update.source||'',appliedAt:new Date().toISOString(),mergedIds:Object.fromEntries(mapping),summary:{...preview.summary,issues:preview.summary.issues}};
 return {next:transformed,summary:transformed.contactCleanup.summary};
}
