export const CONTACT_TYPES=['Pastor / church','Friends & family','Personal contact','Individual donor','Organization'];
export const reconcileContactDesignations=s=>s;
export const missingDonorEmails=contacts=>contacts.filter(c=>c.contactType==='Individual donor'&&![c.email,c.church_email].flat().some(Boolean));
export function directoryEligible(c,showNoNumbers,phones,emails){return showNoNumbers||phones(c).length>0||emails(c).length>0||(c.wing==='manifest'&&(c.givingDonorLabel||(c.contactType&&c.contactType!=='Pastor / church')));}
