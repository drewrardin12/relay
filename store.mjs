import {seed} from './seed.mjs';
import {CALENDAR_MEETINGS} from './calendar-meetings.mjs';
import {CALENDAR_VACATIONS} from './calendar-vacations.mjs';
import {FAMILY_DATES} from './calendar-dates.mjs';
import {OPEN_CALENDAR} from './open-calendar.mjs';
import {financeDefaults,financePlan} from './finance-plan.mjs';
import {giftCategory} from './finance.mjs';
import {readLocalCopy,writeLocalCopy} from './local-database.mjs';
import {recoverCoordinates} from './geocoding.mjs';
import {brianPetrickRemovals,correctBrianPetrick,reviewedPastorRemovals,correctReviewedPastors,correctVoyageOnlyChurches} from './contact-corrections.mjs?v=20260918-kansas';
import {normalizeContact,fields,iso,phones} from './domain.mjs';
import {exactCrossWingDuplicates,consolidateExactDuplicates} from './contact-corrections.mjs?v=20260918-kansas';
const KEY='relay_redesign_working_copy_v1';
function optionalBackup(key,text){
 // Large automatic copies compete with the active roster for browser quota.
 // Keep the main saved copy usable; users can export full backups to disk.
 if(text.length>250000)return;
 try{localStorage.setItem(key,text);}catch{}
}
export function load(){try{const s=JSON.parse(localStorage.getItem(KEY));if(s?.version===1&&Array.isArray(s.contacts)&&Array.isArray(s.logs))return s;}catch{}return seed();}
export async function loadWorkingCopy(){
 if(typeof indexedDB==='undefined')return load();
 const saved=await readLocalCopy();
 if(saved){if(saved.version!==1||!Array.isArray(saved.contacts)||!Array.isArray(saved.logs))throw Error('The local database copy is invalid. Restore an exported backup.');return saved;}
 const legacy=load();await writeLocalCopy(legacy);
 const verified=await readLocalCopy();if(JSON.stringify(verified)!==JSON.stringify(legacy))throw Error('Local storage migration could not be verified.');
 // Keep legacy localStorage and its backups untouched after verification.
 return verified;
}
export function persist(state){if(typeof indexedDB!=='undefined')return writeLocalCopy(state);localStorage.setItem(KEY,JSON.stringify(state));}
export function exportData(state){const defaults=financeDefaults();return JSON.stringify({...state,calendarMeetings:state.calendarMeetings||CALENDAR_MEETINGS,calendarVacations:state.calendarVacations||CALENDAR_VACATIONS,familyDates:state.familyDates||FAMILY_DATES,openCalendar:state.openCalendar||OPEN_CALENDAR,financeSchedule:state.financeSchedule||defaults.schedule,financeAllowances:state.financeAllowances||defaults.allowances,financePlan:financePlan(state).settings,gifts:state.gifts.map(g=>({...g,categoryOverride:g.categoryOverride||giftCategory(g)})),exportedAt:new Date().toISOString()},null,2);}
export function parseImport(text){const s=JSON.parse(text);if(s.version!==1||!['contacts','logs','tides','meetings','events','gifts'].every(k=>Array.isArray(s[k])))throw new Error('Choose a Relay redesign backup. Your current app data can be read separately through its connection.');s.settings={yearlyGoal:70000,showNoNumbers:false,...s.settings};s.mode='working-copy';return s;}
export function jsonp(endpoint,secret,action){return new Promise((resolve,reject)=>{
 const url=new URL(endpoint);if(url.protocol!=='https:'||url.hostname!=='script.google.com')throw new Error('Use your HTTPS Google Apps Script deployment URL.');
 const cb=`relay_read_${Date.now()}_${Math.random().toString(36).slice(2)}`;url.search=new URLSearchParams({action,secret,callback:cb});
 const script=document.createElement('script');let timer;
 const cleanup=()=>{clearTimeout(timer);script.remove();delete window[cb];};
 window[cb]=data=>{cleanup();if(data?.error)reject(new Error(String(data.error)));else resolve(data);};
 script.onerror=()=>{cleanup();reject(new Error('Could not reach your existing app connection.'));};
 timer=setTimeout(()=>{cleanup();reject(new Error('The connection timed out. Your working copy is unchanged.'));},20000);
 script.src=url.href;document.head.append(script);
 });}
export async function readExisting(endpoint,secret){
 // Deliberately read-only: the redesign never calls save/delete actions yet.
 const [voyage,manifest,calls,visits,giving]=await Promise.all(['getContacts','getManifest','getCalls','getVisits','getGivingHistory'].map(a=>jsonp(endpoint,secret,a)));
 if(![voyage,manifest,calls,visits,giving].every(Array.isArray))throw new Error('The existing endpoint returned an unfamiliar response; no data was imported.');
 const s=seed();s.mode='working-copy';s.contacts=[...voyage.map(c=>normalizeContact(c,'voyage')),...manifest.map(c=>normalizeContact(c,'manifest'))];
 const known=new Set(s.contacts.map(c=>c.id));s.contacts=s.contacts.filter((c,i,a)=>c.wing==='manifest'||!a.some(m=>m.id===c.id&&m.wing==='manifest'));
 s.logs=calls.filter(c=>known.has(String(c.contactId))).map(c=>({...c,id:String(c.id),contactId:String(c.contactId),date:iso(c.date),type:c.outcome==='reminder'?'reminder':c.outcome==='note'?'note':'call',result:c.outcome,relayComplete:String(c.details||'').includes('#RELAYED'),details:c.details||''}));
 const loadedVoyage=new Set(voyage.map(c=>String(c.id)));
 s.tides=calls.filter(c=>c.remDate).map(c=>({id:String(c.id),legacyId:String(c.id),contactId:String(c.contactId),action:c.remType||'call',title:c.details||'Follow up',note:c.details||'',due:iso(c.remDate),time:c.remTime||'',completed:[true,'true'].includes(c.completed),legacyHidden:!loadedVoyage.has(String(c.contactId))||(c.outcome!=='reminder'&&![true,'true'].includes(c.completed))}));
 s.meetings=visits.map(v=>({...v,id:String(v.id),contactId:String(v.manifestId),date:iso(v.date),end:v.endDate?iso(v.endDate):iso(v.date),kind:'meeting',roles:[],notes:v.notes||''}));
 s.events=[...s.meetings];s.gifts=giving.map(g=>({...g,id:String(g.id||crypto.randomUUID()),date:iso(g.gift_date),amount:Number(g.amount)||0,type:g.type||'love_gift',contactId:String(g.manifestId||g.contactId||'')}));
 // Match only unambiguous exact names. Never fuzzy-match financial records.
 s.gifts.forEach(g=>{if(known.has(g.contactId))return;const matches=s.contacts.filter(c=>c.wing==='manifest'&&String(c.church).trim().toLowerCase()===String(g.church_name||'').trim().toLowerCase());if(matches.length===1)g.contactId=matches[0].id;});
 s.recents=[];s.course=null;s.settings.familyDates=[];return s;
}
