let opening,queue=Promise.resolve();
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
 const db=await database();return new Promise((resolve,reject)=>{
  const tx=db.transaction('copies','readonly'),request=tx.objectStore('copies').get('active');let value;
  request.onsuccess=()=>{value=request.result;};tx.oncomplete=()=>resolve(value);tx.onabort=()=>reject(tx.error||Error('Local read failed.'));tx.onerror=()=>{};
 });
}
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
