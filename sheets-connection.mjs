// Public OAuth client identifier; no secret or access token is saved or exported.
export const CLIENT_ID='474468307579-74tcg10rpfvlsq9c82jn61t35lgtjfdq.apps.googleusercontent.com';
export const SPREADSHEET_ID='16C0ISjvOjQ-FnC9nsWAHmALfmBr0Dwxyjpfvz3EhEvQ';
const SCOPE='https://www.googleapis.com/auth/spreadsheets.readonly';
const WRITE_SCOPE='https://www.googleapis.com/auth/spreadsheets';
export const TABLES=['Contacts','Manifest','Calls','ManifestVisits','GivingHistory'];
let loading,client,token='',expires=0,pending,canWrite=false;
export function prepareSheetsSignIn(){
 if(client)return Promise.resolve();
 if(loading)return loading;
 loading=new Promise((resolve,reject)=>{
  const initialize=()=>{
   client=window.google.accounts.oauth2.initTokenClient({client_id:CLIENT_ID,scope:SCOPE,include_granted_scopes:false,
    callback:response=>{const request=pending;pending=null;if(!request)return;
     if(response.error||!response.access_token||!window.google.accounts.oauth2.hasGrantedAllScopes(response,request.scope)){request.reject(Error('Google Sheets permission was not granted. Your records are unchanged.'));return;}
     canWrite=window.google.accounts.oauth2.hasGrantedAllScopes(response,WRITE_SCOPE);
     token=response.access_token;expires=Date.now()+Number(response.expires_in||3600)*1000-60000;request.resolve();},
    error_callback:()=>{const request=pending;pending=null;request?.reject(Error('Google sign-in was closed or blocked. Try again in Chrome.'));}
   });resolve();
  };
  if(window.google?.accounts?.oauth2){initialize();return;}
  const script=document.createElement('script');script.src='https://accounts.google.com/gsi/client';script.async=true;
  script.onload=initialize;script.onerror=()=>{loading=null;script.remove();reject(Error('Could not load Google sign-in. Check your connection and try again.'));};document.head.append(script);
 });return loading;
}
// Called directly from a button, not silently on startup or from a timer.
export function authorizeSheets(write=false){
 if(!client)return Promise.reject(Error('Google sign-in is loading. Wait a moment, then click again.'));
 if(pending)return Promise.reject(Error('Complete the open Google sign-in window first.'));
 const scope=write?WRITE_SCOPE:SCOPE;
 return new Promise((resolve,reject)=>{pending={resolve,reject,scope};client.requestAccessToken({scope,prompt:write?'consent':'select_account'});});
}
export function disconnectSheets(){token='';expires=0;canWrite=false;}
export function sheetsAuthorized(){return Boolean(token&&Date.now()<expires);}
export function sheetsWriteAuthorized(){return sheetsAuthorized()&&canWrite;}
export function recipientRows(state){
 if(state.mode==='demo')throw Error('Load your real working copy first.');
 const contacts=state.contacts.filter(c=>!c.archived&&c.emailList===true);
 if(contacts.some(c=>!c.id)||new Set(contacts.map(c=>String(c.id))).size!==contacts.length)throw Error('Recipient IDs need review before saving.');
 return [['id','pastor','church','city','state','wing','contactType','email','church_email','emailList'],...contacts.map(c=>[String(c.id),c.pastor||'',c.church||'',c.city||'',c.state||'',c.wing||'',c.contactType||'Pastor / church',Array.isArray(c.email)?c.email.join(', '):String(c.email||''),Array.isArray(c.church_email)?c.church_email.join(', '):String(c.church_email||''),'TRUE'])];
}
export async function saveRecipients(state,backup){
 if(!sheetsWriteAuthorized())throw Error('Enable Google Sheets saving first.');
 const rows=recipientRows(state),title='RelayRecipients';
 const api=async(path,method='GET',body)=>{
  let response;try{response=await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}${path}`,{method,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),cache:'no-store'});}catch{throw Error('Save result is uncertain. Check Sheets before retrying; keep your backup.');}
  if(!response.ok)throw Error('Google did not confirm the recipient save. Check Sheets before retrying.');return response.json();
 };
 const meta=await api('?fields=spreadsheetId,properties(title),sheets(properties(title,gridProperties))');
 if(meta.spreadsheetId!==SPREADSHEET_ID||meta.properties?.title!=='Relay DB')throw Error('Unexpected workbook. Save stopped.');
 const existing=meta.sheets.find(s=>s.properties.title===title);
 const range=encodeURIComponent(`'${title}'!A:J`);
 const before=existing?await api(`/values/${range}?valueRenderOption=UNFORMATTED_VALUE`):null;
 if(before?.values?.length&&JSON.stringify(before.values[0])!==JSON.stringify(rows[0]))throw Error('RelayRecipients has unfamiliar headers. Nothing changed.');
 await backup({recipientTab:before,workingRows:rows});
 if(!existing)await api(':batchUpdate','POST',{requests:[{addSheet:{properties:{title,gridProperties:{rowCount:Math.max(1000,rows.length),columnCount:10}}}}]});
 // Replace only this dedicated directory; empty trailing cells remove recipients no longer selected.
 const size=Math.max(rows.length,before?.values?.length||0);
 const values=[...rows,...Array.from({length:size-rows.length},()=>Array(10).fill(''))];
 await api(`/values/${encodeURIComponent(`'${title}'!A1:J${size}`)}?valueInputOption=RAW`,'PUT',{values});
 const verified=await api(`/values/${range}?valueRenderOption=UNFORMATTED_VALUE`);
 const normalized=(verified.values||[]).map(row=>Array.from({length:10},(_,i)=>String(row[i]??'')));
 if(JSON.stringify(normalized)!==JSON.stringify(rows))throw Error('Recipient save sent but verification failed. Keep your backup and check Sheets.');
 return rows.length-1;
}
export async function readRecipients(){
 if(!sheetsAuthorized())throw Error('Connect Google first.');
 const response=await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent("'RelayRecipients'!A:J")}?valueRenderOption=UNFORMATTED_VALUE`,{headers:{Authorization:`Bearer ${token}`},cache:'no-store'});
 if(!response.ok)throw Error('Could not load RelayRecipients. Save your recipients to Sheets first, or reconnect Google.');
 return (await response.json()).values||[];
}
export function applySheetRecipients(state,rows){
 if(state.mode==='demo')throw Error('Import your full working-copy backup first. Recipients alone do not restore history.');
 const headers=recipientRows({contacts:[]})[0];
 if(!Array.isArray(rows)||JSON.stringify(rows[0])!==JSON.stringify(headers))throw Error('Unfamiliar recipient headers. Nothing changed.');
 const next=structuredClone(state),seen=new Set();let added=0,updated=0;
 const emails=value=>String(value||'').split(',').map(v=>v.trim()).filter(Boolean);
 for(const row of rows.slice(1)){
  const r=Object.fromEntries(headers.map((key,i)=>[key,String(row[i]??'')]));
  if(!r.id||seen.has(r.id)||!['manifest','voyage'].includes(r.wing)||!['Pastor / church','Friends & family','Personal contact','Individual donor','Organization'].includes(r.contactType)||r.emailList!=='TRUE')throw Error('Invalid or repeated recipient record. Nothing changed.');
  seen.add(r.id);
  const matches=next.contacts.filter(c=>String(c.id)===r.id);
  if(matches.length>1||matches[0]?.archived)throw Error('A recipient ID is ambiguous or archived. Nothing changed.');
  let c=matches[0];
  if(!c){c={id:r.id,pastor:r.pastor,church:r.church,city:r.city,state:r.state,wing:r.wing,phone:[],groups:[],supportStatus:'Non-supporting',notes:'Restored from the recipient directory. Import a full backup to restore any previous history.'};next.contacts.push(c);added++;}else updated++;
  // Existing identities and history stay local; saved recipient fields are explicitly restored.
  c.email=emails(r.email);c.church_email=emails(r.church_email);c.emailList=true;c.contactType=r.contactType;c.designationReviewed=true;
 }
 return {next,added,updated};
}
export function parseSheetTable(values,title){
 if(!Array.isArray(values)||!values.length)throw Error(`${title} has no header row. Sync stopped.`);
 const headers=values[0].map(x=>String(x).trim());
 const required=title==='GivingHistory'?['church_name','gift_date','fund','type','amount']:['id'];
 if(required.some(header=>!headers.includes(header))||new Set(headers.filter(Boolean)).size!==headers.filter(Boolean).length)throw Error(`${title} has unfamiliar headers. Sync stopped.`);
 const rows=values.slice(1).filter(row=>row.some(value=>value!==''&&value!=null)).map(row=>Object.fromEntries(headers.filter(Boolean).map(header=>[header,row[headers.indexOf(header)]??''])));
 const hasStableIds=headers.includes('id'),ids=hasStableIds?rows.map(row=>row.id==null?'':String(row.id)).filter(Boolean):[];
 // GivingHistory is an ID-less ledger. Never invent IDs or collapse equal gifts.
 return {title,rows,headers,sourceValues:values,hasStableIds,missingIds:hasStableIds?rows.length-ids.length:0,duplicateIds:ids.length-new Set(ids).size};
}
// Only exact-ID, reviewed identity cells are eligible. No inserts, deletes or history writes.
export function correctionCells(snapshot,differences){
 const cells=[];
 for(const item of differences){
  if(!['Contacts','Manifest'].includes(item.title))throw Error('Unsupported correction table.');
  const table=snapshot.tables.find(t=>t.title===item.title);
  if(!table||table.missingIds||table.duplicateIds)throw Error('Unsafe contact IDs. Save stopped.');
  const idColumn=table.headers.indexOf('id');
  const rowIndex=table.sourceValues.findIndex((row,i)=>i>0&&String(row[idColumn])===String(item.id));
  if(rowIndex<1)throw Error('A reviewed contact is missing. Check Sheets again.');
  for(const change of item.changes){
   if(!['pastor','church','city','state','address'].includes(change.field))throw Error('Unsupported correction field.');
   const column=table.headers.indexOf(change.field);
   if(column<0||String(table.sourceValues[rowIndex][column]??'')!==String(change.before??''))throw Error('Sheets changed since review. Check Sheets again before saving.');
   let n=column+1,letter='';while(n){n--;letter=String.fromCharCode(65+n%26)+letter;n=Math.floor(n/26);}
   cells.push({range:`'${item.title}'!${letter}${rowIndex+1}`,values:[[String(change.after??'')]]});
  }
 }
 return cells;
}
export async function saveReviewedCorrections(differences,backup){
 if(!sheetsWriteAuthorized())throw Error('Enable Google Sheets saving first.');
 const fresh=await readSheetsSnapshot();
 const data=correctionCells(fresh,differences);
 if(!data.length)throw Error('No reviewed corrections to save.');
 // Backup must complete before a write is attempted; includes remote values for recovery.
 await backup(fresh);
 let response;
 try{response=await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values:batchUpdate`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({valueInputOption:'RAW',data}),cache:'no-store'});}
 catch{throw Error('Save result is uncertain. Check Sheets again before retrying; keep your backup.');}
 if(!response.ok)throw Error('Google did not confirm the save. Check Sheets again before retrying.');
 const verified=await readSheetsSnapshot();
 const expected=differences.map(item=>({...item,changes:item.changes.map(change=>({...change,before:change.after}))}));
 try{correctionCells(verified,expected);}catch{throw Error('Save sent, but verification failed. Keep your backup and check Sheets again.');}
 return verified;
}
export async function readSheetsSnapshot(){
 if(!sheetsAuthorized())throw Error('Sign in to Google again. Your local records are unchanged.');
 const api=async path=>{
  let response;try{response=await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}${path}`,{headers:{Authorization:`Bearer ${token}`},cache:'no-store'});}catch{throw Error('Could not reach Google Sheets. Your local records are unchanged.');}
  if(response.status===401){disconnectSheets();throw Error('Google sign-in expired. Sign in again.');}
  if(!response.ok)throw Error(response.status===403?'Google denied access. Check the Relay project has Sheets API enabled and sign in with the account that owns Relay DB.':'Google Sheets could not be read. No records were changed.');
  return response.json();
 };
 const metadata=await api('?fields=spreadsheetId,properties(title),sheets(properties(title,gridProperties))');
 if(metadata.spreadsheetId!==SPREADSHEET_ID||metadata.properties?.title!=='Relay DB')throw Error('Unexpected workbook. Sync stopped.');
 const ranges=TABLES.map(title=>{const properties=metadata.sheets.find(sheet=>sheet.properties.title===title)?.properties;
  if(!properties||properties.gridProperties.rowCount>20000)throw Error(`${title} needs a schema review before sync.`);
  // Existing columns are bounded; preserve all populated legacy fields.
  const columns=properties.gridProperties.columnCount;let n=columns,end='';while(n){n--;end=String.fromCharCode(65+n%26)+end;n=Math.floor(n/26);}
  return `'${title}'!A1:${end}${properties.gridProperties.rowCount}`;
 });
 const query=new URLSearchParams({valueRenderOption:'UNFORMATTED_VALUE'});ranges.forEach(range=>query.append('ranges',range));
 const data=await api(`/values:batchGet?${query}`);
 if(data.valueRanges?.length!==TABLES.length)throw Error('Incomplete workbook response. No records were changed.');
 return {checkedAt:new Date().toISOString(),tables:data.valueRanges.map((range,i)=>parseSheetTable(range.values,TABLES[i]))};
}
export function compareSheetContacts(state,snapshot){
 if(state.mode==='demo')throw Error('Load your real working copy before comparing Sheets.');
 const report={localContacts:state.contacts.length,sheetContacts:0,localOnly:0,sheetOnly:0,changed:0,matched:0,unsafeIds:0};
 for(const [title,wing] of [['Contacts','voyage'],['Manifest','manifest']]){
  const table=snapshot.tables.find(table=>table.title===title);if(!table)throw Error('Incomplete contact tables.');
  report.sheetContacts+=table.rows.length;report.unsafeIds+=table.missingIds+table.duplicateIds;
  const remote=new Map(table.rows.filter(row=>row.id!==''&&row.id!=null).map(row=>[String(row.id),row]));
  const local=state.contacts.filter(contact=>contact.wing===wing);const ids=new Set(local.map(contact=>String(contact.id)));
  for(const contact of local){const row=remote.get(String(contact.id));if(!row){report.localOnly++;continue;}
   const fields=['pastor','church','city','state','address'];
   if(fields.some(field=>field in row&&String(row[field]??'').trim()!==String(contact[field]??'').trim()))report.changed++;else report.matched++;
  }
  report.sheetOnly+=[...remote.keys()].filter(id=>!ids.has(id)).length;
 }
 return report;
}
