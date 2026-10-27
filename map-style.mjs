// Free vector basemap, styled for Relay. No keys, accounts or Apple services.
let rendererPromise,stylePromise;
export function addStateBoundaries(L,map,states){
 if(!Array.isArray(states?.features)||!states.features.length)return null;
 return L.geoJSON(states,{interactive:false,bubblingMouseEvents:false,style:{color:'#cbd8ed',weight:1.8,opacity:1,dashArray:'6 4',fill:false}}).addTo(map);
}
function script(src){return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=()=>{s.remove();reject(Error('Map renderer unavailable'));};document.head.append(s);});}
export function iosMapStyle(source){
 const style=structuredClone(source);
 for(const layer of style.layers){
  const p=layer.paint??={},id=layer.id;
  if(layer.type==='background')p['background-color']='#24282e';
  if(layer.type==='fill'){
   if(id==='water')p['fill-color']='#101e30';
   else if(/park|wood/.test(id))p['fill-color']='#253c33';
   else if(id==='landuse_residential')p['fill-color']='#2a2e34';
   else if(id==='building'){p['fill-color']='#363a41';p['fill-outline-color']='#424750';}
   else p['fill-color']='#2c3036';
  }
  if(layer.type==='line'){
   if(id==='waterway')p['line-color']='#19324c';
   else if(/motorway.*inner|motorway_subtle/.test(id)){p['line-color']='#756b58';p['line-opacity']=.32;}
   else if(/motorway.*casing/.test(id)){p['line-color']='#4b473f';p['line-opacity']=.25;}
   else if(/highway_major_inner/.test(id))p['line-color']='#686d76';
   else if(/highway_major_casing|highway_minor/.test(id))p['line-color']='#42474f';
   else if(/boundary/.test(id)){p['line-color']='#e5edf9';p['line-dasharray']=[5,2];p['line-opacity']=1;p['line-width']=['interpolate',['linear'],['zoom'],3,1.6,7,2.2,12,2.8];}
   else p['line-color']='#414751';
  }
  if(layer.type==='symbol'&&p['text-color']){
   p['text-color']=/water/.test(id)?'#7899be':/state|country/.test(id)?'#a3a9b3':'#e0e3e8';
   p['text-halo-color']='#25292f';p['text-halo-width']=1.2;
  }
  layer.paint=p;
 }
 return style;
}
function renderer(){return rendererPromise??=(async()=>{
 const link=document.createElement('link');link.rel='stylesheet';link.href='https://unpkg.com/maplibre-gl@5.6.2/dist/maplibre-gl.css';document.head.append(link);
 await script('https://unpkg.com/maplibre-gl@5.6.2/dist/maplibre-gl.js');
 await script('https://unpkg.com/@maplibre/maplibre-gl-leaflet@0.0.22/leaflet-maplibre-gl.js');
})().catch(error=>{rendererPromise=null;throw error;});}
export function addRelayBasemap(L,map){
 // Canvas paths need a viewport before adding the shared state outlines.
 // Otherwise Leaflet throws while clipping paths and leaves a half-built map.
 if(!Number.isFinite(map.getZoom()))map.setView([38,-97],4,{animate:false});
 // Basemap boundary layers do not consistently include US states at broad
 // zooms. Draw our existing state geometry on every map, including fallback.
 addStateBoundaries(L,map,window.statesData);
 let layer,disposed=false,usingFallback=false,timer;
 const fallback=()=>{if(disposed||usingFallback||!map.getContainer().isConnected)return;usingFallback=true;map.getContainer().classList.add('map-raster-fallback');if(layer){map.removeLayer(layer);layer=null;}L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'}).addTo(map);clearTimeout(timer);};
 map.on('unload',()=>{disposed=true;clearTimeout(timer);});
 timer=setTimeout(fallback,30000);
 Promise.all([renderer(),stylePromise??=fetch('https://tiles.openfreemap.org/styles/positron').then(r=>{if(!r.ok)throw Error('Map style unavailable');return r.json();}).then(iosMapStyle).catch(error=>{stylePromise=null;throw error;})]).then(([,style])=>{
  if(disposed||usingFallback||!map.getContainer().isConnected)return;
  clearTimeout(timer);
  layer=L.maplibreGL({style,attribution:'<a href="https://openfreemap.org/">OpenFreeMap</a> © <a href="https://openmaptiles.org/">OpenMapTiles</a> · <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'}).addTo(map);
  const gl=layer.getMaplibreMap();timer=setTimeout(fallback,15000);gl.once('load',()=>clearTimeout(timer));
 }).catch(error=>{console.warn('Relay vector map unavailable; using standard map.',error);fallback();});
}
