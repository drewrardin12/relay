export const isFriend=c=>['Friends & family','Friend / family','Friend & family'].includes(c.contactType)||['Family','Friend'].includes(c.personalGroup);
export function recipientEmails(contacts,emails){
 return [...new Set(contacts.filter(c=>!c.archived&&c.emailList===true).flatMap(emails).map(v=>String(v).trim().toLowerCase()).filter(v=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)))].sort();
}
export function contactFilter(c,filter,visited){
 return ['Friends / family','Friends & family'].includes(filter)?isFriend(c):filter==='Pastors / churches'?(!c.contactType||c.contactType==='Pastor / church'):filter==='Supporting'?c.supportStatus==='Supporting':filter==='Unsupporting'?(!c.contactType||c.contactType==='Pastor / church')&&c.supportStatus!=='Supporting':filter==='Email list'?c.emailList===true:filter==='Visited'?visited(c):true;
}
