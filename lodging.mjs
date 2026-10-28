import {loadCourseMaps,openCoursePlanner} from './course-planner.mjs?v=20261027-lodging';
import {icon} from './icons.mjs?v=20261007-no-family-history';
import {located,milesBetween,routePosition} from './course-geometry.mjs';
import {matchesContactSearch} from './contact-search.mjs?v=20261021';
const e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const knownLodging=c=>!c.archived&&(c.lodging==='Available'||c.rv==='Available');
export const lodgingCategories=c=>[...(c.lodging==='Available'?['Missions house']:[]),...(c.rv==='Available'?['RV hookups']:[])];
export function lodgingResults(contacts,{query='',kind='',center=null,radius=50,course=null}={}){
 return contacts.filter(knownLodging).filter(c=>!kind||lodgingCategories(c).includes(kind))
 .filter(c=>matchesContactSearch(c,query,[],[])||query&&String(c.lodgingNotes||'').toLowerCase().includes(query.toLowerCase()))
 .map(c=>({...c,distance:center&&located(c)?milesBetween(center,c):null,position:course?.coordinates&&located(c)?routePosition(c,course.coordinates):null}))
 .filter(c=>!center||c.distance!==null&&c.distance<=radius)
 .filter(c=>!course||c.position&&c.position.off<=(course.corridor||25))
 .sort((a,b)=>course?a.position.along-b.position.along:center?a.distance-b.distance:String(a.city||'').localeCompare(String(b.city||'')));
}
export function lodgingFields(c){
 const select=(label,key,values)=>`<label>${label}<select name="${key}">${values.map(v=>`<option ${c[key]===v?'selected':''}>${e(v==='Available'?'Yes':v==='Unavailable'?'No':'Not set')}</option>`).join('')}</select></label>`;
 return `<details class="details lodging-edit"><summary>Lodging</summary>${select('Missions house','lodging',['Unknown','Available','Unavailable'])}<input type="hidden" name="lodgingType" value="Missions house">${select('RV hookups','rv',['Unknown','Available','Unavailable'])}<label>Lodging details<textarea name="lodgingNotes" placeholder="Call ahead, family welcome, separate address…">${e(c.lodgingNotes||'')}</textarea></label><label>Last confirmed<input name="lodgingConfirmed" type="date" value="${e(c.lodgingConfirmed||'')}"></label></details>`;
}
export function lodgingActions(c,phoneNumbers=[]){
 const name=c.pastor||c.church||'contact',phone=String(phoneNumbers[0]||'').replace(/[^+\d]/g,'');
 return `<div class="lodging-actions" role="group" aria-label="${e(name)} actions"><button type="button" class="secondary" data-lodging-open="${e(c.id)}" aria-label="Open contact for ${e(name)}" title="Open contact">${icon('person')}</button>${phone?`<a class="secondary" href="tel:${e(phone)}" aria-label="Call ${e(name)}" title="Call">${icon('call')}</a><a class="secondary" href="sms:${e(phone)}" aria-label="Text ${e(name)}" title="Text">${icon('text')}</a>`:''}</div>`;
}
export function openLodging(api){
 let map=null,markers=null,markerRenderer=null,routeLine=null,drawVersion=0,center=null,course=null,query='',kind='',radius=50;
 function destroy(){drawVersion++;const previous=map;map=null;markers=null;markerRenderer=null;routeLine=null;if(previous)try{previous.remove();}catch(error){console.warn('Relay lodging map cleanup failed.',error);}}
 function open(){
  destroy();api.openSheet('Places to stay',`<div id="lodging-view"><div class="lodging-tools"><button type="button" class="secondary" id="lodging-browse">Browse all</button><button type="button" class="secondary" id="lodging-near">Near a place</button><button type="button" class="secondary" id="lodging-route">Along a route</button></div><label class="search"><input id="lodging-query" aria-label="Search places to stay" placeholder="Name, church, city, state…" value="${e(query)}"></label><label class="lodging-kind">Lodging type<select id="lodging-kind"><option value="">All lodging</option>${['Missions house','RV hookups'].map(v=>`<option ${kind===v?'selected':''}>${e(v)}</option>`).join('')}</select></label><div class="course-map-legend"><span><i class="map-key manifest-key"></i>Manifest</span><span><i class="map-key voyage-key"></i>Voyage</span></div><p class="tiny subtle">Recorded lodging offers · contact the host for availability.</p><button type="button" class="plain-btn" id="lodging-expand">Expand map</button><div id="lodging-map" class="course-map"></div><p id="lodging-status" role="status" class="small subtle"></p><div id="lodging-list" class="stack"></div></div>`);
  const host=document.querySelector('#lodging-view');host.querySelector('#lodging-query').oninput=event=>{query=event.target.value;render();};
  host.querySelector('#lodging-kind').onchange=event=>{kind=event.target.value;render();};
  host.querySelector('#lodging-browse').onclick=()=>{center=null;course=null;query='';kind='';host.querySelector('#lodging-query').value='';host.querySelector('#lodging-kind').value='';render();};
  host.querySelector('#lodging-near').onclick=near;
  host.querySelector('#lodging-route').onclick=()=>{destroy();openCoursePlanner({initialMode:'route',lodging:true,openSheet:api.openSheet,closeSheet:api.closeSheet,contacts:()=>api.contacts().filter(knownLodging),states:api.states,onNearby:near,onSave:async value=>{if(value.mode!=='route')throw Error('Choose Along my route for a lodging route search.');course=value;center=null;open();return true;}});};
  host.querySelector('#lodging-expand').onclick=event=>{const expanded=host.closest('dialog').classList.toggle('course-map-expanded');event.target.textContent=expanded?'Reduce map':'Expand map';setTimeout(()=>map?.invalidateSize(),60);};
  host.closest('dialog').addEventListener('close',destroy,{once:true});render();
 }
 function render(){
  const host=document.querySelector('#lodging-view');if(!host)return;const all=api.contacts().filter(knownLodging),rows=lodgingResults(all,{query,kind,center,radius,course});
  for(const [id,active] of [['browse',!center&&!course],['near',!!center],['route',!!course]])host.querySelector('#lodging-'+id).setAttribute('aria-pressed',String(active));
  host.querySelector('#lodging-status').textContent=`${rows.length} place${rows.length===1?'':'s'}${center?' · within '+radius+' mi of '+center.name+' (straight-line distance)':course?' · in route order':''}${rows.some(c=>!located(c))?' · some addresses need map coordinates':''}`;
  host.querySelector('#lodging-list').innerHTML=rows.length?rows.map(c=>`<article class="panel lodging-card"><small class="${c.wing==='manifest'?'blue':'gold'}">${c.wing==='manifest'?'Manifest':'Voyage'} · ${e(lodgingCategories(c).join(' · '))}</small><h3>${e(c.pastor||c.church)}</h3><p>${e(c.church)}<br>${e([c.city,c.state].filter(Boolean).join(', '))}</p>${c.distance!==null?`<p class="gold small">${c.distance.toFixed(1)} mi away</p>`:''}${c.position?`<p class="gold small">About ${c.position.off.toFixed(1)} mi from route · ${Math.round(c.position.along)} mi along</p>`:''}${c.lodgingNotes?`<p class="lodging-notes">${renderNote(c.lodgingNotes)}</p>`:''}<p class="tiny subtle">${c.lodgingConfirmed?'Last confirmed '+e(c.lodgingConfirmed):'Previously recorded · confirmation date not set'}${!located(c)?' · not mapped':''}</p>${lodgingActions(c,api.phones(c))}</article>`).join(''):'<div class="empty"><h3>No recorded places here</h3><span class="small">Add lodging in a contact’s Edit screen, or broaden the search.</span></div>';
  host.querySelectorAll('[data-lodging-open]').forEach(button=>button.onclick=()=>{api.closeSheet();api.onOpen(button.dataset.lodgingOpen);});
  draw(rows,host);
 }
 async function draw(rows,host){
  const version=++drawVersion;
  try{
   const L=await loadCourseMaps();if(version!==drawVersion||!host.isConnected||!host.closest('dialog')?.open)return;
   if(!map){map=L.map(host.querySelector('#lodging-map'),{minZoom:1,maxZoom:18,scrollWheelZoom:false,preferCanvas:true});addRelayBasemap(L,map);markers=L.layerGroup().addTo(map);markerRenderer=L.svg();}
   map.closePopup();markers.clearLayers();if(routeLine){map.removeLayer(routeLine);routeLine=null;}
   const points=[];
   for(const c of rows.filter(located)){
    const point=[Number(c.lat),Number(c.lng)];points.push(point);
    const marker=L.circleMarker(point,{renderer:markerRenderer,className:'lodging-map-pin',radius:7,color:'#fff',weight:1.5,fillColor:c.wing==='manifest'?'#4f9fe8':'#d8ad63',fillOpacity:.95}).addTo(markers);
    const card=document.createElement('div');card.className='course-map-card';
    const title=document.createElement('strong');title.textContent=c.pastor||c.church;
    const detail=document.createElement('div');detail.textContent=[c.church,c.city,c.state].filter(Boolean).join(' · ');
    const button=document.createElement('button');button.type='button';button.className='lodging-popup-open';button.innerHTML=icon('person');button.setAttribute('aria-label','Open contact for '+(c.pastor||c.church));button.title='Open contact';button.onclick=()=>{api.closeSheet();api.onOpen(c.id);};const category=document.createElement('small');category.textContent=lodgingCategories(c).join(' · ');card.append(title,detail,category,button);marker.bindPopup(card);
    const element=marker.getElement();if(element){element.setAttribute('role','button');element.setAttribute('tabindex','0');element.setAttribute('aria-label','Show lodging for '+(c.pastor||c.church));element.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();marker.openPopup();}});}
   }
   if(course)routeLine=L.polyline(course.coordinates.map(([lng,lat])=>[lat,lng]),{color:'#69b6e5',weight:3}).addTo(map);
   if(points.length)map.fitBounds(L.latLngBounds(points),{padding:[25,25],maxZoom:11});else map.setView(center?[center.lat,center.lng]:[38,-97],center?8:4);
  }catch(error){console.warn('Relay lodging map unavailable.',error);destroy();if(host.isConnected)host.querySelector('#lodging-status').textContent+=' · Map unavailable; the list is still usable.';}
 }
 function near(){
  destroy();api.openSheet('Lodging near a place',`<button type="button" id="lodging-back" class="plain-btn" aria-label="Back to places to stay" title="Back to places to stay">${icon('back')}</button><form id="lodging-place" class="form"><label>City<input name="city" required placeholder="City name"></label><label>Search radius (miles)<select name="radius"><option>25</option><option selected>50</option><option>100</option><option>200</option></select></label><button class="primary wide">Find city</button><p role="status"></p><small class="course-credit">City lookup: Open-Meteo / GeoNames</small></form>`);
  document.querySelector('#lodging-back').onclick=open;
  const form=document.querySelector('#lodging-place');form.onsubmit=async event=>{event.preventDefault();event.stopPropagation();const status=form.querySelector('[role=status]'),button=form.querySelector('button');button.disabled=true;status.textContent='Finding cities…';try{const res=await fetch('https://geocoding-api.open-meteo.com/v1/search?countryCode=US&count=10&language=en&name='+encodeURIComponent(form.elements.city.value.split(',')[0].trim()),{signal:AbortSignal.timeout(12000)});if(!res.ok)throw Error();const cities=((await res.json()).results||[]).filter(c=>c.country_code==='US'&&c.feature_code?.startsWith('PPL'));status.innerHTML='';if(!cities.length){status.textContent='No matching city. Try another name.';return;}for(const city of cities){const choose=document.createElement('button');choose.type='button';choose.className='secondary wide';choose.textContent=city.name+', '+city.admin1;choose.onclick=()=>{center={lat:city.latitude,lng:city.longitude,name:choose.textContent};radius=Number(form.elements.radius.value);course=null;open();};status.append(choose);}}catch{status.textContent='City lookup unavailable. Try again.';}finally{button.disabled=false;}};
 }
 open();
}
import {renderNote} from './note-format.mjs?v=20261022-lists';
import {addRelayBasemap} from './map-style.mjs?v=20261027-lodging';
