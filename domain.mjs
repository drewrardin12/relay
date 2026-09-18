import {OPEN_CALENDAR} from './open-calendar.mjs';
import {CALENDAR_VACATIONS} from './calendar-vacations.mjs';
import {CALENDAR_MEETINGS} from './calendar-meetings.mjs';
import {FAMILY_DATES,holidayDates} from './calendar-dates.mjs';
// Pure business rules. Dates are local calendar dates, never UTC midnight.
import {giftCategory,insuranceGift} from './finance.mjs';
export const DAY = 86400000;
export function date(value) {
  if (value instanceof Date) return new Date(value);
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y,m,d] = value.split('-').map(Number);
    return new Date(y,m-1,d,12);
  }
  return new Date(value);
}
export function iso(value = new Date()) {
  const d = date(value);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
export function addDays(value, days) { const d=date(value); d.setDate(d.getDate()+days); return d; }
export function firstMonday(year, month) {
  const d=new Date(year,month,1,12); d.setDate(1+(8-d.getDay())%7); return d;
}
export function relayWeek(value = new Date()) {
  const d=date(value); d.setHours(12,0,0,0);
  const start=addDays(d,-((d.getDay()+6)%7));
  let y=d.getFullYear(),m=d.getMonth(),first=firstMonday(y,m);
  if (d<first) { m--; if(m<0){m=11;y--;} first=firstMonday(y,m); }
  // Calendar arithmetic avoids daylight-saving week misclassification.
  const days=(Date.UTC(start.getFullYear(),start.getMonth(),start.getDate())-Date.UTC(first.getFullYear(),first.getMonth(),first.getDate()))/DAY;
  const index=Math.floor(days/7)+1;
  return {group:index<=4?index:0, number:index, start:iso(start), end:iso(addDays(start,6)), month:m, year:y};
}
export function smallestGroup(contacts) {
  const counts=[1,2,3,4].map(g=>contacts.filter(c=>c.wing==='manifest' && Number(c.relayGroup)===g).length);
  return counts.indexOf(Math.min(...counts))+1;
}
export const ATTEMPTS=new Set(['call','text','email','visit','pastor','secretary','voicemail','noanswer1','noanswer2']);
export function relayCompleted(contact, logs, week=relayWeek()) {
  return logs.some(l=>l.contactId===contact.id && (ATTEMPTS.has(l.type)||l.relayComplete) && iso(l.date)>=week.start && iso(l.date)<=week.end && iso(l.date)<=iso(new Date()));
}
export function missedRelays(contact,logs,now=new Date()) {
  if(contact.wing!=='manifest'||!contact.relayGroup||!contact.relaySince)return 0;
  const since=date(contact.relaySince); if(!Number.isFinite(+since))return 0;
  const current=relayWeek(now); let cursor=relayWeek(since).start, missed=0;
  // Never manufacture missed cycles from before a known assignment date.
  for(let guard=0;iso(cursor)<current.start&&guard<5200;guard++,cursor=iso(addDays(cursor,7))) {
    const w=relayWeek(cursor);
    if(w.group!==Number(contact.relayGroup)||w.start<iso(since))continue;
    missed=relayCompleted(contact,logs,w)?0:missed+1;
  }
  if(current.group===Number(contact.relayGroup)&&relayCompleted(contact,logs,current))missed=0;
  return missed;
}
export function fields(value){return Array.isArray(value)?value.map(String).map(s=>s.trim()).filter(Boolean):String(value||'').split(/[,;\n]+/).map(s=>s.trim()).filter(Boolean);}
export function phones(contact){return [...new Set(fields(contact.phone).concat(fields(contact.cell)))].filter(p=>p.replace(/\D/g,'').length>=7);}
export function emails(contact){return [...new Set(fields(contact.email).concat(fields(contact.church_email)))];}
export function callable(contact,showNoNumbers=false){return showNoNumbers||phones(contact).length>0;}
export function lastLog(contact,logs){return logs.filter(l=>l.contactId===contact.id&&!['reminder','imported'].includes(l.type)).sort((a,b)=>+date(b.date)-+date(a.date)||String(b.createdAt||b.id).localeCompare(String(a.createdAt||a.id)))[0];}
export function lastAttempt(contact,logs,now=new Date()){return lastLog(contact,logs.filter(l=>ATTEMPTS.has(l.type)&&l.date<=iso(now)));}
export function haversine(a,b){
  if(![a.lat,a.lng,b.lat,b.lng].every(n=>n!==null&&n!==''&&Number.isFinite(Number(n))))return Infinity;
  const rad=n=>Number(n)*Math.PI/180; const dy=rad(b.lat-a.lat),dx=rad(b.lng-a.lng);
  const v=Math.sin(dy/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dx/2)**2;
  return 3958.8*2*Math.atan2(Math.sqrt(v),Math.sqrt(1-v));
}
export function courseContacts(contacts,course,logs,showNoNumbers=false){
  const anchor=course.center||contacts.find(c=>c.id===course.anchorId);
  return contacts.filter(c=>c.wing==='voyage'&&c.contactType!=='Friends & family'&&callable(c,showNoNumbers)&&!c.notInterested)
    .filter(c=>course.mode==='state'?c.state===course.state:anchor&&haversine(anchor,c)<=Number(course.radius))
    .filter(c=>!course.result||lastLog(c,logs)?.result===course.result)
    .filter(c=>!course.type||lastLog(c,logs)?.type===course.type)
    .sort((a,b)=>(a.pastor||a.church).localeCompare(b.pastor||b.church));
}
const PERIODS={weekly:52,'bi-weekly':26,monthly:12,'bi-monthly':6,quarterly:4,'bi-annual':2,annually:1,annual:1};
export function changedSupportPeriods(contact,amount,cadence,effective){
 const source=contact.supportPeriods?.length?contact.supportPeriods:[{start:contact.supportStart||'',end:contact.supportEnd||'',amount:contact.supportAmount,cadence:contact.supportCadence}];
 const cutoff=iso(addDays(effective,-1));
 const previous=source.filter(p=>!p.start||p.start<effective).map(p=>({...p,end:!p.end||p.end>=effective?cutoff:p.end}));
 return [...previous,{start:effective,end:contact.supportEnd||'',amount,cadence}];
}
export function annualRate(amount,cadence){return Math.max(0,Number(String(amount||0).replace(/[^\d.]/g,''))||0)*(PERIODS[String(cadence||'').toLowerCase()]||0);}
export function yearlyProjection(contacts,year){
  const start=new Date(year,0,1,12),end=new Date(year+1,0,1,12),yearDays=(Date.UTC(year+1,0,1)-Date.UTC(year,0,1))/DAY;
  const ordinal=d=>Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())/DAY;
  return contacts.filter(c=>c.wing==='manifest'&&(c.supportStatus==='Supporting'||c.supportPeriods?.length||c.supportEnd)).reduce((total,c)=>{
    const periods=c.supportPeriods?.length?c.supportPeriods:[{amount:c.supportAmount,cadence:c.supportCadence,start:c.supportStart,end:c.supportEnd}];
    return total+periods.reduce((sum,p)=>{
      const ps=p.start?date(p.start):start,pe=p.end?addDays(p.end,1):end;
      const days=Math.max(0,ordinal(date(Math.min(+pe,+end)))-ordinal(date(Math.max(+ps,+start))));
      return sum+annualRate(p.amount,p.cadence)*days/yearDays;
    },0);
  },0);
}
export function supportStats(state,year=new Date().getFullYear(),override=null,now=new Date()){
  const goal=Number(state.settings.yearlyGoal)||70000;
  const records=state.gifts.filter(g=>date(g.date).getFullYear()===Number(year)&&date(g.date)<=date(now));
  const recurring=records.filter(g=>giftCategory(g)==='support').reduce((n,g)=>n+Number(g.amount||0),0);
  const insurance=records.filter(insuranceGift).reduce((n,g)=>n+Number(g.amount||0),0);
  const gifts=records.filter(g=>giftCategory(g)!=='support'&&!insuranceGift(g)).reduce((n,g)=>n+Number(g.amount||0),0);
  const projected=override===null?yearlyProjection(state.contacts,Number(year)):Math.max(0,Number(override)||0)*52;
  const supporters=state.contacts.filter(c=>c.wing==='manifest'&&c.supportStatus==='Supporting'&&(!c.supportEnd||c.supportEnd>=iso(now)));
  const annualSupport=supporters.reduce((n,c)=>n+annualRate(c.supportAmount,c.supportCadence),0);
  const unknown=supporters.filter(c=>!annualRate(c.supportAmount,c.supportCadence)).length;
  const start=new Date(Number(year),0,1),end=new Date(Number(year)+1,0,1);
  const elapsed=Math.max(0,Math.min(1,(+date(now)-+start)/(+end-+start)));
  const supportGoal=Number(state.settings.supportGoal)||35000;
  const offerings=records.filter(g=>giftCategory(g)==='love_offering').reduce((n,g)=>n+Number(g.amount||0),0);
return {goal,insurance,received:recurring+gifts+insurance,recurring,gifts,offerings,otherGifts:gifts-offerings,projected,annualSupport,supportGoal,unknown,supportRemaining:Math.max(0,supportGoal-annualSupport),pace:goal*elapsed,paceDifference:recurring+gifts+insurance-goal*elapsed,remaining:Math.max(0,goal-projected),actualRemaining:Math.max(0,goal-recurring-gifts-insurance),pct:Math.round((recurring+gifts+insurance)/goal*100)};
}
function advance(value,cadence){const d=date(value),c=String(cadence).toLowerCase();if(c==='weekly'||c==='bi-weekly')return addDays(d,c==='weekly'?7:14);const months={'monthly':1,'bi-monthly':2,'quarterly':3,'bi-annual':6,'annual':12,'annually':12}[c];if(!months)return null;const day=d.getDate();d.setDate(1);d.setMonth(d.getMonth()+months);d.setDate(Math.min(day,new Date(d.getFullYear(),d.getMonth()+1,0).getDate()));return d;}
export function givingInterruptions(state,now=new Date()){
  return state.contacts.filter(c=>c.wing==='manifest'&&c.supportStatus==='Supporting'&&(!c.supportEnd||c.supportEnd>=iso(now))).map(c=>{
    if(/faith.*baptist/i.test(c.church||'')&&/bourbonnais/i.test(c.city||''))return null;
    const paid=state.gifts.filter(g=>giftCategory(g)==='support'&&g.contactId===c.id&&date(g.date)<=date(now)).sort((a,b)=>+date(b.date)-+date(a.date));
    const last=paid[0]?.date,anchor=last||c.supportStart;if(!anchor)return null;
    let due=last?advance(anchor,c.supportCadence):date(anchor),missed=0;
    if(!due)return null;
    for(let guard=0;due&&date(due)<date(now)&&guard<1000;guard++){missed++;due=advance(due,c.supportCadence);}
    return missed>=2?{contact:c,missed,last:last||null}:null;
  }).filter(Boolean);
}
export function tideGroup(tide,now=new Date()){
  if(tide.legacyHidden)return 'Retained legacy record';
  if(tide.completed)return 'Completed';
  if(tide.time){if(date(`${tide.due}T${tide.time}`)<date(now))return 'Overdue';}
  else if(tide.due<iso(now))return 'Overdue';
  if(tide.due===iso(now))return 'Today';
  const end=iso(addDays(relayWeek(now).start,6));return tide.due<=end?'This Week':'Later';
}
export function calendarEvents(state,day){
  const key=iso(day),md=key.slice(5);
  // Calendar end dates are exclusive for all-day ministry events.
  const ministry=(state.calendarMeetings||CALENDAR_MEETINGS).map(m=>({...m,end:m.end>m.date?iso(addDays(m.end,-1)):m.date}));
  const local=state.events.filter(e=>e.kind!=='meeting'||!e.manifestId);
  const all=[...local,...ministry,...(state.calendarVacations||CALENDAR_VACATIONS),...(state.openCalendar?.markers||OPEN_CALENDAR.markers),...(state.familyDates||FAMILY_DATES),...holidayDates(Number(key.slice(0,4)))];
  const found=all.filter(e=>e.annual?e.date<=key&&e.date.slice(5)===md:e.date<=key&&(e.end||e.date)>=key);
  return found.filter((e,i)=>found.findIndex(v=>v.kind===e.kind&&v.title===e.title)===i);
}
export function dayStatus(state,day){const events=calendarEvents(state,day);if(events.some(e=>e.kind==='open-date'))return 'open';if(events.some(e=>e.kind==='meeting'))return 'meeting';if(events.some(e=>e.kind==='vacation'))return 'vacation';if(events.some(e=>['holiday','birthday','anniversary'].includes(e.kind)))return 'protected';return 'unavailable';}
export function openCounts(state,now=new Date()){
  const end=date(now);end.setFullYear(end.getFullYear()+1,0,1);let sundays=0,wednesdays=0;
  for(let d=date(now);d<end;d=addDays(d,1)){if(dayStatus(state,d)!=='open')continue;if(d.getDay()===0)sundays++;if(d.getDay()===3)wednesdays++;}return {sundays,wednesdays};
}
export function normalizeContact(c,wing,now=new Date()){
  return {...c,id:String(c.id),wing,pastor:String(c.pastor||''),church:String(c.church||''),city:String(c.city||''),state:String(c.state||''),starred:[true,'true','TRUE'].includes(c.starred),relayGroup:Number(c.relayGroup||c.relay_group)||null,relaySince:c.relaySince||null,supportStatus:c.supportStatus||c.support_status||'Non-supporting',supportAmount:c.supportAmount??c.support_amount??'',supportCadence:c.supportCadence||c.support_cadence||'',supportStart:c.supportStart||c.support_start||'',supportEnd:c.supportEnd||c.support_end||'',rv:c.rv??c.rv_hookup??'',handouts:c.handouts??c.bible_handouts??'',notInterested:c.notInterested||c.not_interested||false};
}
export const MONEY=new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0});
export const PRECISE=new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:2});
