import {SYNC_KEYS,copy,stable,metadata,records,patched,createEngine,stage,view,acknowledge,acceptPage,applyChanges,since,mergePending} from './sync-engine.mjs?v=20261027-low-read';
import {readDeviceSync,writeDeviceSync,saveSheetsBackup} from './local-database.mjs?v=20261027-low-read';
import {preserveRelayCancellations} from './calendar-sync.mjs?v=20261027-cancellations';
const FIREBASE_CONFIG={
 apiKey:'AIzaSyBispQMEhaCln1tMDs0P2Crskc8AtAG5bk',
 authDomain:'relay-ministry.firebaseapp.com',
 projectId:'relay-ministry',
 storageBucket:'relay-ministry.firebasestorage.app',
 messagingSenderId:'865459453670',
 appId:'1:865459453670:web:a8c0abaae5043d21370527'
};
const RELAY_EMAIL=['rardins','abm'].join('.')+'@'+'gmail.com';

const SDK='https://www.gstatic.com/firebasejs/11.10.0/';
let auth,db,api,ready,active=null;


async function sdk(){
 if(api)return api;
 const [appMod,authMod,firestoreMod]=await Promise.all([import(SDK+'firebase-app.js'),import(SDK+'firebase-auth.js'),import(SDK+'firebase-firestore.js')]);
 const app=appMod.initializeApp(FIREBASE_CONFIG);
 auth=authMod.initializeAuth(app,{persistence:[authMod.indexedDBLocalPersistence,authMod.browserLocalPersistence],popupRedirectResolver:authMod.browserPopupRedirectResolver});
 await authMod.setPersistence(auth,authMod.browserLocalPersistence);
 // The durable queue above owns retries. Do not replay the older SDK’s whole-
 // record pending writes alongside the new field-level transaction queue.
 db=firestoreMod.initializeFirestore(app,{localCache:firestoreMod.memoryLocalCache()});
 api={...authMod,...firestoreMod};return api;
}

export async function prepareRealtimeSync(){
 if(ready)return ready;
 ready=(async()=>{
  const a=await sdk();
  const redirect=await a.getRedirectResult(auth).catch(()=>null);
  if(redirect?.user||auth.currentUser)return redirect?.user||auth.currentUser;
  return new Promise((resolve,reject)=>{
   let stop=()=>{};
   stop=a.onAuthStateChanged(auth,user=>{stop();resolve(user||null);},error=>{stop();reject(error);});
  });
 })();
 return ready;
}
export const realtimeUser=()=>auth?.currentUser||null;

export async function signInRealtime(){
 const a=await sdk(),provider=new a.GoogleAuthProvider();provider.setCustomParameters({login_hint:RELAY_EMAIL,prompt:'select_account'});
 const standalone=window.matchMedia?.('(display-mode: standalone)')?.matches||navigator.standalone===true;
 if(standalone){await a.signInWithRedirect(auth,provider);return null;}
 let result;try{result=await a.signInWithPopup(auth,provider);}catch(error){
  if(['auth/popup-blocked','auth/operation-not-supported-in-this-environment'].includes(error?.code)){await a.signInWithRedirect(auth,provider);return null;}
  throw error;
 }
 if(result.user.email?.toLowerCase()!==RELAY_EMAIL){await a.signOut(auth);throw Error('Choose the Rardin Ministries Google account.');}
 return result.user;
}
export async function signInRealtimePassword(password){
 const a=await sdk();
 if(!password||password.length<6)throw Error('Enter your Relay password.');
 const result=await a.signInWithEmailAndPassword(auth,RELAY_EMAIL,password);
 return result.user;
}
export async function sendRealtimePasswordReset(){
 const a=await sdk();
 await a.sendPasswordResetEmail(auth,RELAY_EMAIL);
}
export async function signOutRealtime(){const a=await sdk();active?.stop?.();active=null;await a.signOut(auth);}

const userRoot=uid=>api.doc(db,'users',uid);
const metaRef=uid=>api.doc(userRoot(uid),'meta','account');
const recordsRef=(uid,key)=>api.collection(userRoot(uid),key);
let cloudFetch=(...args)=>fetch(...args);
let syncStorage={read:readDeviceSync,write:writeDeviceSync};
const root=uid=>'https://firestore.googleapis.com/v1/projects/relay-ministry/databases/(default)/documents/users/'+uid;
async function requestCloud(account,path,{body,method=body?'POST':'GET'}={}){
 const token=await account.user.getIdToken();account.stats.requests++;
 const response=await cloudFetch(root(account.uid)+path,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(20000)});
 const data=await response.json();if(!response.ok){const error=Error(data.error?.message||'Relay account sync is unavailable.');error.status=response.status;throw error;}return data;
}
async function readChanges(account,key,full){
 const cursor=full?null:since(account.engine.checkpoint.cursors[key]),entries=[];let startAt,readTime;
 do{
  const structuredQuery={from:[{collectionId:key}],orderBy:cursor?[{field:{fieldPath:'updatedAt'},direction:'ASCENDING'},{field:{fieldPath:'__name__'},direction:'ASCENDING'}]:[{field:{fieldPath:'__name__'},direction:'ASCENDING'}],limit:400};
  if(cursor)structuredQuery.where={fieldFilter:{field:{fieldPath:'updatedAt'},op:'GREATER_THAN_OR_EQUAL',value:{timestampValue:cursor}}};
  if(startAt)structuredQuery.startAt=startAt;
  const page=await requestCloud(account,':runQuery',{body:{structuredQuery}}),docs=page.filter(item=>item.document).map(item=>item.document);
  readTime||=page.find(item=>item.readTime)?.readTime;if(!readTime)throw Error('The server did not confirm the sync checkpoint.');
  for(const doc of docs){const json=doc.fields?.json?.stringValue;if(!json)throw Error('An account record has an unfamiliar format.');const row=JSON.parse(json);if(!row||typeof row!=='object')throw Error('An account record is invalid.');entries.push({id:doc.name.split('/').at(-1),json,deleted:doc.fields.deleted?.booleanValue||!!row._deleted});}
  account.stats.documentsReceived+=docs.length;
  if(docs.length<400)break;
  const last=docs.at(-1);startAt={before:false,values:[...(cursor?[last.fields.updatedAt]:[]),{referenceValue:last.name}]};
 }while(true);
 return {entries,readTime};
}
async function persistCheckpoint(account,queueOnly=false){
 const collections=queueOnly?[]:[...account.dirty];if(!queueOnly)account.dirty.clear();
 try{await syncStorage.write(account.uid,account.engine.checkpoint,{collections,queueOnly});}catch(error){collections.forEach(key=>account.dirty.add(key));throw error;}
}
async function networkTurn(account,work){
 const run=async()=>{
  if(active!==account)return;
  const saved=await syncStorage.read(account.uid);
  if(saved){
   const local=account.engine.checkpoint,acknowledged={...(saved.acknowledged||{}),...(local.acknowledged||{})};saved.outbox=mergePending(saved.outbox,local.outbox,acknowledged);saved.acknowledged=acknowledged;
   const pending=(checkpoint,key)=>Object.values(checkpoint.outbox||{}).filter(intent=>intent.key===key),changed=SYNC_KEYS.filter(key=>stable(saved.collections[key])!==stable(local.collections[key])||stable(pending(saved,key))!==stable(pending(local,key))),metaChanged=saved.meta!==local.meta||stable(pending(saved,'meta'))!==stable(pending(local,'meta'));
   account.engine.checkpoint=createEngine(account.uid,account.engine.presented,saved).checkpoint;
   // Another tab may already have fetched the delta. Publish its shared mirror
   // even when the subsequent server query has no further changes.
   await publishView(account,changed,metaChanged);
  }
  return work();
 };
 const guarded=()=>globalThis.navigator?.locks?globalThis.navigator.locks.request('relay-cloud-sync:'+account.uid,run):run();
 const result=(account.network||Promise.resolve()).then(guarded,guarded);account.network=result.catch(()=>{});return result;
}
export function acceptRealtimeState(state){if(active)active.engine.presented=copy(state);}
export function realtimeRecovery(){return copy(active?.engine.checkpoint.outbox||{});}
function pendingCount(account){return Object.keys(account.engine.checkpoint.outbox).length;}
async function report(account,error){
 if(active!==account)return;
 const pending=pendingCount(account),blocked=Object.values(account.engine.checkpoint.outbox).filter(intent=>intent.blocked).length;
 const text=error?(error.status===429?'Cloud quota reached; your saved copy and queued edits are safe.':'Using your saved copy; account sync will retry.'):(blocked?`${blocked} unsent edits need review; saved on this device.`:`Changes-only sync${pending?`; ${pending} edits waiting`:''}. ${account.stats.documentsReceived} records received this session.`);
 await account.onRemote?.({syncStatus:{text,pending,blocked,documentsReceived:account.stats.documentsReceived,requests:account.stats.requests}});
}
async function publishView(account,changed,metaChanged=false){
 if(active!==account)return;
 const next=view(account.engine);
 for(const key of changed){account.engine.presented[key]=copy(next[key]);await account.onRemote?.({key,rows:next[key]});}
 if(metaChanged){const meta=metadata(next);for(const key of Object.keys(metadata(account.engine.presented)))delete account.engine.presented[key];Object.assign(account.engine.presented,meta);await account.onRemote?.({meta});}
}
function syncRound(account,options){return networkTurn(account,()=>pullChanges(account,options));}
async function pullChanges(account,{audit=false}={}){
 if(active!==account||account.polling||Date.now()<account.retryAt)return;
 account.polling=true;const changed=new Set();let metaChanged=false;
 try{
  const doc=await requestCloud(account,'/meta/account'),json=doc.fields?.json?.stringValue;if(!json)throw Error('Relay account metadata is missing.');
  JSON.parse(json);metaChanged=stable(JSON.parse(account.engine.checkpoint.meta||'{}'))!==stable(JSON.parse(json));account.engine.checkpoint.meta=json;
  // Persist each completed collection. A failed first bootstrap resumes at the
  // unfinished collection, instead of rereading the directory on the next attempt.
  for(const key of SYNC_KEYS){
   const full=!account.engine.checkpoint.cursors[key],page=await readChanges(account,key,full);
   if(acceptPage(account.engine,key,page,{full})){account.dirty.add(key);changed.add(key);}
   if(audit&&!full){
    // Cheap count audit detects physical deletes made by older app versions.
    const result=await requestCloud(account,':runAggregationQuery',{body:{structuredAggregationQuery:{structuredQuery:{from:[{collectionId:key}]},aggregations:[{alias:'total',count:{}}]}}});
    const count=Number(result.find(item=>item.result)?.result?.aggregateFields?.total?.integerValue);
    if(Number.isFinite(count)&&count!==Object.keys(account.engine.checkpoint.collections[key]).length){const repair=await readChanges(account,key,true);if(acceptPage(account.engine,key,repair,{full:true})){account.dirty.add(key);changed.add(key);}}
   }
   await persistCheckpoint(account);
  }
  const integrations=await requestCloud(account,'/integrations?pageSize=50');
  const data={};for(const item of integrations.documents||[])if(item.fields?.json)data[decodeURIComponent(item.name.split('/').at(-1))]=JSON.parse(item.fields.json.stringValue);
  const signature=stable(data);if(signature!==account.integrationSignature){account.integrationSignature=signature;await account.onRemote?.({integrations:data});}
  account.ready=true;account.retryAt=0;
 }catch(error){
  account.retryAt=Date.now()+(error.status===429?900000:60000);account.lastError=error;
  if(error.status===404&&!account.ready&&!Object.keys(account.engine.checkpoint.cursors).length)account.needsMigration=true;
 }finally{
  await publishView(account,changed,metaChanged);await persistCheckpoint(account);account.polling=false;await report(account,account.lastError);
 }
 if(!account.lastError&&pendingCount(account))account.saveTimer=setTimeout(()=>{void drain(account).catch(error=>report(account,error));},0);
}
export async function openRealtimeAccount(localState,{onRemote}={}){
 const a=await sdk(),user=auth.currentUser;if(!user)return {status:'signed-out'};
 if(user.email?.toLowerCase()!==RELAY_EMAIL)throw Error('This Relay account belongs to the Rardin Ministries Google account.');
 active?.stop?.();const saved=await syncStorage.read(user.uid);
 if(!saved&&typeof indexedDB!=='undefined'&&localState.contacts?.length)await saveSheetsBackup({reason:'Before changes-only sync migration',workingCopy:copy(localState)});
 const account={uid:user.uid,user,onRemote,engine:createEngine(user.uid,localState,saved),dirty:new Set(saved?[]:SYNC_KEYS),stats:{documentsReceived:0,requests:0},retryAt:0,ready:!!saved,polling:false,draining:false,lastError:null};
 const wake=()=>{if(typeof document==='undefined'||!document.hidden){account.lastError=null;void syncRound(account).catch(error=>report(account,error));}};
 account.stop=()=>{clearInterval(account.interval);clearTimeout(account.saveTimer);globalThis.removeEventListener?.('online',wake);globalThis.document?.removeEventListener('visibilitychange',wake);};
 active=account;
 const localBeforeHydration=copy(localState);
 // Reconstruct from this device's cloud mirror and pending edits before network I/O.
 const cached=view(account.engine,localState);account.engine.presented=copy(cached);if(preserveRelayCancellations(cached,localBeforeHydration)){stage(account.engine,cached);await persistCheckpoint(account,true);}
 await syncRound(account,{audit:!!saved});
 if(account.needsMigration){account.stop();active=null;return {status:'needs-migration',email:user.email};}
 const state=view(account.engine,account.engine.presented),cancellationsPending=preserveRelayCancellations(state,localBeforeHydration);
 if(cancellationsPending){stage(account.engine,state);await persistCheckpoint(account,true);}else account.engine.presented=copy(state);
 account.interval=setInterval(wake,60000);globalThis.addEventListener?.('online',wake);globalThis.document?.addEventListener('visibilitychange',wake);
 return {status:'loaded',state,email:user.email,cancellationsPending};
}
async function commitChunks(ops){for(let i=0;i<ops.length;i+=400){const batch=api.writeBatch(db);for(const op of ops.slice(i,i+400))op(batch);await batch.commit();}}
export async function establishRealtimeAccount(state){
 const a=await sdk(),user=auth.currentUser;if(!user)throw Error('Sign in first.');
 if(user.email?.toLowerCase()!==RELAY_EMAIL)throw Error('Choose the Rardin Ministries Google account.');
 if((await a.getDoc(metaRef(user.uid))).exists())throw Error('The Relay account already contains data. Nothing was replaced.');
 const ops=[];
 for(const key of SYNC_KEYS)for(const [id,entry] of Object.entries(records(state[key])))ops.push(batch=>batch.set(a.doc(recordsRef(user.uid,key),id),{json:entry.json,updatedAt:a.serverTimestamp()}));
 ops.push(batch=>batch.set(metaRef(user.uid),{json:JSON.stringify(metadata(state)),createdAt:a.serverTimestamp(),updatedAt:a.serverTimestamp()}));
 await commitChunks(ops);return openRealtimeAccount(state);
}
export function scheduleRealtimeSave(state,onStatus,delay=350){
 const account=active;if(!account)return Promise.resolve();
 stage(account.engine,copy(state));
 return persistCheckpoint(account,true).then(()=>{clearTimeout(account.saveTimer);account.saveTimer=setTimeout(()=>{void drain(account).then(()=>onStatus?.(pendingCount(account)?'pending':'saved')).catch(error=>onStatus?.('error',error));},delay);});
}
export function saveRealtime(state){
 const account=active;if(!account)return Promise.resolve();stage(account.engine,copy(state));
 return persistCheckpoint(account,true).then(()=>drain(account));
}
function drain(account){return networkTurn(account,()=>pushEdits(account));}
async function pushEdits(account){
 if(active!==account||account.draining||Date.now()<account.retryAt)return;
 account.draining=true;const changed=new Set();let metaChanged=false;
 try{
  const intents=Object.values(account.engine.checkpoint.outbox).filter(intent=>!intent.blocked).slice(0,100);
  for(const saved of intents){
   const intent=copy(saved),ref=intent.key==='meta'?metaRef(account.uid):api.doc(recordsRef(account.uid,intent.key),intent.id);
   const next=await api.runTransaction(db,async tx=>{
    const snap=await tx.get(ref),data=snap.exists()?snap.data():null,current=data?.json?JSON.parse(data.json):null;
    let result;
    try{result=intent.key==='meta'?{value:intent.changes.reduce((value,change)=>patched(value,change.patch),current||{}),deleted:false}:applyChanges(current,!!data?.deleted||!!current?._deleted,intent);}
    catch(error){if(error.code!=='sync/deleted')throw error;return {conflict:error.message,value:current||{id:intent.changes[0].draft?.id,_deleted:true},deleted:true};}
    tx.set(ref,{json:JSON.stringify(result.value),...(intent.key==='meta'?{}:{deleted:result.deleted}),updatedAt:api.serverTimestamp()},{merge:true});return result;
   });
   if(next.conflict){const pending=account.engine.checkpoint.outbox[intent.key+'/'+intent.id];if(pending)pending.blocked=next.conflict;account.engine.checkpoint.collections[intent.key][intent.id]={json:JSON.stringify(next.value),deleted:true};}
   else acknowledge(account.engine,intent,next);
   if(intent.key==='meta')metaChanged=true;else {account.dirty.add(intent.key);changed.add(intent.key);}await persistCheckpoint(account);
  }
 }catch(error){account.lastError=error;account.retryAt=Date.now()+(error.status===429||error.code==='resource-exhausted'?900000:60000);throw error;}
 finally{account.draining=false;await publishView(account,changed,metaChanged);await persistCheckpoint(account);await report(account,account.lastError);}
 if(Object.values(account.engine.checkpoint.outbox).some(intent=>!intent.blocked))account.saveTimer=setTimeout(()=>{void drain(account).catch(error=>report(account,error));},2000);
}
