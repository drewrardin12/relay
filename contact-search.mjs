const normalize=value=>String(value??'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
export function matchesContactSearch(c,query,phoneValues=[],emailValues=[]){
 const q=normalize(query);if(!q)return true;
 const text=normalize([c.pastor,c.name,c.firstName,c.lastName,c.church,c.address,c.city,c.state,c.zip,c.postalCode,c.contactType,...phoneValues,...emailValues,...(Array.isArray(c.groups)?c.groups:[c.groups])].filter(Boolean).join(' '));
 if(q.split(' ').every(word=>text.includes(word)))return true;
 // Match formatted phone input, area codes, or any trailing digits.
 if(/^[+\d\s().-]+$/.test(q)){
  const digits=q.replace(/\D/g,'');
  return Boolean(digits)&&phoneValues.some(value=>String(value).replace(/\D/g,'').includes(digits));
 }
 return false;
}
