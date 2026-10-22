import {matchesContactSearch} from './contact-search.mjs?v=20261021';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function stateContacts(contacts,code,name,query='',scope='all',phones=()=>[],emails=()=>[]){
 return contacts.filter(c=>!c.archived&&!c.notInterested&&[code,name].some(s=>String(c.state||'').trim().toLowerCase()===s.toLowerCase())&&(scope==='all'||c.wing===scope)&&matchesContactSearch(c,query,phones(c),emails(c))).sort((a,b)=>(a.pastor||a.church||'').localeCompare(b.pastor||b.church||''));
}
export function openStateDoor(code,api){
 const name=api.states.find(([s])=>s===code)?.[1]||code;
 api.openSheet(name,`<div class="stack state-door"><button class="secondary wide" id="state-find">${api.icon('search')} Search contacts</button><button class="secondary wide" id="state-explore">${api.icon('pin')} Explore the map</button></div>`);
 document.querySelector('#state-explore').onclick=()=>api.explore(code);
 document.querySelector('#state-find').onclick=()=>openStateSearch(code,api);
}
export function openStateSearch(initialState,api){
 api.openSheet('Search by state',`<div class="form"><label>State<select id="contact-state">${api.states.map(([s,n])=>`<option value="${s}" ${s===initialState?'selected':''}>${esc(n)}</option>`).join('')}</select></label><label class="search">${api.icon('search')}<input id="state-contact-query" aria-label="Search contacts in this state" placeholder="Name, church, address, phone or email" autocomplete="off"></label><label>Contacts<select id="state-contact-scope"><option value="all">Manifest & Voyage</option><option value="manifest">Manifest</option><option value="voyage">Voyage</option></select></label><p id="state-result-count" class="small subtle" role="status"></p><div class="directory" id="state-contact-results"></div><button class="secondary wide" id="state-results-more" hidden>Show more</button></div>`);
 let limit=60;
 const state=document.querySelector('#contact-state'),query=document.querySelector('#state-contact-query'),scope=document.querySelector('#state-contact-scope'),results=document.querySelector('#state-contact-results'),more=document.querySelector('#state-results-more');
 const draw=()=>{const name=api.states.find(([s])=>s===state.value)?.[1]||state.value,list=stateContacts(api.contacts(),state.value,name,query.value,scope.value,api.phones,api.emails);document.querySelector('#state-result-count').textContent=`${list.length} ${list.length===1?'contact':'contacts'} in ${name}`;results.innerHTML=list.slice(0,limit).map(api.item).join('')||'<p class="subtle">No matching contacts in this state.</p>';more.hidden=list.length<=limit;};
 for(const el of [state,query,scope])el.addEventListener(el===query?'input':'change',()=>{limit=60;draw();});more.onclick=()=>{limit+=60;draw();};draw();query.focus();
}
