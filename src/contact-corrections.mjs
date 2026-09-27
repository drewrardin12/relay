import {CALENDAR_MEETINGS} from './calendar-meetings.mjs';
const keeperId='mfst-brian-petrick';
export const VOYAGE_ONLY_IDS=new Set(['abilene-baptist-church-abilene-tx','central-baptist-church-amarillo-tx','mfst-ken-koske','donor-hope-baptist-church-robins-ia-']);
const identity=v=>String(v||'').toLowerCase().replace(/[^a-z0-9]/g,'');
export const REVIEWED_CROSS_WING_MERGES=[
 ['center-tx','mfst-sandy-little'],
 ['first-baptist-church-of-clinton-clinton-il','mfst-jonathan-roberson'],
 ['galesburg-il','mfst-darrell-grimm'],
 ['greenwood-bible-baptist-church-greenwood-in-in','mfst-matthew-poynter'],
 ['johnstown-pa','mfst-nic-salvione'],
 ['will-county-baptist-church-joliet-il','mfst-dale-steenhoven'],
 ['la-porte-tx','mfst-danny-traxler'],
 ['the-welcome-hill-missionary-baptist-church-lemont-il','mfst-j24fu5ed0fempwwrzle'],
 ['linton-in','mfst-john-riker'],
 ['livingston-tx','mfst-kerry-baxley'],
 ['martville-ny','mfst-caleb-kinney'],
 ['rantoul-il','mfst-mark-wilkerson'],
 ['roseville-il','mfst-chris-cunningham'],
 ['antioch-baptist-church-harlem-ga','mfst-david-ga-young'],
 ['harlem-ga','mfst-david-ga-young'],
 ['bible-baptist-church-sandusky-oh','mfst-david-oh-young'],
 ['solid-rock-baptist-church-bellefontaine-oh','mfst-jim-frost'],
 ['calvary-baptist-church-campbell-mo','mfst-josh-lovens'],
 ['gospel-way-baptist-church-grand-junction-co','mfst-jacob-reitz'],
 ['metropolitan-baptist-church-fort-worth-tx','mfst-patrick-bujak'],
 ['lake-worth-tx','mfst-patrick-bujak'],
 ['tabernacle-baptist-church-lebanon-mo','mfst-don-ball'],
 ['first-texas-indian-baptist-church-livingston-tx','mfst-kerry-baxley'],
 ['washington-county-baptist-tabernacle-salem-in-in','mfst-robert-patenaude'],
 ['immanuel-baptist-church-syracuse-ny','mfst-2sh1snujdlempmtblh2'],
 ['woodland-hills-baptist-church-tyler-tx','mfst-danny-reynolds'],
 ['central-baptist-church-decatur-il','mfst-oc9x3e3vwtmpppu0um',false],
 ['calvary-baptist-church-linton-in-in','mfst-john-riker',false]
];
export function consolidateReviewedCrossWingContacts(state){
 for(const [duplicateId,keeperId,mergeDetails=true] of REVIEWED_CROSS_WING_MERGES){
  const duplicate=state.contacts.find(c=>c.id===duplicateId),keeper=state.contacts.find(c=>c.id===keeperId);
  // A duplicate may already have been removed by an earlier app version while
  // rows in another collection still reference its old ID.  The reviewed ID
  // mapping remains authoritative, so repair those links whenever the keeper
  // exists, even if there is no duplicate contact left to merge.
  if(!keeper)continue;
  if(duplicate&&mergeDetails){
   for(const key of ['email','phone','cell','church_email']){
    const values=v=>Array.isArray(v)?v:String(v||'').split(/[\n;,]/).map(s=>s.trim()).filter(Boolean);
    keeper[key]=[...new Set([...values(keeper[key]),...values(duplicate[key])])];
   }
   if(!keeper.address&&duplicate.address){keeper.address=duplicate.address;keeper.lat=duplicate.lat;keeper.lng=duplicate.lng;}
   if(duplicate.notes&&!String(keeper.notes||'').includes(duplicate.notes))keeper.notes=[keeper.notes,duplicate.notes].filter(Boolean).join('\n');
   keeper.starred=Boolean(keeper.starred||duplicate.starred);
  }
  for(const key of ['logs','meetings','events','tides','gifts'])for(const row of state[key]||[]){if(row.contactId===duplicateId)row.contactId=keeperId;if(row.manifestId===duplicateId)row.manifestId=keeperId;}
  for(const row of CALENDAR_MEETINGS)if(row.contactId===duplicateId)row.contactId=keeperId;
  if(state.calendarReview)for(const row of state.calendarReview.visits||[]){if(row.contactId===duplicateId)row.contactId=keeperId;if(row.manifestId===duplicateId)row.manifestId=keeperId;}
  if(state.recents)state.recents=[...new Set(state.recents.map(id=>id===duplicateId?keeperId:id))];
  if(state.course){if(state.course.anchorId===duplicateId)state.course.anchorId=keeperId;if(state.course.lastId===duplicateId)state.course.lastId=keeperId;}
  if(duplicate)state.contacts=state.contacts.filter(c=>c.id!==duplicateId);
 }
 return state;
}
export function exactCrossWingDuplicates(state){
 return state.contacts.filter(c=>c.wing==='voyage'&&!VOYAGE_ONLY_IDS.has(c.id)&&c.church&&c.pastor).flatMap(c=>{
  const matches=state.contacts.filter(m=>m.wing==='manifest'&&identity(m.church)===identity(c.church)&&identity(m.pastor)===identity(c.pastor)&&identity(m.city?.split(',')[0])===identity(c.city?.split(',')[0])&&identity(m.state)===identity(c.state));
  return matches.length===1?[{duplicate:c,keeper:matches[0]}]:[];
 });
}
export function consolidateExactDuplicates(state){
 for(const {duplicate,keeper} of exactCrossWingDuplicates(state)){
  for(const key of ['email','phone','cell','church_email']){const values=v=>Array.isArray(v)?v:String(v||'').split(/[\n;]/).map(s=>s.trim()).filter(Boolean);keeper[key]=[...new Set([...values(keeper[key]),...values(duplicate[key])])];}
  if(!keeper.address&&duplicate.address){keeper.address=duplicate.address;keeper.lat=duplicate.lat;keeper.lng=duplicate.lng;}
  if(duplicate.notes&&!String(keeper.notes||'').includes(duplicate.notes))keeper.notes=[keeper.notes,duplicate.notes].filter(Boolean).join('\n');
  for(const key of ['logs','meetings','events','tides','gifts'])for(const row of state[key]||[]){if(row.contactId===duplicate.id)row.contactId=keeper.id;if(row.manifestId===duplicate.id)row.manifestId=keeper.id;}
  for(const row of CALENDAR_MEETINGS)if(row.contactId===duplicate.id)row.contactId=keeper.id;
  if(state.recents)state.recents=[...new Set(state.recents.map(id=>id===duplicate.id?keeper.id:id))];
  if(state.course){if(state.course.anchorId===duplicate.id)state.course.anchorId=keeper.id;if(state.course.lastId===duplicate.id)state.course.lastId=keeper.id;}
  state.contacts=state.contacts.filter(c=>c.id!==duplicate.id);
 }
 return state;
}
export function correctVoyageOnlyChurches(state){
 const parker=state.contacts.find(c=>c.id==='mfst-richard-parker')||state.contacts.find(c=>c.id==='port-st-lucie-fl');
 if(parker){
  VOYAGE_ONLY_IDS.add(parker.id);parker.wing='voyage';parker.pastor='Richard Parker';parker.donorIdentityNeedsReview=false;
  const duplicates=state.contacts.filter(c=>c.id!==parker.id&&(c.id==='mfst-richard-parker'||c.id==='port-st-lucie-fl'||c.givingDonorLabel==='Palm Beach Gardens Baptist | Port ST Lucie, FL'));
  const ids=new Set(duplicates.map(c=>c.id));
  for(const c of duplicates){for(const key of ['email','phone','cell','church_email']){const values=v=>Array.isArray(v)?v:String(v||'').split(/[\n;]/).map(s=>s.trim()).filter(Boolean);parker[key]=[...new Set([...values(parker[key]),...values(c[key])])];}if(c.notes&&!String(parker.notes||'').includes(c.notes))parker.notes=[parker.notes,c.notes].filter(Boolean).join('\n');}
  for(const key of ['logs','meetings','events','tides','gifts'])for(const row of state[key]||[]){if(ids.has(row.contactId))row.contactId=parker.id;if(ids.has(row.manifestId))row.manifestId=parker.id;}
  for(const gift of state.gifts||[])if((gift.donor||gift.church_name)==='Palm Beach Gardens Baptist | Port ST Lucie, FL')gift.contactId=parker.id;
  for(const row of CALENDAR_MEETINGS)if(ids.has(row.contactId))row.contactId=parker.id;
  if(state.recents)state.recents=[...new Set(state.recents.map(id=>ids.has(id)?parker.id:id))];
  if(state.course){if(ids.has(state.course.anchorId))state.course.anchorId=parker.id;if(ids.has(state.course.lastId))state.course.lastId=parker.id;}
  state.contacts=state.contacts.filter(c=>!ids.has(c.id));
 }
 const winkle=state.contacts.find(c=>c.id==='mfst-chris-winkle')||state.contacts.find(c=>c.id==='bible-baptist-church-of-rendon-fort-worth-tx');
 if(winkle){
  VOYAGE_ONLY_IDS.add(winkle.id);winkle.wing='voyage';winkle.pastor='Chris Winkle';winkle.donorIdentityNeedsReview=false;
  const duplicates=state.contacts.filter(c=>c.id!==winkle.id&&(c.id==='mfst-chris-winkle'||c.id==='bible-baptist-church-of-rendon-fort-worth-tx'||c.givingDonorLabel==='Bible Baptist | Fort Worth,TX'));
  const ids=new Set(duplicates.map(c=>c.id));
  for(const c of duplicates){for(const key of ['email','phone','cell','church_email']){const values=v=>Array.isArray(v)?v:String(v||'').split(/[\n;]/).map(s=>s.trim()).filter(Boolean);winkle[key]=[...new Set([...values(winkle[key]),...values(c[key])])];}if(c.notes&&!String(winkle.notes||'').includes(c.notes))winkle.notes=[winkle.notes,c.notes].filter(Boolean).join('\n');}
  for(const key of ['logs','meetings','events','tides','gifts'])for(const row of state[key]||[]){if(ids.has(row.contactId))row.contactId=winkle.id;if(ids.has(row.manifestId))row.manifestId=winkle.id;}
  for(const gift of state.gifts||[])if((gift.donor||gift.church_name)==='Bible Baptist | Fort Worth,TX')gift.contactId=winkle.id;
  for(const row of CALENDAR_MEETINGS)if(ids.has(row.contactId))row.contactId=winkle.id;
  if(state.recents)state.recents=[...new Set(state.recents.map(id=>ids.has(id)?winkle.id:id))];
  if(state.course){if(ids.has(state.course.anchorId))state.course.anchorId=winkle.id;if(ids.has(state.course.lastId))state.course.lastId=winkle.id;}
  state.contacts=state.contacts.filter(c=>!ids.has(c.id));
 }
 const mendoza=state.contacts.find(c=>c.id==='mfst-francisco-mendoza')||state.contacts.find(c=>c.id==='iglesia-bautista-fundamental-emanuel-dallas-tx');
 if(mendoza){
  VOYAGE_ONLY_IDS.add(mendoza.id);mendoza.wing='voyage';mendoza.donorIdentityNeedsReview=false;
  const duplicates=state.contacts.filter(c=>c.id!==mendoza.id&&(c.id==='iglesia-bautista-fundamental-emanuel-dallas-tx'||c.id==='mfst-francisco-mendoza'||c.givingDonorLabel==='Iglesia Bautista Fundamental Emanuel | Mesquite, TX'));
  const ids=new Set(duplicates.map(c=>c.id));
  for(const c of duplicates)for(const key of ['email','phone','cell','church_email']){const values=v=>Array.isArray(v)?v:String(v||'').split(/[\n;]/).map(s=>s.trim()).filter(Boolean);mendoza[key]=[...new Set([...values(mendoza[key]),...values(c[key])])];}
  for(const key of ['logs','meetings','events','tides','gifts'])for(const row of state[key]||[]){if(ids.has(row.contactId))row.contactId=mendoza.id;if(ids.has(row.manifestId))row.manifestId=mendoza.id;}
  for(const gift of state.gifts||[])if((gift.donor||gift.church_name)==='Iglesia Bautista Fundamental Emanuel | Mesquite, TX')gift.contactId=mendoza.id;
  for(const row of CALENDAR_MEETINGS)if(ids.has(row.contactId))row.contactId=mendoza.id;
  if(state.recents)state.recents=[...new Set(state.recents.map(id=>ids.has(id)?mendoza.id:id))];
  if(state.course){if(ids.has(state.course.anchorId))state.course.anchorId=mendoza.id;if(ids.has(state.course.lastId))state.course.lastId=mendoza.id;}
  state.contacts=state.contacts.filter(c=>!ids.has(c.id));
 }
 const hope=state.contacts.find(c=>c.id==='mfst-ken-koske');
 if(hope){hope.pastor='Ken Koske';hope.church='Hope Baptist Church';hope.city='Robins';hope.state='IA';hope.wing='voyage';hope.donorIdentityNeedsReview=false;
  const duplicate=state.contacts.find(c=>c.id!==hope.id&&(c.givingDonorLabel==='Hope Baptist Church (Robins, IA)'||c.id==='donor-hope-baptist-church-robins-ia-'));
  if(duplicate){for(const key of ['logs','meetings','events','tides','gifts'])for(const row of state[key]||[]){if(row.contactId===duplicate.id)row.contactId=hope.id;if(row.manifestId===duplicate.id)row.manifestId=hope.id;}state.contacts=state.contacts.filter(c=>c.id!==duplicate.id);}
  for(const gift of state.gifts||[])if((gift.donor||gift.church_name)==='Hope Baptist Church (Robins, IA)')gift.contactId=hope.id;
 }
 const rules=[{id:'abilene-baptist-church-abilene-tx',remove:['mfst-avery-barney','m3'],name:'Avery Barney',address:'5601 Hartford St, Abilene, TX 79605'},{id:'central-baptist-church-amarillo-tx',remove:['m2'],name:'Allen Copeland',address:'1601 SW 58th Ave, Amarillo, TX'}];
 for(const rule of rules){
  const keeper=state.contacts.find(c=>c.id===rule.id);if(!keeper)continue;
  const ids=new Set(rule.remove),others=state.contacts.filter(c=>ids.has(c.id));
  for(const c of others){
   for(const key of ['email','phone','cell','church_email']){
    const values=v=>Array.isArray(v)?v:String(v||'').split(/[\n;]/).map(s=>s.trim()).filter(Boolean);
    keeper[key]=[...new Set([...values(keeper[key]),...values(c[key])])];
   }
   if(c.notes&&!String(keeper.notes||'').includes(c.notes))keeper.notes=[keeper.notes,c.notes].filter(Boolean).join('\n');
  }
  keeper.wing='voyage';keeper.pastor=rule.name;
  if(!keeper.voyageCorrectionApplied){keeper.address=rule.address;keeper.voyageCorrectionApplied=true;}
  for(const key of ['logs','meetings','events','tides','gifts'])for(const row of state[key]||[]){if(ids.has(row.contactId))row.contactId=rule.id;if(ids.has(row.manifestId))row.manifestId=rule.id;}
  for(const row of CALENDAR_MEETINGS)if(ids.has(row.contactId))row.contactId=rule.id;
  if(state.calendarReview)for(const row of state.calendarReview.visits||[])if(ids.has(row.contactId))row.contactId=rule.id;
  state.contacts=state.contacts.filter(c=>!ids.has(c.id));
  if(state.recents)state.recents=[...new Set(state.recents.map(id=>ids.has(id)?rule.id:id))];
  if(state.course){if(ids.has(state.course.anchorId))state.course.anchorId=rule.id;if(ids.has(state.course.lastId))state.course.lastId=rule.id;}
 }
 return state;
}
const corrections=[
 {keeper:keeperId,wrong:['m5'],duplicates:['biblical-baptist-church-beach-park-il']},
 {keeper:'mfst-bryan-mcdonald',wrong:['m8'],duplicates:['prarie-view-baptist-church-lake-city-il']},
 {keeper:'mfst-barry-parsons',wrong:['m4'],duplicates:['landmark-baptist-church-haines-city-fl']},
 {keeper:'mfst-1icu1b018fhmppqa74p',wrong:['m6'],duplicates:[]},
 {keeper:'mfst-kbqb03sxmxkmppo5bi3',wrong:['m10'],duplicates:[]},
 {keeper:'mfst-9ks1uw1dodnmpppdu8b',wrong:['m7'],duplicates:[]},
 {keeper:'mfst-aaron-harris',wrong:['m1'],duplicates:[]}
];
export function reviewedPastorRemovals(state){
 const ids=new Set();for(const rule of corrections)if(state.contacts.some(c=>c.id===rule.keeper))for(const id of [...rule.wrong,...rule.duplicates])if(state.contacts.some(c=>c.id===id))ids.add(id);
 return ids;
}
export function correctReviewedPastors(state){
 state.settings||={};
 state.settings.polarstepsUrl||='https://www.polarsteps.com/Rardins/23525524-rardin-travels-2026?s=ab0163a7-54d4-4e7b-a17e-c18e84525cd7&referral=true';
 state.settings.meetingDebriefEnabledAt||='2026-09-20';
 const lodging=(state.calendarMeetings||[]).find(m=>m.id==='ga9qckufo0mh8pd4oap03fkal8');
 if(lodging){lodging.excludeFromStats=true;lodging.classificationConfirmed=true;lodging.classificationNote='Lodging entry overlaps the separate missions conference event.';}
 applyEmailIdentityReviews(state);
 consolidateReviewedCrossWingContacts(state);
 const price=state.contacts.find(c=>c.id==='mfst-ryan-price');
 if(price&&!price.cityReviewApplied){price.city='Oakland Park';price.cityReviewApplied=true;}
 const patenaude=state.contacts.find(c=>c.id==='mfst-robert-patenaude');
 if(patenaude&&!patenaude.locationReviewApplied){patenaude.state='IN';patenaude.locationReviewApplied=true;}
 const curtis=state.contacts.find(c=>c.id==='mfst-jonathan-curtis');
 if(curtis&&!curtis.locationReviewApplied){curtis.city='Evans';curtis.locationReviewApplied=true;}
 const welcome=state.contacts.find(c=>c.id==='mfst-j24fu5ed0fempwwrzle');
 if(welcome&&!welcome.pastorCorrectionApplied){welcome.pastor='';welcome.pastorCorrectionApplied=true;}
 const doug=state.contacts.find(c=>c.id==='mfst-doug-cowen');
 if(doug&&!doug.addressCorrectionApplied){doug.address='5301 Cortez Avenue, Las Cruces, NM';doug.city='Las Cruces';doug.state='NM';doug.lat='';doug.lng='';doug.addressCorrectionApplied=true;}
 for(const rule of corrections){
  const keeper=state.contacts.find(c=>c.id===rule.keeper);if(!keeper)continue;
  keeper.wing='manifest';
  if(rule.keeper==='mfst-bryan-mcdonald')keeper.church='Prairie View Baptist Church';
  const wrong=new Set(rule.wrong),duplicates=new Set(rule.duplicates);
  // Preserve legitimate history from the same-church Voyage copy under Manifest.
  for(const key of ['logs','meetings','events','tides','gifts'])if(Array.isArray(state[key]))state[key]=state[key].filter(row=>!wrong.has(row.contactId)&&!wrong.has(row.manifestId)).map(row=>{
   if(duplicates.has(row.contactId))row.contactId=rule.keeper;
   if(duplicates.has(row.manifestId))row.manifestId=rule.keeper;
   return row;
  });
  state.contacts=state.contacts.filter(c=>!wrong.has(c.id)&&!duplicates.has(c.id));
  if(Array.isArray(state.recents))state.recents=[...new Set(state.recents.filter(id=>!wrong.has(id)).map(id=>duplicates.has(id)?rule.keeper:id))];
  if(state.course&&(wrong.has(state.course.anchorId)||duplicates.has(state.course.anchorId)))state.course.anchorId=rule.keeper;
  if(state.course&&wrong.has(state.course.lastId))state.course.lastId=null;
  else if(state.course&&duplicates.has(state.course.lastId))state.course.lastId=rule.keeper;
 }
 return correctBrianPetrick(state);
}
export function applyEmailIdentityReviews(state){
 const familyRecipients=[
  {names:['olivia putnam'],email:'oliviaputnam14@gmail.com'},
  {names:['jamie putnam'],email:'jput1993@gmail.com'},
  {names:['luke putnam'],email:'gospelman10@gmail.com'},
  {names:['polly putnam','mom putnam','mom'],email:'ppollyb@gmail.com'}
 ];
	 for(const rule of familyRecipients){
  const matches=state.contacts.filter(c=>rule.names.includes(String(c.pastor||c.name||'').trim().toLowerCase()));
  if(matches.length!==1)continue;
  const c=matches[0],values=v=>Array.isArray(v)?v:String(v||'').split(/[\n;,]/).map(x=>x.trim()).filter(Boolean);
  c.email=[...new Set([...values(c.email),rule.email])];c.emailList=true;c.contactType='Friends & family';c.familyRecipientReview20260918=true;
	 }
 const crossroad=state.contacts.find(c=>c.id==='crossroad-baptist-church-fall-branch-tn');
 if(crossroad&&!crossroad.emmanuelEmailRemoved){
  const values=v=>Array.isArray(v)?v:String(v||'').split(/[\n;,]/).map(x=>x.trim()).filter(Boolean);
  crossroad.email=values(crossroad.email).filter(v=>v.toLowerCase()!=='ebcsh@frontier.com');
  crossroad.church_email=values(crossroad.church_email).filter(v=>v.toLowerCase()!=='ebcsh@frontier.com');
  crossroad.emmanuelEmailRemoved=true;
 }
 const ryan=state.contacts.find(c=>c.id==='mfst-ryan-rauhaus');
 const ryanCopy=state.contacts.find(c=>c.id==='landmark-baptist-temple-petoskey-mi-mi');
 if(ryan){
  ryan.wing='manifest';ryan.church='Landmark Baptist Church';
  if(ryanCopy){
   for(const key of ['email','church_email','phone','cell']){const values=v=>Array.isArray(v)?v:String(v||'').split(/[\n;,]/).map(x=>x.trim()).filter(Boolean);ryan[key]=[...new Set([...values(ryan[key]),...values(ryanCopy[key])])];}
   if(!ryan.address&&ryanCopy.address){ryan.address=ryanCopy.address;ryan.lat=ryanCopy.lat;ryan.lng=ryanCopy.lng;}
   if(ryanCopy.notes&&!String(ryan.notes||'').includes(ryanCopy.notes))ryan.notes=[ryan.notes,ryanCopy.notes].filter(Boolean).join('\n');
   for(const rows of [state.logs,state.meetings,state.events,state.tides,state.gifts,state.calendarReview?.visits,CALENDAR_MEETINGS])for(const row of rows||[]){if(row.contactId===ryanCopy.id)row.contactId=ryan.id;if(row.manifestId===ryanCopy.id)row.manifestId=ryan.id;}
   if(state.recents)state.recents=[...new Set(state.recents.map(id=>id===ryanCopy.id?ryan.id:id))];
   if(state.course)for(const key of ['anchorId','lastId'])if(state.course[key]===ryanCopy.id)state.course[key]=ryan.id;
   state.contacts=state.contacts.filter(c=>c.id!==ryanCopy.id);
  }
 }
 const rules=[
  ['mfst-doug-stauffer',{state:'FL'}],
  ['mfst-david-ga-young',{church:'Antioch Baptist Church'}],
  ['mfst-robert-patenaude',{state:'IN'}],
  ['mfst-patrick-bujak',{pastor:'Patrick Bujak',church:'Metropolitan Baptist Church',city:'Fort Worth',state:'TX',address:'6051 Azle Ave, Fort Worth, TX 76135',phone:'(817) 237-2201'}],
  ['mfst-j24fu5ed0fempwwrzle',{pastor:'Unknown Pastor'}],
  ['the-welcome-hill-missionary-baptist-church-lemont-il',{pastor:'Unknown Pastor'}],
  ['mfst-70lzj0gfxsymppq1g8z',{pastor:'John Allen',church:'Emmanuel Baptist Church',city:'Valparaiso',state:'IN',address:'760 McCool Rd, Valparaiso, IN 46383',phone:'(219) 759-3317'}]
 ];
 for(const [id,fields] of rules){const c=state.contacts.find(c=>c.id===id);if(!c||c.emailIdentityReview20260917)continue;
  if(fields.address&&c.address!==fields.address){c.lat='';c.lng='';}
  Object.assign(c,fields);c.emailIdentityReview20260917=true;
  if(id==='mfst-j24fu5ed0fempwwrzle')c.pastorCorrectionApplied=true;
  if(id==='mfst-70lzj0gfxsymppq1g8z')c.email=[...new Set([...(Array.isArray(c.email)?c.email:String(c.email||'').split(/[\n;,]/)).filter(Boolean),'pastor@ebcsh.org','ebcsh@frontier.com'])];
 }
 for(const id of ['mfst-danny-dodson','mfst-sandy-little','center-tx']){const c=state.contacts.find(c=>c.id===id);if(!c||c.centralSuccessionReview)continue;
  const note=id==='mfst-danny-dodson'?'Current pastor: Danny Dodson. Sandy Little is the planned successor but has not taken over.':'Sandy Little is the planned successor at Central Baptist Church, Center, TX; Danny Dodson is still the current pastor.';
  c.notes=[c.notes,note].filter(Boolean).join('\n');c.centralSuccessionReview=true;
 }
 return state;
}
export function brianPetrickRemovals(state){
 if(!state.contacts.some(c=>c.id===keeperId))return new Set();
 return new Set(state.contacts.filter(c=>c.id!==keeperId&&(c.id==='m5'||c.id==='biblical-baptist-church-beach-park-il'||/^brian petrick$/i.test(String(c.pastor||'').trim()))).map(c=>c.id));
}
export function correctBrianPetrick(state){
 const ids=brianPetrickRemovals(state);
 const keeper=state.contacts.find(c=>c.id===keeperId);
 if(!keeper)return state;
 keeper.wing='manifest';
 state.contacts=state.contacts.filter(c=>!ids.has(c.id));
 for(const key of ['logs','meetings','events','tides','gifts'])if(Array.isArray(state[key]))state[key]=state[key].filter(row=>!ids.has(row.contactId)&&!ids.has(row.manifestId));
 if(Array.isArray(state.recents))state.recents=state.recents.filter(id=>!ids.has(id));
 if(state.course&&ids.has(state.course.anchorId))state.course.anchorId=keeperId;
 if(state.course&&ids.has(state.course.lastId))state.course.lastId=null;
 return state;
}
