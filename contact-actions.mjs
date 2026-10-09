const esc=s=>String(s||'').replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');
export function contactVcard(c,phones,emails){
 const rows=['BEGIN:VCARD','VERSION:3.0',`FN:${esc(c.pastor||c.name||c.church)}`,`N:;${esc(c.pastor||c.name||c.church)};;;`];
 if(c.church)rows.push(`ORG:${esc(c.church)}`);
 for(const p of phones(c))rows.push(`TEL;TYPE=VOICE:${esc(p)}`);
 for(const email of emails(c))rows.push(`EMAIL;TYPE=INTERNET:${esc(email)}`);
 if(c.address||c.city||c.state)rows.push(`ADR;TYPE=WORK:;;${esc(c.address)};${esc(c.city)};${esc(c.state)};${esc(c.zip||c.postcode)};`);
 rows.push('END:VCARD');return rows.join('\r\n')+'\r\n';
}
export function callSummary(logs,id){const calls=logs.filter(l=>l.contactId===id&&l.type==='call');return {count:calls.length,last:calls.sort((a,b)=>String(b.createdAt||b.date).localeCompare(String(a.createdAt||a.date)))[0]};}
export function retireBadNumber(c,number,date){
 const key=s=>String(s||'').replace(/\D/g,'').replace(/^1(?=\d{10}$)/,'');
 const values=v=>Array.isArray(v)?v:String(v||'').split(/[\n,;]/).map(s=>s.trim()).filter(Boolean);
 c.retiredNumbers=[...(c.retiredNumbers||[]),{number,date,reason:'Bad number'}];
 c.phone=values(c.phone).filter(p=>key(p)!==key(number));
 c.cell=values(c.cell).filter(p=>key(p)!==key(number));
 c.badNumber=false;
}
