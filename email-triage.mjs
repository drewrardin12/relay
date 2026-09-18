// Review hints only: never assign contacts or discard messages here.
export function emailCategory(row){
 const email=String(row.email||'').toLowerCase(),subject=String(row.subject||'');
 const domain=email.split('@')[1]||'';
 const businesses=['accounts.google.com','google.com','googlemail.com','mkt.flyfrontier.com','gotprint.com','mailchimp.com','flightaware.com','rentcarla.com','connect.sparkmailapp.com','email.clearme.com','ma.linktr.ee','comms.waveapps.com','minutemanpress.com','readdle.com','lbproducts.com','squarespace.info','peoplesbankdirect.com','airbnb.com','troendlefinancial.com','focusfinancial.com','vistaprint.com','t.vistaprint.com','officedepot.com','giftly.com'];
 if(businesses.includes(domain))return 'Business / automated';
 if(row.ambiguous)return 'Ministry — shared address';
 if(/pastor|preacher|baptist|church|nwbbc|whbc|vbcrockford|gbc52302/i.test(email)||/bible|prayer letter|support.*thank you|missionary|ambassador baptist|thank you/i.test(subject))return 'Likely ministry';
 if(/birthday/i.test(subject))return 'Personal — identity unclear';
 return 'Needs a closer look';
}
export function triageEmails(rows){const order=['Likely ministry','Ministry — shared address','Needs a closer look','Personal — identity unclear','Family / personal','Business / automated'];return rows.map(row=>({...row,category:emailCategory(row)})).sort((a,b)=>order.indexOf(a.category)-order.indexOf(b.category)||a.email.localeCompare(b.email));}
