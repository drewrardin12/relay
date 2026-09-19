import {CLIENT_ID,prepareSheetsSignIn} from './sheets-connection.mjs';
export const DRIVE_SCOPE='https://www.googleapis.com/auth/drive.appdata';
let client,token='',expires=0,pending;
const hosted=()=>Boolean(window.google?.script?.run);
export const privateHostActive=hosted;
const hostCall=(action,payload)=>new Promise((resolve,reject)=>window.google.script.run.withSuccessHandler(value=>{try{resolve(typeof value==='string'?JSON.parse(value):value);}catch{reject(Error('The private host returned an invalid response.'));}}).withFailureHandler(()=>reject(Error('The private host could not complete this request. Nothing was overwritten.'))).relayCloud(action,JSON.stringify(payload||{})));
export async function prepareDriveSignIn(){
 if(hosted())return;
 await prepareSheetsSignIn();
 if(!client)client=window.google.accounts.oauth2.initTokenClient({client_id:CLIENT_ID,scope:DRIVE_SCOPE,include_granted_scopes:false,
  callback:r=>{const p=pending;pending=null;if(!p)return;if(r.error||!r.access_token||!window.google.accounts.oauth2.hasGrantedAllScopes(r,DRIVE_SCOPE)){p.reject(Error('Drive access was not approved. Nothing uploaded.'));return;}token=r.access_token;expires=Date.now()+Number(r.expires_in||3600)*1000-60000;p.resolve();},
  error_callback:error=>{pending?.reject(Error(error?.type==='popup_failed_to_open'?'Google sign-in could not open. Allow pop-ups or use Safari directly.':error?.type==='popup_closed'?'Google sign-in closed before approval returned to Relay. Nothing uploaded.':'Google sign-in did not return approval to Relay. Nothing uploaded.'));pending=null;}});
}
export function driveAuthorized(){return hosted()||Boolean(token&&Date.now()<expires);}
export function disconnectDrive(){token='';expires=0;}
export function authorizeDrive(){if(hosted())return Promise.resolve();if(!client)return Promise.reject(Error('Google sign-in is loading. Try again shortly.'));if(pending)return Promise.reject(Error('Finish the open Google sign-in first.'));return new Promise((resolve,reject)=>{pending={resolve,reject};client.requestAccessToken({scope:DRIVE_SCOPE,prompt:'select_account'});});}
function canonical(value){if(Array.isArray(value))return value.map(canonical);if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])]));return value;}
export function syncPayload(state){const {cloudSync,exportedAt,recents,course,...data}=state;return canonical(data);}
export async function payloadHash(state){const bytes=new TextEncoder().encode(JSON.stringify(syncPayload(state)));return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(b=>b.toString(16).padStart(2,'0')).join('');}
export function revisionHead(files){
 const ids=new Set(files.map(f=>f.id));
 if(ids.size!==files.length)throw Error('Cloud revision IDs are repeated. Sync stopped.');
 const parents=new Set();
 for(const f of files){const p=f.appProperties?.parent;if(p&&p!=='root'){if(!ids.has(p))throw Error('Cloud revision history is incomplete. Sync stopped.');parents.add(p);}}
 const heads=files.filter(f=>!parents.has(f.id));
 if(heads.length>1)throw Error('Conflicting device revisions found. Both copies are preserved in Drive. Export your local backup; no automatic merge was made.');
 if(files.length&&!heads.length)throw Error('Cloud revision history is invalid. Sync stopped.');
 return heads[0]||null;
}
export function syncDecision(localHash,remoteHash,binding,remoteId){
 if(localHash===remoteHash)return 'same';
 if(!remoteId){if(binding?.revision)throw Error('Previously saved cloud data is missing. Sync stopped.');return 'push';}
 if(!binding?.revision)throw Error('This device has not loaded the cloud copy. Use Load cloud copy after exporting your local backup.');
 const dirty=localHash!==binding.hash,remoteChanged=remoteId!==binding.revision;
 if(dirty&&remoteChanged)throw Error('Both this device and another device changed. No copy was overwritten. Export this device before resolving the conflict.');
 return dirty?'push':'pull';
}
async function api(path,options={}){
 if(!driveAuthorized())throw Error('Connect private Google Drive first.');
 const response=await fetch('https://www.googleapis.com/'+path,{...options,headers:{Authorization:'Bearer '+token,...options.headers},cache:'no-store'});
 if(!response.ok){if(response.status===403)throw Error('Drive access is blocked. Enable Google Drive API in the Relay Cloud project and approve the app-data permission.');throw Error('Google Drive did not confirm this request. Reconnect and check before retrying.');}
 return response.json();
}
export const driveTransport={
 async account(){if(hosted())return hostCall('account');const data=await api('drive/v3/about?fields=user(emailAddress,permissionId)');if(!data.user?.permissionId||!data.user.emailAddress)throw Error('Could not verify the Google account.');return data.user;},
 async list(){if(hosted())return hostCall('list');let files=[],pageToken;do{const q=new URLSearchParams({spaces:'appDataFolder',q:"trashed = false and appProperties has { key='relaySync' and value='v1' }",fields:'nextPageToken,files(id,appProperties)',pageSize:'1000',...(pageToken?{pageToken}:{})});const data=await api('drive/v3/files?'+q);files.push(...(data.files||[]));pageToken=data.nextPageToken;}while(pageToken);return files;},
 read(id){return hosted()?hostCall('read',{id}):api('drive/v3/files/'+encodeURIComponent(id)+'?alt=media');},
 async append(envelope,parent,hash){const boundary='relay_'+crypto.randomUUID(),metadata={name:'relay-revision-'+crypto.randomUUID()+'.json',parents:['appDataFolder'],mimeType:'application/json',appProperties:{relaySync:'v1',parent:parent||'root',hash}};
  if(hosted())return hostCall('append',{envelope,parent,hash});
  const body=`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(envelope)}\r\n--${boundary}--`;
  return api('upload/drive/v3/files?uploadType=multipart&fields=id,appProperties',{method:'POST',headers:{'Content-Type':'multipart/related; boundary='+boundary},body});
 }
};
async function validatedCloud(transport,head){if(!head)return null;const envelope=await transport.read(head.id);if(envelope.kind!=='relay-private-sync'||envelope.version!==1||!envelope.data)throw Error('Unfamiliar cloud copy. Sync stopped.');const hash=await payloadHash(envelope.data);if(hash!==head.appProperties?.hash||hash!==envelope.hash)throw Error('Cloud copy verification failed. Nothing restored.');return envelope;}
export async function syncWorkingCopy(state,{transport=driveTransport,backup,validate,load=false,expectedEmail}={}){
 if(typeof backup!=='function'||typeof validate!=='function')throw Error('Sync requires a local backup and backup validator.');
 const account=await transport.account();
 if(expectedEmail&&account.emailAddress.toLowerCase()!==expectedEmail.toLowerCase())throw Error('Wrong Google account. Disconnect and choose '+expectedEmail+'.');
 const binding=state.cloudSync;
 if(binding?.account&&binding.account!==account.permissionId)throw Error('This copy is linked to a different Google account. No upload made.');
 const head=revisionHead(await transport.list()),cloud=await validatedCloud(transport,head),localHash=await payloadHash(state);
 const decision=load?(head?'pull':null):syncDecision(localHash,cloud?.hash,binding,head?.id);
 if(!decision)throw Error('No cloud copy exists yet. Save the complete laptop copy first.');
 if(decision==='pull'){
  const next=validate(JSON.stringify(cloud.data));next.recents=[];next.course=null;
  await backup({workingCopy:state,reason:'before loading private Drive copy'});
  next.cloudSync={account:account.permissionId,email:account.emailAddress,revision:head.id,hash:cloud.hash,checkedAt:new Date().toISOString()};return {next,status:'loaded'};
 }
 if(decision==='same')return {next:{...state,cloudSync:{account:account.permissionId,email:account.emailAddress,revision:head.id,hash:localHash,checkedAt:new Date().toISOString()}},status:'up-to-date'};
 if(!state.contacts?.length||!Array.isArray(state.calendarMeetings))throw Error('Import your complete newest backup before the first cloud save. Empty or calendar-incomplete copies are not uploaded.');
 validate(JSON.stringify(syncPayload(state)));
 await backup({workingCopy:state,reason:'before saving private Drive revision'});
 const latest=revisionHead(await transport.list());if(latest?.id!==head?.id)throw Error('Another device saved during this check. Try Sync now again.');
 const envelope={kind:'relay-private-sync',version:1,hash:localHash,parent:head?.id||null,createdAt:new Date().toISOString(),data:syncPayload(state)};
 const saved=await transport.append(envelope,head?.id,localHash);
 if(!saved?.id)throw Error('Upload result uncertain. Check Drive before retrying.');
 await validatedCloud(transport,{...saved,appProperties:{...saved.appProperties,hash:localHash}});
 const finalHead=revisionHead(await transport.list());if(finalHead?.id!==saved.id)throw Error('Cloud changed during verification. Your revision is preserved. Recheck before editing.');
 return {next:{...state,cloudSync:{account:account.permissionId,email:account.emailAddress,revision:saved.id,hash:localHash,checkedAt:new Date().toISOString()}},status:'saved'};
}
