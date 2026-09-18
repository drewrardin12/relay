// Incremental imports preserve device edits; repeated reports cannot add money twice.
const normalized=v=>String(v||'').toLowerCase().replace(/[^a-z0-9]/g,'');
const giftKey=g=>`${normalized(g.donor||g.church_name)}|${g.date}|${Math.round(Number(g.amount)*100)}`;
export function insuranceGift(g){return g.categoryOverride==='insurance';}
export function giftCategory(g){
 if(g.categoryOverride)return g.categoryOverride;
 if(insuranceGift(g))return 'insurance';
 const memo=String(g.reportMemo||g.memo||'');
 if(/love offering|travel expense|christmas/i.test(memo))return 'love_offering';
 const fund=String(g.reportFund||g.fund||'');
 if(/love/i.test(fund))return 'love_offering';
 if(/support/i.test(fund))return 'support';
 return g.type;
}
export function supportEstimate(state,now=new Date()){
 const groups=new Map(),today=now.toISOString().slice(0,10);
 for(const g of state.gifts){if(giftCategory(g)!=='support'||g.date>today)continue;
 const label=g.donor||g.church_name||state.contacts.find(c=>c.id===g.contactId)?.church||'';
 if(!label)continue;const key=normalized(label);
 if(!groups.has(key))groups.set(key,{label,contactId:g.contactId||'',gifts:[]});groups.get(key).gifts.push(g);
 }
 const sixMonths=new Date(now);sixMonths.setMonth(sixMonths.getMonth()-6);
 const rows=[...groups.values()].map(group=>{
 const gs=group.gifts.sort((a,b)=>a.date.localeCompare(b.date));const c=state.contacts.find(c=>c.id===group.contactId);
 const church=c?(!c.contactType||c.contactType==='Pastor / church')&&!!c.church:/baptist|\bbc\b|church|iglesia|tabernacle/i.test(group.label);
 const counts=new Map();for(const g of gs.filter(g=>!/back support|catch.?up/i.test(g.reportMemo||g.memo||''))){const amount=Number(g.amount);counts.set(amount,(counts.get(amount)||0)+1);}
 const amounts=[...counts].sort((a,b)=>b[1]-a[1]||a[0]-b[0]);const amount=amounts[0]?.[0]||0;
 const months=[...new Set(gs.map(g=>Number(g.date.slice(0,4))*12+Number(g.date.slice(5,7))))].sort((a,b)=>a-b);
 const gaps=months.slice(1).map((m,i)=>m-months[i]).sort((a,b)=>a-b);const gap=gaps[Math.floor((gaps.length-1)/2)];
 const known={'monthly':12,'quarterly':4,'bi-monthly':6,'bi-annual':2,'annual':1,'annually':1,'weekly':52,'bi-weekly':26};
 const confirmed=!!c?.supportConfirmed&&known[String(c.supportCadence).toLowerCase()];
 const patterns={1:['Monthly',12],2:['Every two months',6],3:['Quarterly',4],6:['Twice yearly',2],12:['Yearly',1]};
 const pattern=months.length>=3&&amounts[0]?.[1]>=2&&patterns[gap];
 const cadence=confirmed?c.supportCadence:pattern?.[0]||'Unknown';const annual=confirmed?Number(c.supportAmount)*confirmed:pattern?amount*pattern[1]:0;
 return {...group,church,amount:confirmed?Number(c.supportAmount):amount,cadence,annual,basis:confirmed?'Confirmed':'Estimated',first:gs[0].date,last:gs.at(-1).date,newlyRecorded:gs[0].date>=sixMonths.toISOString().slice(0,10)};
 });
 return {rows,annual:rows.reduce((n,r)=>n+r.annual,0),churches:rows.filter(r=>r.church).length,newChurches:rows.filter(r=>r.church&&r.newlyRecorded).length,unknown:rows.filter(r=>!r.annual).length,confirmed:rows.filter(r=>r.basis==='Confirmed').reduce((n,r)=>n+r.annual,0)};
}
export function mergeGivingReports(state,bundle){
 if(bundle.kind!=='relay-giving-reports'||!Array.isArray(bundle.gifts)||!Array.isArray(bundle.coverage))throw Error('Not a Relay giving report bundle');
 const known=new Set(state.contacts.map(c=>c.id));
 for(const g of bundle.gifts){
  if(!g.id||!g.donor||!/^\d{4}-\d{2}-\d{2}$/.test(g.date)||!Number.isFinite(Number(g.amount))||Number(g.amount)<=0)throw Error('Invalid gift in report; nothing imported');
  if(g.contactId&&!known.has(g.contactId))throw Error('A donor match refers to a missing contact');
 }
 const gifts=state.gifts.map(g=>({...g})),used=new Set();let added=0,matched=0;
 for(const incoming of bundle.gifts){
  let i=gifts.findIndex(g=>g.id===incoming.id||g.reportId===incoming.id);
  if(i<0)i=gifts.findIndex((g,index)=>!used.has(index)&&giftKey(g)===giftKey(incoming));
  const provenance={reportId:incoming.id,reportSource:incoming.source,reportRow:incoming.row,reportFund:incoming.fund,reportMemo:incoming.memo,type:giftCategory(incoming)};
  if(i>=0){used.add(i);matched++;gifts[i]={...gifts[i],...provenance};if(!gifts[i].contactId&&incoming.contactId)gifts[i].contactId=incoming.contactId;}
  else {gifts.push({...incoming,...provenance,church_name:incoming.donor});used.add(gifts.length-1);added++;}
 }
 const coverage=[...new Set([...(state.financeReview?.coverage||[]),...bundle.coverage])].sort();
 return {...state,gifts,...(bundle.calendarReview?{calendarReview:bundle.calendarReview}:{}),financeReview:{coverage,added,matched,unassigned:gifts.filter(g=>!g.contactId).length,importedAt:new Date().toISOString(),note:'Deposit dates and fund labels are source evidence, not confirmed support commitments. Missing months never count as zero.'}};
}
