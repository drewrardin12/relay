// Display only recognized status values; legacy dates are not availability evidence.
export function amenityStatus(value){
 const text=String(value??'').trim();
 return ['Available','Unavailable','Unknown','Yes','No'].includes(text)?text:'Unknown';
}

export const QUICK_AMENITIES=Object.freeze({lodging:{name:'Missions house',icon:'bed'},rv:{name:'RV hookups',icon:'rv'}});
const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export function amenityAnswer(value){const status=amenityStatus(value);return ['Available','Yes'].includes(status)?'yes':['Unavailable','No'].includes(status)?'no':'';}
export function amenityPatch(key,answer){
 if(!Object.hasOwn(QUICK_AMENITIES,key)||!['yes','no'].includes(answer))throw Error('Choose Yes or No for Missions house or RV hookups.');
 return {[key]:answer==='yes'?'Available':'Unavailable',...(key==='lodging'&&answer==='yes'?{lodgingType:'Missions house'}:{})};
}
export function amenityTile(c,key,icon){
 const meta=QUICK_AMENITIES[key];if(!meta)return '';
 const answer=amenityAnswer(c[key]),label=answer==='yes'?'Yes':answer==='no'?'No':'Not set';
 return `<button type="button" class="panel mini-panel amenity-editable ${answer==='yes'?'amenity-available amenity-'+key:''}" data-action="amenity-choice" data-id="${escape(c.id)}" data-amenity="${key}" aria-label="${escape(meta.name)}: ${label}. Change availability" title="Change ${escape(meta.name.toLowerCase())}">${icon(meta.icon)}<span class="amenity-edit-mark" aria-hidden="true">${icon('edit')}</span><h3>${meta.name}</h3><p><span class="dot ${answer==='yes'?'green':answer==='no'?'pink':'unknown'}"></span>${label}</p></button>`;
}
export function amenityChoice(c,key,icon){
 const meta=QUICK_AMENITIES[key];if(!meta)return '';
 const answer=amenityAnswer(c[key]);
 return `<div class="amenity-choice"><p class="small subtle">${escape([c.pastor,c.church].filter(Boolean).join(' · '))}</p><div class="amenity-answers" role="group" aria-label="${meta.name} availability">${['yes','no'].map(value=>`<button type="button" class="secondary amenity-answer ${value==='yes'?'amenity-'+key:''}" data-action="set-amenity" data-id="${escape(c.id)}" data-amenity="${key}" data-answer="${value}" aria-pressed="${answer===value}">${icon(value==='yes'?'check':'close')}<span>${value==='yes'?'Yes':'No'}</span></button>`).join('')}</div></div>`;
}
