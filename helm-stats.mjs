import {ATTEMPTS,iso} from './domain.mjs';
import {giftCategory} from './finance.mjs';
import {CALENDAR_MEETINGS} from './calendar-meetings.mjs';
const US_STATES=new Set('AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY'.split(' '));
export function helmStats(state,now=new Date(),bundledCalendar=CALENDAR_MEETINGS){
 const today=iso(now),year=today.slice(0,4),contacts=new Map(state.contacts.map(c=>[c.id,c]));
 const past=l=>/^\d{4}-\d{2}-\d{2}$/.test(l.date||'')&&l.date<=today;
 const attempted=new Set(state.logs.filter(l=>past(l)&&ATTEMPTS.has(l.type)&&contacts.has(l.contactId)).map(l=>l.contactId));
 const visits=state.logs.filter(l=>past(l)&&l.type==='visit');
 const meetings=new Map();
 for(const l of visits)meetings.set(l.legacyVisitId||l.meetingId||`${l.contactId}:${l.date}`,l);
 // An old calendar date alone is not proof of attendance.
 for(const m of state.meetings||[])if(past(m)&&(m.completed===true||m.status==='completed'))meetings.set(m.id,m);
 // Older private copies may contain an empty calendarMeetings array. That
 // means the snapshot was never embedded in that copy, not that the user has
 // zero ministry meetings. Fall back to the bundled reviewed snapshot.
 const calendarSource=Array.isArray(state.calendarMeetings)&&state.calendarMeetings.length
  ?state.calendarMeetings
  :bundledCalendar.length?bundledCalendar
  :(state.meetings||[]);
 const calendar=calendarSource.filter(m=>!m.excludeFromStats);
 if(!state.useLegacyMeetingStats){meetings.clear();for(const m of calendar)if((m.end||m.date)<=today)meetings.set(m.id,m);}
 const states=new Set();
 for(const m of meetings.values()){
  const region=String(contacts.get(m.contactId)?.state||m.state||'').trim().toUpperCase();
  if(US_STATES.has(region))states.add(region);
  if(contacts.has(m.contactId))attempted.add(m.contactId);
 }
 const churchKey=c=>String([c.church,String(c.city||'').split(',')[0],c.state].join('|')).toLowerCase().replace(/[^a-z0-9|]/g,'').replace('prarie','prairie');
 const visitedChurches=new Set([...meetings.values()].map(m=>contacts.get(m.contactId)).filter(c=>c?.church).map(churchKey));
 const supporting=new Set(state.contacts.filter(c=>c.church&&c.supportStatus==='Supporting').map(churchKey)),firstSupport=new Map();
 for(const g of state.gifts||[]){const c=contacts.get(g.contactId);if(!c?.church||!past(g)||giftCategory(g)!=='support')continue;const key=churchKey(c);supporting.add(key);if(!firstSupport.has(key)||g.date<firstSupport.get(key))firstSupport.set(key,g.date);}
 const supportedVisited=[...visitedChurches].filter(key=>supporting.has(key)).length;
 const upcoming=new Map();
 for(const m of [...(state.meetings||[]),...(state.events||[])])if(m.kind==='meeting'&&m.date>today&&m.date.startsWith(year)&&!m.completed&&!['completed','cancelled','canceled'].includes(m.status))upcoming.set(m.id||`${m.contactId}:${m.date}`,m);
 if(!state.useLegacyMeetingStats){upcoming.clear();for(const m of calendar)if(m.date>today&&m.date.startsWith(year))upcoming.set(m.id,m);}
 return {statesVisited:states.size,statesRemaining:50-states.size,contactsAttempted:attempted.size,contactsUntouched:contacts.size-attempted.size,meetingsYear:[...meetings.values()].filter(m=>m.date.startsWith(year)).length,meetingsTotal:meetings.size,upcomingYear:upcoming.size,newSupportYear:[...firstSupport.values()].filter(d=>d.startsWith(year)).length,supportConversion:visitedChurches.size?Math.round(supportedVisited/visitedChurches.size*100):null,supportedVisited,visitedChurches:visitedChurches.size};
}
