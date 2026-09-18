import {giftCategory} from './finance.mjs';
export const fallbackInterval=(amount,low=150,high=300)=>amount<=low?1:amount<=high?2:3;
export function financeDefaults(){return {schedule:[],allowances:{insurance:0,special:0,other:0}};}
export function financePlan(state,year=new Date().getFullYear()){
 const settings={cashActual:0,cashAllowance:0,marchEstimate:0,low:150,high:300,...state.financePlan};
 const rows=(state.financeSchedule||[]).map(([label,amount,interval,basis],i)=>{const override=settings.donors?.[i]||{};amount=Number(override.amount??amount);interval=Number(override.interval??interval)||1;basis=override.basis||basis;return {label,amount,interval,basis,status:override.status||'Assumed continuing',monthly:override.status==='paused'||basis==='Unknown'?0:amount/interval};});
 const allowances={insurance:0,special:0,other:0,...state.financeAllowances,cash:Number(settings.cashAllowance)||0};
 const churchMonthly=rows.reduce((sum,row)=>sum+row.monthly,0),reported=state.gifts.filter(g=>g.date?.startsWith(String(year))).reduce((sum,g)=>sum+Number(g.amount||0),0);
 const supportAnnual=churchMonthly*12+(settings.includeInsurance?allowances.insurance:0)+(settings.includeIndividuals?Number(settings.individualMonthly||0)*12:0);
 return {settings,rows,allowances,churchMonthly,reported,supportAnnual,planningAnnual:churchMonthly*12+Object.values(allowances).reduce((a,b)=>a+b,0)};
}
export function renderFinance(state,year,h){
 const p=financePlan(state,year),{topbar,btn,section,MONEY:M,e}=h;
 return `${topbar('Support & giving',btn('finance-plan-edit','Adjust','plain-btn'))}<div class="page">${btn('finance-classify','Review transaction categories','secondary wide')}${section('Reported giving')}<div class="panel"><h3>${M.format(p.reported)} · ${year}</h3><p>Imported receipts only. Missing reports remain unknown.</p>${btn('route','View reported transactions','secondary wide','data-route="#ledger"')}</div>${section('Private planning assumptions')}<div class="panel"><h3>${M.format(p.supportAnnual)} / year</h3><p>Restored planning scenario—not guaranteed income or confirmed pledges.</p>${p.rows.map(r=>`<div class="ledger-row"><span>${e(r.label)}</span><span>${M.format(r.monthly)} / month · ${e(r.basis)}</span></div>`).join('')||'<p>Import your full backup to restore planning assumptions.</p>'}</div>${section('Year')}<div class="chips">${[new Date().getFullYear(),new Date().getFullYear()-1].map(y=>btn('goal-year',String(y),'chip',`data-year="${y}"`)).join('')}</div></div>`;
}
