export const isFriend=c=>c.contactType==='Friends & family';
export function recipientEmails(contacts,emails){
 return [...new Set(contacts.filter(c=>!c.archived&&c.emailList===true).flatMap(emails).map(v=>String(v).trim().toLowerCase()).filter(v=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)))].sort();
}
export function contactFilter(c,filter,visited){
 return filter==='Friends & family'?isFriend(c):filter==='Pastors / churches'?(!c.contactType||c.contactType==='Pastor / church'):filter==='Email list'?c.emailList===true:filter==='Visited'?visited(c):true;
}
