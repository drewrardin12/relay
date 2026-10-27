// Per-device cloud mirror and durable, field-level local edits. No network or UI.
export const SYNC_KEYS=['contacts','logs','tides','meetings','events','gifts','calendarMeetings','calendarVacations','familyDates'];
export const copy=value=>JSON.parse(JSON.stringify(value));
export const recordId=(row,index)=>encodeURIComponent(String(row?.id??row?.eventId??row?.googleEventId??`${index}-${JSON.stringify(row).slice(0,80)}`));
const plain=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
export function stable(value){return JSON.stringify(value,(_key,v)=>plain(v)?Object.fromEntries(Object.keys(v).sort().map(key=>[key,v[key]])):v);}
export function metadata(state){return Object.fromEntries(Object.entries(state).filter(([key])=>!SYNC_KEYS.includes(key)&&!['cloudSync','realtimeSync','recents','course','exportedAt','syncRecovery'].includes(key)));}
export function records(rows=[]){return Object.fromEntries(rows.map((row,i)=>[recordId(row,i),{json:JSON.stringify(row),deleted:!!row._deleted}]));}
export function diff(before={},after={},path=[]){
 const changes=[];
 for(const key of new Set([...Object.keys(before),...Object.keys(after)])){
  if(['__proto__','prototype','constructor'].includes(key))continue;
  const next=[...path,key];
  if(!(key in after))changes.push({path:next,remove:true});
  else if(plain(before[key])&&plain(after[key]))changes.push(...diff(before[key],after[key],next));
  else if(stable(before[key])!==stable(after[key]))changes.push({path:next,value:copy(after[key])});
 }
 return changes;
}
export function patched(value,patch){
 const result=copy(value||{});
 for(const op of patch){let parent=result;for(const key of op.path.slice(0,-1)){if(!plain(parent[key]))parent[key]={};parent=parent[key];}const key=op.path.at(-1);if(op.remove)delete parent[key];else parent[key]=copy(op.value);}
 return result;
}
export function createEngine(uid,state,saved){
 const checkpoint=saved?.version===2&&saved.uid===uid?saved:{version:2,uid,collections:Object.fromEntries(SYNC_KEYS.map(key=>[key,records(state[key])])),cursors:{},meta:JSON.stringify(metadata(state)),outbox:{}};
 const next=copy(checkpoint);next.acknowledged||={};
 for(const key of SYNC_KEYS)if(!next.cursors[key]&&!Object.keys(next.collections[key]||{}).length)next.collections[key]=records(state[key]);
 return {checkpoint:next,presented:copy(state)};
}
export function mergePending(stored={},incoming={},acknowledged={}){
 const result={};
 for(const slot of new Set([...Object.keys(stored),...Object.keys(incoming)])){
  const a=stored[slot],b=incoming[slot],seen=new Set(),changes=[];
  for(const change of [...(a?.changes||[]),...(b?.changes||[])])if(!acknowledged[change.revision]&&!seen.has(change.revision)){seen.add(change.revision);changes.push(copy(change));}
  if(changes.length)result[slot]={...(a||b),...(b||{}),changes};
 }
 return result;
}
export function stage(engine,state){
 const outbox=engine.checkpoint.outbox;let added=0;
 const add=(key,id,change)=>{const slot=key+'/'+id;const intent=outbox[slot]||{key,id,changes:[]};intent.changes.push({...change,revision:crypto.randomUUID()});delete intent.blocked;outbox[slot]=intent;added++;};
 for(const key of SYNC_KEYS){
  const before=records(engine.presented[key]),after=records(state[key]);
  for(const [id,entry] of Object.entries(after)){
   const old=before[id]?JSON.parse(before[id].json):{},row=JSON.parse(entry.json),patch=diff(old,row);
   if(patch.length)add(key,id,{patch,create:!before[id],draft:row});
  }
  for(const [id,entry] of Object.entries(before))if(!after[id])add(key,id,{delete:true,draft:JSON.parse(entry.json)});
 }
 const patch=diff(metadata(engine.presented),metadata(state));if(patch.length)add('meta','account',{patch});
 engine.presented=copy(state);return added;
}
export function applyChanges(current,deleted,intent){
 let value=current?copy(current):null,isDeleted=deleted;
 for(const change of intent.changes){
  if(change.delete){value={id:value?.id||change.draft?.id,...(value?.googleEventId?{googleEventId:value.googleEventId,calendarId:value.calendarId}:{}),_deleted:true,archived:true};isDeleted=true;continue;}
  if(isDeleted||(!value&&!change.create)){const error=Error('This record was removed on another device. Your unsent edit is retained for review.');error.code='sync/deleted';throw error;}
  value=patched(value,change.patch);isDeleted=false;
 }
 return {value,deleted:isDeleted};
}
export function view(engine,base=engine.presented){
 const state=copy(base),checkpoint=engine.checkpoint;
 for(const key of SYNC_KEYS){
  const entries=copy(checkpoint.collections[key]||{});
  for(const intent of Object.values(checkpoint.outbox).filter(op=>op.key===key)){
   try{const entry=entries[intent.id],next=applyChanges(entry?JSON.parse(entry.json):null,!!entry?.deleted,intent);entries[intent.id]={json:JSON.stringify(next.value),deleted:next.deleted};delete intent.blocked;}
   catch(error){intent.blocked=error.message;}
  }
  state[key]=Object.values(entries).filter(entry=>!entry.deleted).map(entry=>JSON.parse(entry.json));
 }
 let meta=JSON.parse(checkpoint.meta||'{}');
 for(const intent of Object.values(checkpoint.outbox).filter(op=>op.key==='meta'))for(const change of intent.changes)meta=patched(meta,change.patch);
 // Missing metadata keys must also disappear, without touching device-only UI state.
 for(const key of Object.keys(metadata(state)))delete state[key];
 Object.assign(state,meta);return state;
}
export function acknowledge(engine,intent,next){
 const checkpoint=engine.checkpoint,slot=intent.key+'/'+intent.id,done=new Set(intent.changes.map(change=>change.revision));
 checkpoint.acknowledged||={};for(const revision of done)checkpoint.acknowledged[revision]=true;
 if(intent.key==='meta')checkpoint.meta=JSON.stringify(next.value);
 else (checkpoint.collections[intent.key]||={})[intent.id]={json:JSON.stringify(next.value),deleted:next.deleted};
 const pending=checkpoint.outbox[slot];if(pending){pending.changes=pending.changes.filter(change=>!done.has(change.revision));if(!pending.changes.length)delete checkpoint.outbox[slot];}
}
export function acceptPage(engine,key,page,{full=false}={}){
 const before=engine.checkpoint.collections[key]||{},next=full?{}:{...before};
 for(const entry of page.entries)next[entry.id]={json:entry.json,deleted:!!entry.deleted};
 const changed=stable(before)!==stable(next);engine.checkpoint.collections[key]=next;engine.checkpoint.cursors[key]=page.readTime;return changed;
}
export function since(cursor){return cursor?new Date(Date.parse(cursor)-300000).toISOString():null;}
