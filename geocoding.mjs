import {LOCATION_REPAIRS} from './location-repairs.mjs';
export const validCoordinates=c=>c&&[c.lat,c.lng].every(v=>v!==''&&v!=null&&Number.isFinite(Number(v)))&&Math.abs(Number(c.lat))<=90&&Math.abs(Number(c.lng))<=180;
export const locationChanged=(before,after)=>!before||['address','city','state'].some(key=>String(before[key]||'').trim()!==String(after[key]||'').trim());
export function clearLocation(c){c.lat='';c.lng='';delete c.locationSource;delete c.locationAddress;}
export function recoverCoordinates(contacts){
 for(const c of contacts){
  if(validCoordinates(c))continue;
  const repair=LOCATION_REPAIRS.find(r=>r.id===c.id&&r.address===c.address);
  if(repair){Object.assign(c,{lat:repair.lat,lng:repair.lng,locationSource:repair.locationSource||'Recovered original church location'});continue;}
  const twin=contacts.find(other=>other!==c&&validCoordinates(other)&&String(other.address||'').trim().toLowerCase()===String(c.address||'').trim().toLowerCase()&&c.address);
  if(twin){c.lat=Number(twin.lat);c.lng=Number(twin.lng);c.locationSource='Recovered matching address';}
 }
}
function census(query){return new Promise((resolve,reject)=>{
 const callback=`relay_geo_${Date.now()}_${Math.random().toString(36).slice(2)}`,script=document.createElement('script');
 const url=new URL('https://geocoding.geo.census.gov/geocoder/locations/address');
 url.search=new URLSearchParams({...query,benchmark:'Public_AR_Current',format:'jsonp',callback});
 const cleanup=()=>{clearTimeout(timer);script.remove();delete window[callback];};
 const timer=setTimeout(()=>{cleanup();reject(Error('Address lookup timed out. Your contact is still saved.'));},18000);
 window[callback]=data=>{cleanup();resolve(data.result?.addressMatches||[]);};
 script.onerror=()=>{cleanup();reject(Error('Address lookup unavailable. Check your connection.'));};script.src=url.href;document.head.append(script);
});}
export async function locateChurch(c){
 if(!c.address?.trim())throw Error('Add a street address to this church first.');
 const street=c.address.split(',')[0].trim().replace(/\b[A-Z]{2}[- ](\d+)\b/g,'HIGHWAY $1');
 const matches=await census({street,city:String(c.city||'').split(',')[0],state:c.state||''});
 if(matches.length!==1)throw Error('Could not uniquely match this street address. Check the church address and city.');
 const point={lat:Number(matches[0].coordinates.y),lng:Number(matches[0].coordinates.x)};
 if(!validCoordinates(point))throw Error('Address lookup returned an invalid location.');
 return {...point,locationSource:'U.S. Census address match',locationAddress:c.address};
}
