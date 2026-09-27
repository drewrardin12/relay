import {giftCategory} from './finance.mjs';
// Reviewed September 16 working assumptions, never donor commitments.
const schedule=[
 ['Abilene Baptist | Abilene,TX',100,1,'Assumed'],['Anchor Baptist | Mesquite,TX',200,2,'Observed'],
 ['Bella Vista Baptist Church',100,1,'Observed'],['Bethel Baptist | Walls,MS',75,1,'Assumed'],
 ['Biblical BC | Beach Park, IL',50,1,'Assumed'],['Blessed Hope Baptist | Batavia, NY',100,1,'Assumed'],
 ['Capital Baptist Church',300,2,'Assumed'],['Central Baptist | Amarillo, TX',100,1,'Observed'],
 ['Central Baptist | Center, TX',225,2,'Assumed'],['East Valley Baptist | Tempe, AZ',150,1,'Assumed'],
 ['First BC | Brighton, IL',225,2,'Assumed'],['First BC | Clinton, IL',150,1,'Observed'],
 ['Friendship Baptist | Hurst, TX',200,2,'Assumed'],['Grace Baptist | Quincy, IL',800,3,'Observed'],
 ['Iglesia Bautista Biblica El Faro | Waverly, FL',225,2,'Assumed'],['Iglesia Bautista Fundamental Emanuel | Mesquite, TX',150,3,'Observed'],
 ['Landmark Baptist | Haines City,FL',50,1,'Observed'],['Landmark BC | Petoskey, MI',100,1,'Observed'],
 ['Midwest BBC | Rochester, MN',150,3,'Observed'],['Northwest Bible Baptist | Elgin, IL',750,3,'Assumed'],
 ['Palm Beach Gardens Baptist | Port ST Lucie, FL',50,1,'Observed'],['Peachtree Road Baptist | Suwanee, GA',100,1,'Assumed'],
 ['Prairie View Baptist | Lake City, IL',275,2,'Assumed'],['Solid Rock Baptist | Bellefontaine, OH',75,1,'Assumed'],
 ['Valley Baptist | Oswego, IL',100,1,'Observed'],['Whetstone Baptist | Mountain Grove, MO',75,1,'Assumed']
];
const norm=v=>String(v||'').toLowerCase().replace(/[^a-z0-9]/g,'');
export function financeDefaults(){return {schedule:structuredClone(schedule),allowances:{insurance:6241/11*12,special:6408/11*12,other:2425/11*12}};}
export const fallbackInterval=(amount,low=150,high=300)=>amount<=low?1:amount<=high?2:3;
export function financePlan(state,year=2026){
 const settings={cashActual:6000,cashAllowance:6000,marchEstimate:2934.5,low:150,high:300,includeIndividuals:false,includeInsurance:false,...state.financePlan};
 const rows=schedule.map(([label,amount,interval,basis],i)=>{
  const override=settings.donors?.[i]||{};
  const aliases=label.startsWith('Midwest BBC')?[label,'Midwest Bible Baptist Church']:[label];
  const gifts=state.gifts.filter(g=>aliases.some(a=>norm(a)===norm(g.donor||g.church_name))&&giftCategory(g)==='support');
  const ordinary=gifts.filter(g=>!/back support|catch.?up|love offering|travel|christmas/i.test(g.reportMemo||g.memo||''));
  if(basis==='Assumed')interval=fallbackInterval(amount,settings.low,settings.high);
  amount=Number(override.amount??amount); interval=Number(override.interval??interval);basis=override.basis||basis;
  return {label,amount,interval,basis,monthly:override.status==='paused'||basis==='Unknown'?0:amount/interval,status:override.status||'Assumed continuing',months:[...new Set(gifts.map(g=>g.date?.slice(0,7)))].sort(),last:ordinary.map(g=>g.date).sort().at(-1)||'',aliases};
 });
 const churchMonthly=rows.reduce((n,r)=>n+r.monthly,0);
 const supportAnnual=churchMonthly*12+(settings.includeInsurance?6241/11*12:0)+(settings.includeIndividuals?Number(settings.individualMonthly||0)*12:0);
 const reported=state.gifts.filter(g=>g.date?.startsWith(String(year))).reduce((n,g)=>n+Number(g.amount),0);
 const march=year===2026?Number(settings.marchEstimate):0,cash=year===2026?Number(settings.cashActual):0;
 const allowances={insurance:6241/11*12,special:6408/11*12,other:2425/11*12,cash:Number(settings.cashAllowance)};
 const planningAnnual=churchMonthly*12+Object.values(allowances).reduce((n,a)=>n+a,0);
 return {settings,rows,churchMonthly,supportAnnual,reported,march,cash,estimatedYtd:reported+march+cash,allowances,planningAnnual};
}
export function renderFinance(state,year,h){
 const {e,MONEY:M,PRECISE:P,topbar,btn,section,compassChart}=h,p=financePlan(state,year),goal=Number(state.settings.yearlyGoal)||70000;
 const progress=(annual,g)=>`${(annual/g*100).toFixed(1)}% · ${P.format(Math.max(0,g-annual)/12)}/month still needed`;
 const comparisons=annual=>[35000,70000].map(g=>`<div class="ledger-row"><span>${M.format(g)} goal</span><span>${progress(annual,g)}</span></div>`).join('');
 const basisTotal=b=>p.rows.filter(r=>r.basis===b).reduce((n,r)=>n+r.monthly,0)*12;
 const coverage=new Set(state.financeReview?.coverage||[]);
 const monthly=Array.from({length:12},(_,i)=>{const key=`${year}-${String(i+1).padStart(2,'0')}`;return {key,label:new Date(year,i,1).toLocaleDateString('en-US',{month:'short'}),covered:coverage.has(key),amount:state.gifts.filter(g=>g.date?.startsWith(key)).reduce((n,g)=>n+Number(g.amount),0)};});
 const chart=`${section('Monthly reported receipts')}<div class="panel goal-panel">${monthly.map(m=>`<div class="receipt-month"><span>${m.label}</span><meter min="0" max="${Math.max(1,...monthly.map(m=>m.amount))}" value="${m.amount}" aria-label="${m.label} reported receipts"></meter><span>${m.covered?M.format(m.amount):m.amount?`${M.format(m.amount)} · partial`:'Unknown'}</span></div>`).join('')}<p class="hint">Missing reports are unknown, not zero. March estimate ${P.format(p.march)} is separate from the reported bars. Undated cash is not allocated to a month.</p></div>`;
 return `${topbar('Support & giving',btn('finance-plan-edit','Adjust','plain-btn'))}<div class="page">${btn('finance-classify','Review transaction categories','secondary wide')}
 <div class="goal-head"><h1>${M.format(p.supportAnnual)}</h1><p>Estimated annual support · ${M.format(goal)} selected goal</p>${compassChart(Math.round(p.supportAnnual/goal*100))}</div>
 <div class="finance-bearings"><article class="panel goal-panel"><h3>Support level</h3><div class="amount">${P.format(p.supportAnnual/12)} / month</div><p class="hint">${p.settings.includeIndividuals?'Church + manually assessed individual support':'Church support only'}${p.settings.includeInsurance?' + insurance allowance':''}. Working level as of September 16, 2026; not pledged.</p>${comparisons(p.supportAnnual)}<p class="hint">Confirmed ${M.format(basisTotal('Confirmed'))} · Observed ${M.format(basisTotal('Observed'))} · Assumed ${M.format(basisTotal('Assumed'))} annually. Optional insurance/individual additions are separate assumptions.</p></article>
 <article class="panel goal-panel"><h3>Total giving · ${year}</h3><div class="amount">${M.format(p.reported)}</div><p class="hint">Reported receipts only · ${(p.reported/goal*100).toFixed(1)}% of selected yearly goal.</p><div class="ledger-row">Estimated March<span>${P.format(p.march)}</span></div><div class="ledger-row">Approximate undated cash<span>${M.format(p.cash)}</span></div><div class="ledger-row">Including estimates<span>${P.format(p.estimatedYtd)}</span></div><p class="hint">${year===2026?'Through August. March = average of February and April; cash assigned to 2026 only, not a fabricated receipt date.':'No March or cash estimate assigned to this year.'} Estimates never enter the ledger.</p>${[35000,70000].map(g=>`<p class="small subtle">${M.format(g)}: ${(p.reported/g*100).toFixed(1)}% reported · ${(p.estimatedYtd/g*100).toFixed(1)}% including estimates</p>`).join('')}${btn('route','View reported transactions','secondary wide','data-route="#ledger"')}</article></div>
 ${section('Current total-giving planning level')}<div class="panel goal-panel"><div class="amount">${P.format(p.planningAnnual)} / year</div><p>${P.format(p.planningAnnual/12)} monthly equivalent</p><p class="hint">Hybrid scenario, not guaranteed income: current church support plus historical allowances from September 2025–August 2026 (11 reports). Occasional gifts are averaged, not monthly promises.</p>${Object.entries(p.allowances).map(([k,v])=>`<div class="ledger-row">${e(k)} allowance / year<span>${P.format(v)}</span></div>`).join('')}${comparisons(p.planningAnnual)}</div>${chart}
 ${section('Reviewed donor schedule')}<p class="hint">${p.rows.length} churches. Amount and cadence are independent choices. Gaps do not end support. Midwest’s July alias is provisional. No automatic increases or missed-payment verdicts.</p>${btn('finance-plan-edit','Edit amounts, cadence & assumptions','secondary wide')}<div class="panel">${p.rows.map(r=>`<details class="details"><summary>${e(r.label)} · ${P.format(r.monthly)}/month</summary><p>${P.format(r.amount)} ${r.interval===1?'monthly':`every ${r.interval} months`} · ${e(r.basis)} · ${e(r.status)}</p><p class="hint">Evidence months: ${e(r.months.join(', ')||'No matching receipts loaded')}. Last ordinary receipt: ${e(r.last||'Unknown')}.</p><p class="hint">${r.label.includes('Quincy')?'Latest reviewed amount; future $800 level is not confirmed.':r.label.includes('Emanuel')?'December $600 purpose remains unclear; current $150 quarterly assumption.':r.basis==='Assumed'?'Temporary amount rule or donor-specific working assumption, not a commitment.':'Reviewed receipt pattern, not a confirmed commitment.'}</p></details>`).join('')}</div>
 ${section('Report coverage & unresolved items')}<div class="panel goal-panel"><p>${e((state.financeReview?.coverage||[]).filter(m=>m.startsWith(String(year))).join(' · ')||'No reconciled coverage loaded')}</p><p class="hint">March 2026 missing; no September–December 2026 receipts analyzed. ${state.financeReview?.unassigned??0} entries lack a contact match; these still count once in reported receipts.</p><p class="hint">Faith, Bourbonnais: April/July insurance evidence; February purpose uncertain. $6,241 excluded from ordinary support provisionally. November 2025’s additional $2,450 “from FBC” remains excluded until identified.</p>${btn('route','Review unmatched records','secondary wide','data-route="#importreview"')}<label class="secondary wide" style="display:block;text-align:center;cursor:pointer">Import reconciled reports<input id="import-reports" type="file" accept=".json,application/json" class="sr-only"></label></div>
 ${section('Support faithfulness')}<p class="hint">Review evidence before declaring two missed payments. Missing March, deposit delays, catch-up support, and assumed cadences make automatic warnings unreliable. Older warnings are not verified by this model.</p>
 ${state.calendarReview?`${section('Calendar history')}<p class="hint">${state.calendarReview.uniqueChurches} matched churches with past events; ${state.calendarReview.unresolved.length} events unresolved. Snapshot, not live sync or verified attendance. Support conversion percentage needs donor-identity review.</p>`:''}
 ${section('Selected goal & year')}<div class="chips">${btn('goal-edit','Edit selected yearly goal','secondary')}${[2026,2025,2024].map(y=>btn('goal-year',String(y),`chip ${year===y?'active':''}`,`data-year="${y}"`)).join('')}</div><p class="hint">Historical receipts change with the year. The current support schedule and planning scenario remain dated September 16, 2026. No carryover. Conditional growth forecasts are not counted as income.</p></div>`;
}
