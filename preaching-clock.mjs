import {clockPreferences,nextFinish,timeParts,clockText,startSession,restoreSession,remainingTime,elapsedTime,warningState,timerText,pauseSession,resumeSession,adjustSession,setFinish,finishSession,reconcileClockJump} from './preaching-time.mjs?v=20261027-clock';

const KEY='relay_preaching_clock_v1';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const shapes={clock:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 3"/>',back:'<path d="m14 5-7 7 7 7"/>',settings:'<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3"/><circle cx="15" cy="17" r="3"/>',play:'<path d="m8 5 11 7-11 7z"/>',pause:'<path d="M8 5v14M16 5v14"/>',expand:'<path d="M9 3H3v6m12-6h6v6M3 15v6h6m12-6v6h-6"/>',collapse:'<path d="M3 9h6V3m6 0v6h6M9 21v-6H3m12 6v-6h6"/>',eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',edit:'<path d="m15 4 5 5M4 16l-1 5 5-1L21 7l-5-5z"/>',check:'<path d="m5 12 4 4L20 5"/>',reset:'<path d="M3 10a9 9 0 1 1 2 8M3 3v7h7"/>',close:'<path d="m5 5 14 14M19 5 5 19"/>'};
const glyph=name=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${shapes[name]||shapes.clock}</svg>`;
const button=(action,label,{symbol='',cls='',title=label,extra=''}={})=>`<button type="button" data-pc="${action}" class="pc-button ${cls}" aria-label="${esc(title)}" title="${esc(title)}" ${extra}>${symbol?glyph(symbol):''}${label?`<span>${esc(label)}</span>`:''}</button>`;
const modeNames={end:'End At',duration:'Duration',clock:'Clock Only'};
function picker(parts,prefix='finish'){
 const number=(label,key,pattern)=>`<label><span class="pc-sr">${label}</span><input type="text" inputmode="numeric" pattern="${pattern}" maxlength="2" required autocomplete="off" enterkeyhint="next" name="${prefix}-${key}" aria-label="${label}" data-pc-time-number="${key}" value="${esc(key==='minute'?String(parts[key]).padStart(2,'0'):parts[key])}"></label>`;
 return `<div class="pc-time-picker">${number('Finish hour','hour','0?[1-9]|1[0-2]')}<span aria-hidden="true">:</span>${number('Finish minute','minute','[0-5]?[0-9]')}<label><span class="pc-sr">AM or PM</span><select name="${prefix}-period" aria-label="AM or PM">${['AM','PM'].map(value=>`<option ${parts.period===value?'selected':''}>${value}</option>`).join('')}</select></label></div>`;
}
function readPicker(form,prefix='finish'){
 const parts=Object.fromEntries(['hour','minute','period'].map(k=>[k,form.elements.namedItem(prefix+'-'+k).value.trim()]));
 if(!/^(0?[1-9]|1[0-2])$/.test(parts.hour)||!/^([0-5]?[0-9])$/.test(parts.minute))throw Error('Enter an hour from 1–12 and minutes from 00–59.');
 return parts;
}
function bindPicker(form){
 for(const field of form.querySelectorAll('[data-pc-time-number]')){
  field.addEventListener('focus',()=>field.select());field.addEventListener('click',()=>field.select());
  field.addEventListener('blur',()=>{if(field.value&&field.checkValidity()&&field.dataset.pcTimeNumber==='minute')field.value=field.value.padStart(2,'0');});
  if(document.activeElement===field)field.select();
 }
}
function loadSaved(){try{return JSON.parse(localStorage.getItem(KEY))||{};}catch{return {};}}

export function createPreachingClock({go,notify=()=>{}}){
 const saved=loadSaved();let prefs=clockPreferences(saved.preferences),session=restoreSession(saved.session);
 let draft={mode:prefs.defaultMode,...timeParts(Date.now()+30*60000),minutes:prefs.presets[2]||30,...saved.draft};
 if(!['end','duration','clock'].includes(draft.mode))draft.mode=prefs.defaultMode;
 let root=null,view='',timer=null,wake=null,wakePending=false,wakeMessage='',storageError=false,hiddenControls=false,lastWarning='',wall=Date.now(),mono=globalThis.performance?.now()||0,clockNotice='';
 const now=()=>Date.now();
 function save(){
  try{localStorage.setItem(KEY,JSON.stringify({version:1,preferences:prefs,session,draft,savedAt:now()}));storageError=false;}
  catch{storageError=true;notify('Clock is running, but this browser could not save it. Keep this page open.');}
 }
 const formatClock=(time,seconds=prefs.showSeconds)=>clockText(time,{clock24:prefs.clock24,showSeconds:seconds});
 const finishLabel=time=>`${new Date(time).toDateString()!==new Date().toDateString()?'Tomorrow · ':''}${formatClock(time,false)}`;
 const active=()=>session&&session.status!=='finished';
 function heading(title,back='settings-home'){
  return `<header class="pc-header">${button(back,'',{symbol:'back',cls:'pc-icon',title:back==='settings-home'?'Back to Settings':'Back to clock'})}<div class="pc-brand"><span>RELAY</span><h1>${title}</h1></div>${button('settings','',{symbol:'settings',cls:'pc-icon',title:'Preaching Clock settings'})}</header>`;
 }
 function shell(content){return `${content}<div class="pc-notice" role="status" data-pc-notice></div><dialog class="pc-dialog" aria-labelledby="pc-dialog-title"></dialog>`;}
 function draw(){
  if(!root)return;
  lastWarning='';root.className=`pc-root pc-size-${prefs.size}${prefs.reducedMotion?' pc-reduced-motion':''} pc-appearance-${prefs.appearance}`;
  if(view==='settings')root.innerHTML=shell(settingsHTML());
  else if(session?.status==='finished')root.innerHTML=shell(summaryHTML());
  else if(active())root.innerHTML=shell(stageHTML());
  else root.innerHTML=shell(setupHTML());
  bindForms();update();void manageWake();schedule();
 }
 function setupHTML(){return `${heading('Preaching Clock')}<div class="pc-setup"><div class="pc-setup-intro"><p class="pc-eyebrow">TIME, THOUGHTFULLY KEPT</p><div class="pc-now-preview" data-pc-now></div></div><div class="pc-modes" role="group" aria-label="Clock mode">${Object.entries(modeNames).map(([key,name])=>button('mode',name,{cls:draft.mode===key?'is-selected':'',extra:`data-mode="${key}" aria-pressed="${draft.mode===key}"`})).join('')}</div><form id="pc-start-form" class="pc-setup-card">${draft.mode==='end'?`<p class="pc-eyebrow">I WANT TO FINISH AT</p>${picker(draft)}<div class="pc-available"><strong data-pc-preview></strong><span data-pc-target></span></div>`:draft.mode==='duration'?`<p class="pc-eyebrow">TIME TO PREACH</p><div class="pc-presets">${prefs.presets.map(value=>button('preset',String(value),{cls:Number(draft.minutes)===value?'is-selected':'',title:`${value} minutes`,extra:`data-minutes="${value}" aria-pressed="${Number(draft.minutes)===value}"`})).join('')}</div><label class="pc-custom-duration">Custom duration <span><input name="minutes" type="number" inputmode="decimal" step="0.5" min="1" max="1440" required value="${esc(draft.minutes)}" aria-label="Duration in minutes"> min</span></label><div class="pc-available"><strong data-pc-preview></strong><span data-pc-target></span></div>`:`<div class="pc-clock-preview">${glyph('clock')}<h2>A little room to focus.</h2><p>Just the time. Nothing competing for your attention.</p></div>`}<p class="pc-error" role="alert" data-pc-error></p><button class="pc-start" type="submit">${glyph('play')}${draft.mode==='clock'?'Open clock':'Start preaching'}</button></form><div class="pc-setup-foot"><span>${glyph('clock')}Silent warnings</span><span>${prefs.yellow} min <i class="pc-dot yellow"></i> · ${prefs.orange} min <i class="pc-dot orange"></i></span></div></div>`;}
 function stageHTML(){const clockOnly=session.mode==='clock';return `<section class="pc-stage ${clockOnly?'pc-clock-only':''}" aria-label="Preaching display">${clockOnly?`<nav class="pc-clock-toolbar" aria-label="Clock navigation">${button('clock-setup','Timer setup',{symbol:'back',cls:'pc-clock-back',title:'Back to timer setup'})}${button('clock-home','',{symbol:'close',cls:'pc-icon',title:'Close clock and return to Relay'})}</nav>`:''}<header class="pc-stage-top"><div class="pc-time-block"><span class="pc-eyebrow">CURRENT TIME</span><div data-pc-now></div></div><div class="pc-end-block" ${clockOnly?'hidden':''}><span class="pc-eyebrow" data-pc-end-label>FINISH AT</span><div data-pc-end></div></div></header><div class="pc-overtime-strip" hidden data-pc-overtime><span>OVERTIME</span><strong data-pc-over-count></strong></div><div class="pc-main-readout"><p class="pc-state-label" data-pc-state role="status" aria-live="polite"></p><div class="pc-digits" role="timer" aria-live="off" aria-label="${clockOnly?'Current time':'Time remaining'}" data-pc-digits></div><p class="pc-state-caption" data-pc-caption>${clockOnly?'':modeNames[session.mode]}</p></div><div class="pc-progress" ${clockOnly?'hidden':''} role="progressbar" aria-label="Preaching time remaining" aria-valuemin="0" aria-valuemax="100"><i></i></div><footer class="pc-stage-bottom"><div class="pc-controls">${clockOnly?'':`${button('pause','Pause',{symbol:'pause',cls:'pc-pause'})}<div class="pc-adjust">${button('minus','−5',{title:'Subtract five minutes'})}${button('plus','+5',{title:'Add five minutes'})}</div>${button('edit','',{symbol:'edit',cls:'pc-icon',title:'Edit finish time'})}`}${button('fullscreen','',{symbol:'expand',cls:'pc-icon',title:'Fullscreen or presentation view'})}${button('hide','',{symbol:'eye',cls:'pc-icon',title:'Hide controls'})}${button('settings','',{symbol:'settings',cls:'pc-icon',title:'Preaching Clock settings'})}${button(clockOnly?'clock-setup':'finish',clockOnly?'Timer setup':'Finish',{symbol:clockOnly?'back':'check',cls:'pc-finish',title:clockOnly?'Back to timer setup':'Finish'})}${!clockOnly?button('reset','',{symbol:'reset',cls:'pc-icon',title:'Reset timer'}):''}</div><div class="pc-running-meta"><span data-pc-wake></span>${button('home','Relay',{symbol:'back',cls:'pc-relay-return',title:'Back to Relay; keep timer running'})}</div></footer>${button('reveal','',{symbol:'eye',cls:'pc-reveal pc-icon',title:'Show controls'})}</section>`;}
 function summaryHTML(){return `${heading('Session complete')}<div class="pc-summary"><span class="pc-summary-check">${glyph('check')}</span><p class="pc-eyebrow">TIME WELL GIVEN</p><h2>Finished.</h2><div class="pc-summary-time">${timerText(elapsedTime(session))}</div><p>Time preaching${session.mode==='clock'?' · Clock Only':''}</p>${session.mode!=='clock'?`<p class="pc-summary-result">${session.remainingMs<=0?`${timerText(session.remainingMs)} overtime`:`${timerText(session.remainingMs)} remaining`}</p>`:''}<div class="pc-summary-actions">${button('new','New session',{cls:'pc-primary'})}${button('home','Back to Helm',{cls:'pc-subtle'})}</div></div>`;}
 function settingsHTML(){
  const option=(key,value,label)=>`<option value="${value}" ${prefs[key]===value?'selected':''}>${label}</option>`;
  const toggle=(key,label,description='')=>`<label class="pc-setting-toggle"><span>${label}${description?`<small>${description}</small>`:''}</span><input name="${key}" type="checkbox" ${prefs[key]?'checked':''}></label>`;
  return `${heading('Clock settings','back')}<form id="pc-settings-form" class="pc-settings"><section><h2>Starting point</h2><label>Default mode<select name="defaultMode">${Object.entries(modeNames).map(([key,name])=>option('defaultMode',key,name)).join('')}</select></label><label>Duration presets · minutes<input name="presets" value="${esc(prefs.presets.join(', '))}" required aria-describedby="pc-preset-hint"></label><small id="pc-preset-hint">Up to eight, separated by commas.</small></section><section><h2>Silent warnings</h2><div class="pc-settings-pair"><label><span><i class="pc-dot yellow"></i>Yellow · minutes left</span><input name="yellow" type="number" min="0.5" max="180" step="0.5" value="${prefs.yellow}" required></label><label><span><i class="pc-dot orange"></i>Orange · minutes left</span><input name="orange" type="number" min="0" max="179.5" step="0.5" value="${prefs.orange}" required></label></div><label>Warning appearance<select name="appearance">${option('appearance','glow','Border & glow')}${option('appearance','border','Crisp border')}</select></label><p class="pc-small">Overtime always begins at zero. All warnings are silent.</p></section><section><h2>Display</h2>${toggle('showSeconds','Show clock seconds')}${toggle('clock24','24-hour clock')}<label>Display size<select name="size">${option('size','balanced','Balanced')}${option('size','large','Large')}${option('size','maximum','Maximum')}</select></label>${toggle('reducedMotion','Reduce motion','Your device’s reduced-motion preference is always respected.')}${toggle('fullscreen','Open in fullscreen when supported')}${toggle('wakeLock','Keep screen awake','While the preaching display is visible.')}</section><section class="pc-settings-about"><h2>Ready for the pulpit</h2><p>Sessions and preferences save on this device. A running timer recovers when you return or reload. Your iPhone, iPad, and Mac each keep their own session.</p><p>Switching apps or locking the device hides the display; timestamps keep the countdown accurate when you return. Screen wake lock and browser fullscreen depend on your browser and device. If wake lock is unavailable, temporarily adjust Auto-Lock in your device settings.</p><p>End At follows your device’s clock. Changing time zones keeps the same finishing instant and updates the displayed local time. Duration uses elapsed time; check the finish time after changing your device clock.</p></section><p class="pc-error" role="alert" data-pc-error></p><div class="pc-settings-actions"><button type="submit" class="pc-start">Save preferences</button>${button('back','Cancel',{cls:'pc-subtle'})}</div></form>`;
 }
 function preview(){
  if(!root||active()||view==='settings')return;
  const form=root.querySelector('#pc-start-form');if(!form||draft.mode==='clock')return;
  try{
   const target=draft.mode==='end'?nextFinish(readPicker(form),now()):now()+Number(form.elements.minutes.value)*60000;
   root.querySelector('[data-pc-preview]').textContent=timerText(target-now());
   root.querySelector('[data-pc-target]').textContent=draft.mode==='end'?`available · ${finishLabel(target)}`:`Finish at ${finishLabel(target)}`;
  }catch{root.querySelector('[data-pc-preview]').textContent='—';}
 }
 function update(){
  if(!root)return;
  const t=now();for(const node of root.querySelectorAll('[data-pc-now]'))node.textContent=formatClock(t);
  preview();
  const note=root.querySelector('[data-pc-notice]');if(note)note.textContent=storageError?'Not saved · keep this page open.':clockNotice;
  const stage=root.querySelector('.pc-stage');if(!stage||!active())return;
  const remaining=remainingTime(session,t),warning=warningState(remaining,prefs),overtime=warning==='overtime',clockOnly=session.mode==='clock';
  stage.dataset.warning=warning;stage.dataset.paused=String(session.status==='paused');stage.classList.toggle('pc-controls-hidden',hiddenControls);
  const end=root.querySelector('[data-pc-end]');end.textContent=clockOnly?'':formatClock(session.status==='paused'?t+remaining:session.deadline,false);
  root.querySelector('[data-pc-end-label]').textContent=session.status==='paused'?'FINISH ON RESUME':`FINISH AT${!clockOnly&&new Date(session.deadline).toDateString()!==new Date(t).toDateString()?' · '+(session.deadline>t?'TOMORROW':'PREVIOUS DAY'):''}`;
  const digits=root.querySelector('[data-pc-digits]'),readout=clockOnly?formatClock(t):`${overtime?'+':''}${timerText(remaining)}`;
  // Static split panels: update glyphs without any flip or rolling animation.
  if(digits.dataset.readout!==readout){digits.innerHTML=Array.from(readout,char=>`<span aria-hidden="true" class="${/\d/.test(char)?'pc-flip-digit':char===':'?'pc-flip-colon':char==='+'?'pc-flip-plus':'pc-flip-suffix'}">${esc(char)}</span>`).join('');digits.dataset.readout=readout;}
  digits.dataset.length=String(readout.length);digits.setAttribute('aria-label',clockOnly?'Current time '+formatClock(t):`${overtime?'Overtime':'Time remaining'} ${timerText(remaining)}`);
  root.querySelector('[data-pc-overtime]').hidden=!overtime;root.querySelector('[data-pc-over-count]').textContent=overtime?'+'+timerText(remaining):'';
  const label=session.status==='paused'?'PAUSED':overtime?'OVERTIME':clockOnly?'CLOCK ONLY':'TIME REMAINING';
  const status=root.querySelector('[data-pc-state]');if(status.textContent!==label)status.textContent=label;
  root.querySelector('[data-pc-caption]').textContent=session.status==='paused'?'Countdown held · finishing time shifts on resume':overtime?'Bring it home.':clockOnly?'':modeNames[session.mode];
  const progress=root.querySelector('.pc-progress'),percentage=clockOnly?0:Math.min(100,Math.max(0,remaining/session.plannedMs*100));progress.style.setProperty('--pc-progress',percentage+'%');progress.setAttribute('aria-valuenow',String(Math.round(percentage)));
  const pause=root.querySelector('[data-pc="pause"]');if(pause){const paused=session.status==='paused';pause.innerHTML=glyph(paused?'play':'pause')+`<span>${paused?'Resume':'Pause'}</span>`;pause.setAttribute('aria-label',paused?'Resume timer':'Pause timer');}
  const wakeLabel=root.querySelector('[data-pc-wake]');if(wakeLabel)wakeLabel.textContent=!prefs.wakeLock?'Screen awake off':wake&&!wake.released?'Screen stays awake':wakeMessage;
  const full=root.querySelector('[data-pc="fullscreen"]');if(full){full.innerHTML=glyph(document.fullscreenElement||root.classList.contains('pc-presentation')?'collapse':'expand');full.setAttribute('aria-label',document.fullscreenElement||root.classList.contains('pc-presentation')?'Exit fullscreen or presentation':'Fullscreen or presentation view');}
  if(lastWarning&&lastWarning!==warning){stage.classList.remove('pc-alert-entry');void stage.offsetWidth;stage.classList.add('pc-alert-entry');}
  lastWarning=warning;
 }
 function sampleClock(){
  const t=now(),p=performance.now();
  if(!document.hidden&&Math.abs((t-wall)-(p-mono))>2000){
   if(active()){const next=reconcileClockJump(session,t-wall,p-mono);if(next!==session){session=next;save();}clockNotice='Device time changed · check your finishing time.';}
  }
  wall=t;mono=p;
 }
 function schedule(){clearTimeout(timer);if(!root||document.hidden||view==='settings'||session?.status==='finished')return;const pace=session?.mode==='clock'&&!prefs.showSeconds?60000:1000;timer=setTimeout(()=>{sampleClock();update();schedule();},pace-now()%pace+15);}
 async function releaseWake(){const lock=wake;wake=null;if(lock)try{await lock.release();}catch{}}
 async function manageWake(){
  const wanted=root?.isConnected&&view!=='settings'&&active()&&prefs.wakeLock&&!document.hidden;
  if(!wanted){void releaseWake();return;}
  if(wake&&!wake.released||wakePending)return;
  if(!navigator.wakeLock?.request){wakeMessage='Set Auto-Lock manually · wake lock unavailable';update();return;}
  wakePending=true;
  try{
   const lock=await navigator.wakeLock.request('screen');wake=lock;wakeMessage='';
   lock.addEventListener('release',()=>{if(wake===lock)wake=null;wakeMessage='Screen may sleep · tap to keep awake';update();});
   if(!root?.isConnected||view==='settings'||!active()||!prefs.wakeLock||document.hidden)await releaseWake();
  }catch{wakeMessage='Screen may sleep · check Auto-Lock';}
  finally{wakePending=false;update();}
 }
 async function fullscreen(){
  if(document.fullscreenElement){await document.exitFullscreen?.();return;}
  if(root.classList.contains('pc-presentation')){root.classList.remove('pc-presentation');update();return;}
  root.classList.add('pc-presentation');
  if(root.requestFullscreen)try{await root.requestFullscreen();root.classList.remove('pc-presentation');}catch{notify('Presentation view is on. This browser keeps its own bars visible.');}
  else notify('Presentation view is on. Add Relay to your Home Screen for more space.');
  update();
 }
 function error(message){const field=root?.querySelector('[data-pc-error]');if(field)field.textContent=message;else notify(message);}
 function bindForms(){
  const start=root.querySelector('#pc-start-form');
  if(start){
   bindPicker(start);
   start.onchange=()=>{if(draft.mode==='end'){try{Object.assign(draft,readPicker(start));}catch{preview();return;}}if(draft.mode==='duration')draft.minutes=Number(start.elements.minutes.value);save();preview();};
   start.oninput=()=>preview();
   start.onsubmit=event=>{event.preventDefault();try{
    if(draft.mode==='end')Object.assign(draft,readPicker(start));
    if(draft.mode==='duration')draft.minutes=Number(start.elements.minutes.value);
    session=startSession(draft.mode,{finishAt:draft.mode==='end'?nextFinish(draft):undefined,minutes:draft.minutes});hiddenControls=false;clockNotice='';save();draw();
    if(prefs.fullscreen)void fullscreen();
   }catch(ex){error(ex.message);}};
  }
  const form=root.querySelector('#pc-settings-form');if(form)form.onsubmit=event=>{
   event.preventDefault();const data=new FormData(form),presets=String(data.get('presets')).split(',').map(v=>Number(v.trim())),yellow=Number(data.get('yellow')),orange=Number(data.get('orange'));
   if(presets.length>8||presets.some(v=>!Number.isFinite(v)||v<1||v>1440))return error('Enter one to eight presets, from 1 to 1,440 minutes.');
   if(!Number.isFinite(yellow)||!Number.isFinite(orange)||orange>=yellow)return error('Yellow must come before orange: use a larger number of minutes for yellow.');
   const next={...Object.fromEntries(data),presets,yellow,orange};for(const key of ['showSeconds','clock24','wakeLock','fullscreen','reducedMotion'])next[key]=data.has(key);
   prefs=clockPreferences(next);if(!active())draft.mode=prefs.defaultMode;save();go('#preachingclock');
  };
 }
 function showDialog(content){
  const dialog=root.querySelector('.pc-dialog');dialog.innerHTML=content;dialog.showModal();dialog.querySelector('button,input,select')?.focus();
  dialog.onclose=()=>{root.querySelector('[data-pc="pause"], [data-pc="finish"]')?.focus();};return dialog;
 }
 function confirmEnd(reset=false){
  const dialog=showDialog(`<h2 id="pc-dialog-title">${reset?'Reset this timer?':'Finish this session?'}</h2><p>${reset?'The active timer will be cleared. Your preferences stay saved.':'The timer will stop and your session summary will appear.'}</p><div class="pc-dialog-actions">${button('dismiss','Keep preaching',{cls:'pc-subtle'})}${button(reset?'confirm-reset':'confirm-finish',reset?'Reset timer':'Finish session',{cls:'pc-primary'})}</div>`);dialog.querySelector('[data-pc="dismiss"]').focus();
 }
 function editFinish(){
  const t=now(),deadline=session.status==='paused'?t+session.remainingMs:session.deadline;
  const dialog=showDialog(`<form id="pc-edit-finish"><h2 id="pc-dialog-title">Finish at</h2>${picker(timeParts(deadline),'edit')}<p class="pc-edit-preview"></p><div class="pc-dialog-actions">${button('dismiss','Cancel',{cls:'pc-subtle'})}<button class="pc-button pc-primary" type="submit">Update finish</button></div></form>`),form=dialog.querySelector('form');
  bindPicker(form);
  const preview=()=>{try{const target=nextFinish(readPicker(form,'edit'));dialog.querySelector('.pc-edit-preview').textContent=finishLabel(target)+' · '+timerText(target-now())+' remaining';}catch(error){dialog.querySelector('.pc-edit-preview').textContent=error.message;}};form.onchange=preview;form.oninput=preview;preview();
  form.onsubmit=event=>{event.preventDefault();try{session=setFinish(session,nextFinish(readPicker(form,'edit')));clockNotice='';save();dialog.close();update();}catch(error){dialog.querySelector('.pc-edit-preview').textContent=error.message;}};
 }
 async function leaveClockOnly(destination='setup'){
  if(session?.mode!=='clock')return;
  // Clock Only has no session summary to finish: return directly to a usable mode.
  session=null;hiddenControls=false;draft.mode=prefs.defaultMode==='clock'?'end':prefs.defaultMode;save();
  if(document.fullscreenElement===root)try{await document.exitFullscreen();}catch{}
  root?.classList.remove('pc-presentation');
  if(destination==='home'){go('#helm');return;}
  draw();root?.querySelector('.pc-modes [aria-pressed="true"]')?.focus();
 }
 async function click(event){
  const control=event.target.closest('[data-pc]');if(!control||!root?.contains(control))return;
  if(active())void manageWake();
  const action=control.dataset.pc;
  if(action==='clock-setup'||action==='clock-home'){await leaveClockOnly(action==='clock-home'?'home':'setup');return;}
  if(action==='home'){go('#helm');return;}
  if(action==='settings-home'){go('#settings');return;}
  if(action==='back'){go('#preachingclock');return;}
  if(action==='settings'){go('#preachingclocksettings');return;}
  if(action==='mode'){draft.mode=control.dataset.mode;save();draw();return;}
  if(action==='preset'){draft.minutes=Number(control.dataset.minutes);save();draw();return;}
  if(action==='pause'){session=session.status==='paused'?resumeSession(session):pauseSession(session);save();update();return;}
  if(action==='plus'||action==='minus'){session=adjustSession(session,(action==='plus'?1:-1)*300000);save();update();return;}
  if(action==='edit'){editFinish();return;}
  if(action==='finish'){if(session.mode==='clock'){session=finishSession(session);save();draw();}else confirmEnd();return;}
  if(action==='reset'){confirmEnd(true);return;}
  if(action==='dismiss'){root.querySelector('.pc-dialog').close();return;}
  if(action==='confirm-finish'||action==='confirm-reset'){
   root.querySelector('.pc-dialog').close();session=action==='confirm-reset'?null:finishSession(session);hiddenControls=false;save();if(document.fullscreenElement)await document.exitFullscreen?.();root.classList.remove('pc-presentation');draw();return;
  }
  if(action==='new'){session=null;draft.mode=prefs.defaultMode;hiddenControls=false;save();draw();return;}
  if(action==='hide'||action==='reveal'){hiddenControls=action==='hide';update();root.querySelector(action==='hide'?'[data-pc="reveal"]':'[data-pc="hide"]')?.focus();return;}
  if(action==='fullscreen'){await fullscreen();return;}
 }
 function mount(main,{settings=false}={}){
  const nextView=settings?'settings':'clock';
  if(root?.isConnected&&view===nextView){sampleClock();update();return;}
  clearTimeout(timer);view=nextView;
  if(!root?.isConnected){main.innerHTML='<div id="preaching-clock" class="pc-root"></div>';root=main.querySelector('#preaching-clock');root.addEventListener('click',event=>{void click(event).catch(ex=>notify(ex.message));});}
  hiddenControls=false;draw();
 }
 function unmount(){
  clearTimeout(timer);void releaseWake();if(root&&document.fullscreenElement===root)void document.exitFullscreen?.();root=null;view='';hiddenControls=false;wall=now();mono=performance.now();
 }
 document.addEventListener('visibilitychange',()=>{wall=now();mono=performance.now();if(!root)return;if(document.hidden){clearTimeout(timer);void releaseWake();}else{update();schedule();void manageWake();}});
 window.addEventListener('pageshow',()=>{wall=now();mono=performance.now();if(root){update();schedule();void manageWake();}});
 window.addEventListener('pagehide',()=>{if(active())save();clearTimeout(timer);void releaseWake();});
 document.addEventListener('fullscreenchange',()=>{if(root)update();});
 window.addEventListener('storage',event=>{
  if(event.key!==KEY)return;const value=loadSaved();prefs=clockPreferences(value.preferences);session=restoreSession(value.session);draft={...draft,...value.draft};if(root)draw();
 });
 document.addEventListener('keydown',event=>{if(!root)return;if(event.key==='Escape'&&!root.querySelector('.pc-dialog[open]')){if(hiddenControls){hiddenControls=false;update();}else if(root.classList.contains('pc-presentation')){root.classList.remove('pc-presentation');update();}}});
 return {mount,unmount};
}
