export function locationLabel(c){
 const region=String(c.state||'').trim(),city=String(c.city||'').trim();
 const parts=city.split(',').map(s=>s.trim()).filter(Boolean);
 while(region&&parts.at(-1)?.toLowerCase()===region.toLowerCase())parts.pop();
 return [...parts,region].filter(Boolean).join(', ');
}
import {CALENDAR_MEETINGS} from './calendar-meetings.mjs';
const US_STATES=new Set('AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY'.split(' '));
export function visitedStates(state,now=new Date(),bundledCalendar=CALENDAR_MEETINGS){
 const found=new Set();
 const today=now.toISOString().slice(0,10),contacts=new Map((state.contacts||[]).map(c=>[c.id,c]));
 const add=region=>{const normalized=String(region||'').trim().toUpperCase();if(US_STATES.has(normalized))found.add(normalized);};
 // A recorded visit is direct attendance evidence.
 for(const log of state.logs||[]){if(log.type!=='visit'||String(log.date||'')>today)continue;add(contacts.get(log.contactId)?.state);}
 // The reviewed ministry-calendar snapshot is also attendance evidence once a
 // meeting has ended. Ignore ordinary calendar items and reviewed exclusions.
 const calendarSource=Array.isArray(state.calendarMeetings)&&state.calendarMeetings.length
  ?state.calendarMeetings
  :(bundledCalendar?.length?bundledCalendar:(state.meetings||[]));
 for(const meeting of calendarSource||[]){if(meeting.excludeFromStats||(meeting.end||meeting.date)>today)continue;add(contacts.get(meeting.contactId)?.state||meeting.state);}
 // Explicit corrections always win over imported evidence.
 for(const [region,visited] of Object.entries(state.settings?.visitedStates||{})){const normalized=String(region).toUpperCase();if(!US_STATES.has(normalized))continue;if(visited)found.add(normalized);else found.delete(normalized);}
 return found;
}
export async function contactPhoto(file){
 if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw Error('Choose a JPG, PNG or WebP photo.');
 if(file.size>15*1024*1024)throw Error('Choose a photo smaller than 15 MB.');
 const bitmap=await createImageBitmap(file),canvas=document.createElement('canvas');
 canvas.width=canvas.height=320;const side=Math.min(bitmap.width,bitmap.height);
 canvas.getContext('2d').drawImage(bitmap,(bitmap.width-side)/2,(bitmap.height-side)/2,side,side,0,0,320,320);
 bitmap.close();return canvas.toDataURL('image/jpeg',.82);
}
export async function journalPhoto(file){
 if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw Error('Choose a JPG, PNG or WebP photo.');
 if(file.size>15*1024*1024)throw Error('Choose a photo smaller than 15 MB.');
 const bitmap=await createImageBitmap(file),scale=Math.min(1,1280/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement('canvas');
 canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);
 canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
 return canvas.toDataURL('image/jpeg',.78);
}
