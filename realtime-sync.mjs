const FIREBASE_CONFIG={
 apiKey:'AIzaSyBispQMEhaCln1tMDs0P2Crskc8AtAG5bk',
 authDomain:'relay-ministry.firebaseapp.com',
 projectId:'relay-ministry',
 storageBucket:'relay-ministry.firebasestorage.app',
 messagingSenderId:'865459453670',
 appId:'1:865459453670:web:a8c0abaae5043d21370527'
};
const RELAY_EMAIL=['rardins','abm'].join('.')+'@'+'gmail.com';
const ARRAY_KEYS=['contacts','logs','tides','meetings','events','gifts','calendarMeetings','calendarVacations','familyDates'];
const SDK='https://www.gstatic.com/firebasejs/11.10.0/';
let auth,db,api,ready,active=null,saveTimer=null,saveQueued=null;
const clone=value=>JSON.parse(JSON.stringify(value));
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const docId=id=>encodeURIComponent(String(id));
const recordId=(row,index)=>docId(row?.id??row?.eventId??row?.googleEventId??`${index}-${JSON.stringify(row).slice(0,80)}`);

async function sdk(){
 if(api)return api;
 const [appMod,authMod,firestoreMod]=await Promise.all([import(SDK+'firebase-app.js'),import(SDK+'firebase-auth.js'),import(SDK+'firebase-firestore.js')]);
 const app=appMod.initializeApp(FIREBASE_CONFIG);
 auth=authMod.initializeAuth(app,{persistence:[authMod.indexedDBLocalPersistence,authMod.browserLocalPersistence],popupRedirectResolver:authMod.browserPopupRedirectResolver});
 await authMod.setPersistence(auth,authMod.browserLocalPersistence);
 db=firestoreMod.initializeFirestore(app,{localCache:firestoreMod.persistentLocalCache({tabManager:firestoreMod.persistentMultipleTabManager()})});
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
export async function signOutRealtime(){const a=await sdk();active?.stop?.();active=null;await a.signOut(auth);}

const userRoot=uid=>api.doc(db,'users',uid);
const metaRef=uid=>api.doc(userRoot(uid),'meta','account');
const recordsRef=(uid,key)=>api.collection(userRoot(uid),key);
function localRecords(state,key){return new Map((state[key]||[]).map((row,index)=>[recordId(row,index),JSON.stringify(row)]));}
function cloudMeta(state){
 const data={};for(const [key,value] of Object.entries(state))if(!ARRAY_KEYS.includes(key)&&!['cloudSync','realtimeSync','recents','course','exportedAt'].includes(key))data[key]=value;
 return data;
}
async function loadCollection(uid,key){const snap=await api.getDocs(recordsRef(uid,key)),rows=[];snap.forEach(d=>{try{rows.push(JSON.parse(d.data().json));}catch{}});return rows;}
async function commitChunks(ops){for(let i=0;i<ops.length;i+=400){const batch=api.writeBatch(db);for(const op of ops.slice(i,i+400))op(batch);await batch.commit();}}

export async function openRealtimeAccount(localState,{onRemote}={}){
 const a=await sdk(),user=auth.currentUser;if(!user)return {status:'signed-out'};
 if(user.email?.toLowerCase()!==RELAY_EMAIL)throw Error('This Relay database belongs to the Rardin Ministries Google account.');
 active?.stop?.();
 const metaSnap=await a.getDoc(metaRef(user.uid));
 if(!metaSnap.exists())return {status:'needs-migration',email:user.email};
 const remote=clone(localState),meta=metaSnap.data();Object.assign(remote,JSON.parse(meta.json||'{}'));
 const loaded=await Promise.all(ARRAY_KEYS.map(key=>loadCollection(user.uid,key)));ARRAY_KEYS.forEach((key,i)=>{remote[key]=loaded[i];});
 remote.realtimeSync={email:user.email,connectedAt:new Date().toISOString()};
 const baseline={meta:meta.json||'{}',records:Object.fromEntries(ARRAY_KEYS.map(key=>[key,localRecords(remote,key)]))};
 let applying=false;
 const listeners=ARRAY_KEYS.map(key=>a.onSnapshot(recordsRef(user.uid,key),snap=>{
  if(applying||snap.metadata.hasPendingWrites)return;
  const rows=[];snap.forEach(d=>{try{rows.push(JSON.parse(d.data().json));}catch{}});
  baseline.records[key]=new Map(snap.docs.map(d=>[d.id,d.data().json]));
  onRemote?.({key,rows});
 }));
 listeners.push(a.onSnapshot(metaRef(user.uid),snap=>{if(!snap.exists()||snap.metadata.hasPendingWrites)return;baseline.meta=snap.data().json||'{}';onRemote?.({meta:JSON.parse(baseline.meta)});}));
 active={uid:user.uid,baseline,stop:()=>listeners.forEach(stop=>stop()),setApplying:value=>{applying=value;}};
 return {status:'loaded',state:remote,email:user.email};
}

export async function establishRealtimeAccount(state){
 const a=await sdk(),user=auth.currentUser;if(!user)throw Error('Sign in first.');
 if(user.email?.toLowerCase()!==RELAY_EMAIL)throw Error('Choose the Rardin Ministries Google account.');
 if((await a.getDoc(metaRef(user.uid))).exists())throw Error('The Relay account already contains data. Nothing was replaced.');
 const ops=[];
 for(const key of ARRAY_KEYS)for(const [id,json] of localRecords(state,key))ops.push(batch=>batch.set(a.doc(recordsRef(user.uid,key),id),{json,updatedAt:a.serverTimestamp()}));
 ops.push(batch=>batch.set(metaRef(user.uid),{json:JSON.stringify(cloudMeta(state)),createdAt:a.serverTimestamp(),updatedAt:a.serverTimestamp()}));
 await commitChunks(ops);return openRealtimeAccount(state);
}

export function scheduleRealtimeSave(state,onStatus,delay=350){
 if(!active)return;
 saveQueued=clone(state);clearTimeout(saveTimer);saveTimer=setTimeout(async()=>{
  const next=saveQueued;saveQueued=null;
  try{await saveRealtime(next);onStatus?.('saved');}catch(error){onStatus?.('error',error);}
 },delay);
}

export async function saveRealtime(state){
 if(!active||!auth.currentUser)return;
 const a=api,ops=[];active.setApplying(true);
 try{
  for(const key of ARRAY_KEYS){
   const current=localRecords(state,key),before=active.baseline.records[key]||new Map();
   for(const [id,json] of current)if(before.get(id)!==json)ops.push(batch=>batch.set(a.doc(recordsRef(active.uid,key),id),{json,updatedAt:a.serverTimestamp()}));
   for(const id of before.keys())if(!current.has(id))ops.push(batch=>batch.delete(a.doc(recordsRef(active.uid,key),id)));
   active.baseline.records[key]=current;
  }
  const meta=JSON.stringify(cloudMeta(state));if(meta!==active.baseline.meta){ops.push(batch=>batch.set(metaRef(active.uid),{json:meta,updatedAt:a.serverTimestamp()},{merge:true}));active.baseline.meta=meta;}
  await commitChunks(ops);
 }finally{active.setApplying(false);}
}
