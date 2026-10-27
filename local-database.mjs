import {mergePending} from './sync-engine.mjs?v=20261027-low-read';
let opening,queue=Promise.resolve();
let readTimedOut=false;
function database(){
 if(!opening)opening=new Promise((resolve,reject)=>{
  const request=indexedDB.open('relay-private-working-copy',1);
  request.onupgradeneeded=()=>request.result.createObjectStore('copies');
  request.onsuccess=()=>resolve(request.result);
  request.onerror=()=>{opening=null;reject(request.error);};
  request.onblocked=()=>{opening=null;reject(Error('Close other Relay tabs to open local storage.'));};
 });return opening;
}
export async function readLocalCopy(){
 const read=(async()=>{const db=await database();return new Promise((resolve,reject)=>{
  const tx=db.transaction('copies','readonly'),request=tx.objectStore('copies').get('active');let value;
  request.onsuccess=()=>{value=request.result;};tx.oncomplete=()=>resolve(value);tx.onabort=()=>reject(tx.error||Error('Local read failed.'));tx.onerror=()=>{};
 });})();
 const timeout=new Promise(resolve=>setTimeout(()=>resolve(Symbol.for('relay-local-read-timeout')),5000));
 const result=await Promise.race([read,timeout]);
 if(result===Symbol.for('relay-local-read-timeout')){readTimedOut=true;return undefined;}
 return result;
}
export const localDatabaseReadTimedOut=()=>readTimedOut;
export function writeLocalCopy(state){
 const snapshot=structuredClone(state);
 const write=async()=>{const db=await database();await new Promise((resolve,reject)=>{
  const tx=db.transaction('copies','readwrite');tx.objectStore('copies').put(snapshot,'active');
  tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error||Error('Local save failed.'));tx.onerror=()=>{};
 });};
 const result=queue.then(write);queue=result.catch(()=>{});return result;
}
export async function saveSheetsBackup(value){
 const db=await database(),key='before-sheets-save-'+crypto.randomUUID();
 await new Promise((resolve,reject)=>{
  const tx=db.transaction('copies','readwrite');tx.objectStore('copies').put(structuredClone(value),key);
  tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error||Error('Backup failed. No Sheets write attempted.'));tx.onerror=()=>{};
 });
 return key;
}
// Separate from the shared working copy: these cursors and edits belong to this device.
export async function readDeviceSync(uid){
 if(typeof indexedDB==='undefined')return null;
 const db=await database();return new Promise((resolve,reject)=>{
  const tx=db.transaction('copies','readonly'),store=tx.objectStore('copies'),collections={};let header;
  const request=store.get('sync-v2:'+uid);request.onsuccess=()=>{header=request.result;};
  for(const key of ['contacts','logs','tides','meetings','events','gifts','calendarMeetings','calendarVacations','familyDates']){const item=store.get('sync-v2:'+uid+':'+key);item.onsuccess=()=>{collections[key]=item.result||{};};}
  tx.oncomplete=()=>resolve(header?{...header,collections}:null);tx.onabort=()=>reject(tx.error);tx.onerror=()=>{};
 });
}
export function writeDeviceSync(uid,value,{collections=Object.keys(value.collections||{}),queueOnly=false}={}){
 if(typeof indexedDB==='undefined')return Promise.resolve();
 const {collections:rows,...data}=value,header=structuredClone(data),changed=Object.fromEntries(collections.map(key=>[key,structuredClone(rows[key]||{})]));
 const write=async()=>{const db=await database();await new Promise((resolve,reject)=>{
  const tx=db.transaction('copies','readwrite'),store=tx.objectStore('copies'),request=store.get('sync-v2:'+uid);
  request.onsuccess=()=>{const previous=request.result||{},acknowledged={...(previous.acknowledged||{}),...(header.acknowledged||{})},outbox=mergePending(previous.outbox,header.outbox,acknowledged);store.put({...((queueOnly&&request.result)?previous:header),acknowledged,outbox},'sync-v2:'+uid);if(!queueOnly)for(const [key,entries] of Object.entries(changed))store.put(entries,'sync-v2:'+uid+':'+key);};
  tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error||Error('Could not save the device sync queue.'));tx.onerror=()=>{};
 });};
 const result=queue.then(write);queue=result.catch(()=>{});return result;
}
