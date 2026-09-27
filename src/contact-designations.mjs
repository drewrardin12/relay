import {VOYAGE_ONLY_IDS} from './contact-corrections.mjs';
export const CONTACT_TYPES=['Pastor / church','Friends & family','Personal contact','Individual donor','Organization'];
const personalIds=new Set(['mfst-debbie-netterville','mfst-isaiah-hanson','mfst-jerrod-montgomery','mfst-jorge-villafranca','mfst-keith-putnam']);
const individualDonors=new Set(['David Nymeyer','Darcy Higgins','M. Jackson','Jesse Burnette']);
export function missingDonorEmails(contacts){return contacts.filter(c=>individualDonors.has(String(c.givingDonorLabel||c.pastor||'').trim())&&!([c.email,c.church_email].flatMap(v=>Array.isArray(v)?v:String(v||'').split(/[\n;,]/)).some(v=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v).trim()))));}
const normalize=v=>String(v||'').toLowerCase().replace(/\bbc\b/g,'baptist church').replace(/\bchurch\b/g,'').replace(/[^a-z0-9]/g,'');
function donorParts(label){const [name,place]=label.split('|');const parens=name.match(/^(.*?)\s*\((.*)\)$/);const location=place||parens?.[2]||'';const [city,state]=location.split(',').map(v=>v.trim());return {church:(parens?.[1]||name).trim(),city:city||'',state:state||''};}
export function reconcileContactDesignations(state){
 for(const c of state.contacts){
  if(personalIds.has(c.id)&&!c.designationReviewed){c.contactType='Personal contact';c.supportStatus='Non-supporting';c.designationReviewed=true;c.wing='manifest';}
 }
 for(const gift of state.gifts){
  let c=state.contacts.find(c=>c.id===gift.contactId);
  const label=String(gift.donor||gift.church_name||'').trim();
  if(!c&&label){
   const named=state.contacts.filter(c=>[c.pastor,c.church].some(n=>n&&n.trim().toLowerCase()===label.toLowerCase()));
   if(named.length===1)c=named[0];
   const churchDonor=/baptist|\bbc\b|church|iglesia|tabernacle/i.test(label),parts=donorParts(label);
   if(!c&&churchDonor){
    const matches=state.contacts.filter(c=>normalize(c.church)===normalize(parts.church)&&(!parts.city||normalize(c.city?.split(',')[0])===normalize(parts.city))&&(!parts.state||normalize(c.state)===normalize(parts.state)));
    const established=matches.filter(c=>c.wing==='manifest');
    if(established.length===1)c=established[0];else if(matches.length===1)c=matches[0];
    else if(parts.city&&parts.state&&matches.length)c=established.find(c=>c.id.startsWith('mfst-'))||established[0]||matches[0];
   }
   if(!c&&!/anonymous/i.test(label)&&(churchDonor||individualDonors.has(label)||label==='Washington County Gospel Enterprises Inc')){
    const contactType=churchDonor?'Pastor / church':individualDonors.has(label)?'Individual donor':'Organization';
    c=state.contacts.find(c=>c.givingDonorLabel===label);
    if(!c){c={id:'donor-'+label.toLowerCase().replace(/[^a-z0-9]+/g,'-'),pastor:churchDonor?'':label,church:churchDonor?parts.church:'',contactType,wing:'manifest',phone:[],email:[],city:churchDonor?parts.city:'',state:churchDonor?parts.state:'',address:'',supportStatus:'Non-supporting',givingDonorLabel:label,donorIdentityNeedsReview:true,notes:'Added from giving history. Donor identity, contact details and ongoing support commitment need confirmation.',groups:[],relayGroup:null};
    state.contacts.push(c);
    }
   }
   if(c)gift.contactId=c.id;
  }
  if(c&&!VOYAGE_ONLY_IDS.has(c.id))c.wing='manifest';
 }
 for(const c of state.contacts){
  const donorName=String(c.givingDonorLabel||c.pastor||'').trim();
  if(individualDonors.has(donorName)&&!c.individualSupportReviewed){
   c.contactType='Individual donor';c.wing='manifest';c.supportStatus='Supporting';c.emailList=true;c.individualSupportReviewed=true;c.donorIdentityNeedsReview=false;
   c.notes=String(c.notes||'').replace('Added from giving history. Donor identity, contact details and ongoing support commitment need confirmation.','Supporting individual donor confirmed. Include in the email list; contact details still need to be entered.');
  }
  if(donorName==='Washington County Gospel Enterprises Inc'&&!c.oneTimeGiftReviewed){
   c.contactType='Organization';c.supportStatus='Non-supporting';c.oneTimeGiftReviewed=true;c.donorIdentityNeedsReview=false;
   c.notes=String(c.notes||'').replace('Added from giving history. Donor identity, contact details and ongoing support commitment need confirmation.','Organization recorded for a one-time gift; no ongoing support commitment.');
  }
 }
 return state;
}
export function directoryEligible(c,showNoNumbers,phones,emails){return showNoNumbers||phones(c).length>0||emails(c).length>0||(c.wing==='manifest'&&(c.givingDonorLabel||(c.contactType&&c.contactType!=='Pastor / church')));}
