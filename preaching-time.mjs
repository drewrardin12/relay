// Timestamp-based preaching sessions. No network or ministry data dependencies.
export const CLOCK_DEFAULTS=Object.freeze({defaultMode:'end',presets:[20,25,30,35,40,45],yellow:10,orange:5,showSeconds:false,clock24:false,size:'large',wakeLock:true,fullscreen:false,reducedMotion:false,appearance:'glow'});
export function clockPreferences(input={}){
 const p={...CLOCK_DEFAULTS,...input},finite=(v,lo,hi)=>Number.isFinite(Number(v))&&Number(v)>=lo&&Number(v)<=hi;
 p.defaultMode=['end','duration','clock'].includes(p.defaultMode)?p.defaultMode:'end';
 p.presets=Array.isArray(p.presets)?[...new Set(p.presets.map(Number).filter(v=>finite(v,1,1440)))].slice(0,8):[];
 if(!p.presets.length)p.presets=[...CLOCK_DEFAULTS.presets];
 p.yellow=finite(p.yellow,0.5,180)?Number(p.yellow):10;
 p.orange=finite(p.orange,0,179.5)&&Number(p.orange)<p.yellow?Number(p.orange):Math.min(5,p.yellow/2);
 for(const key of ['showSeconds','clock24','wakeLock','fullscreen','reducedMotion'])p[key]=typeof p[key]==='boolean'?p[key]:CLOCK_DEFAULTS[key];
 p.size=['balanced','large','maximum'].includes(p.size)?p.size:'large';
 p.appearance=['glow','border'].includes(p.appearance)?p.appearance:'glow';
 return p;
}
export function nextFinish({hour,minute,period},now=Date.now()){
 hour=Number(hour);minute=Number(minute);
 if(!Number.isInteger(hour)||hour<1||hour>12||!Number.isInteger(minute)||minute<0||minute>59||!['AM','PM'].includes(period))throw Error('Choose a valid finishing time.');
 const target=new Date(now);target.setHours(hour%12+(period==='PM'?12:0),minute,0,0);
 if(+target<=now)target.setDate(target.getDate()+1);
 return +target;
}
export function timeParts(timestamp){const d=new Date(timestamp);return {hour:d.getHours()%12||12,minute:d.getMinutes(),period:d.getHours()>=12?'PM':'AM'};}
export function clockText(timestamp,{clock24=false,showSeconds=false}={}){return new Date(timestamp).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',...(showSeconds?{second:'2-digit'}:{}),hourCycle:clock24?'h23':'h12'});}
export function startSession(mode,{finishAt,minutes=30}={},now=Date.now()){
 if(!['end','duration','clock'].includes(mode))throw Error('Choose a clock mode.');
 const deadline=mode==='clock'?null:mode==='end'?Number(finishAt):now+Number(minutes)*60000;
 if(mode!=='clock'&&(!Number.isFinite(deadline)||deadline<=now||mode==='duration'&&(!Number.isFinite(Number(minutes))||Number(minutes)<1||Number(minutes)>1440)))throw Error('Choose a finish time ahead of now, or a duration from 1 to 1,440 minutes.');
 return {version:1,id:globalThis.crypto?.randomUUID?.()||String(now),mode,status:'running',startedAt:now,activeStartedAt:now,elapsedBeforePause:0,deadline,plannedMs:deadline===null?0:deadline-now,pausedAt:null,remainingMs:null,finishedAt:null};
}
export function restoreSession(value){
 if(!value||value.version!==1||!['end','duration','clock'].includes(value.mode)||!['running','paused','finished'].includes(value.status)||!Number.isFinite(value.startedAt)||!Number.isFinite(value.elapsedBeforePause)||!Number.isFinite(value.activeStartedAt))return null;
 if(value.mode!=='clock'&&(!Number.isFinite(value.deadline)||!Number.isFinite(value.plannedMs)||value.plannedMs<=0))return null;
 if(value.status==='paused'&&(!Number.isFinite(value.pausedAt)||!Number.isFinite(value.remainingMs)))return null;
 if(value.status==='finished'&&(!Number.isFinite(value.finishedAt)||value.mode!=='clock'&&!Number.isFinite(value.remainingMs)))return null;
 return {...value};
}
export function remainingTime(s,now=Date.now()){
 if(s.mode==='clock')return null;
 return s.status==='paused'||s.status==='finished'?s.remainingMs:s.deadline-now;
}
export function elapsedTime(s,now=Date.now()){return Math.max(0,s.elapsedBeforePause+(s.status==='running'?now-s.activeStartedAt:0));}
export function warningState(remaining,prefs=CLOCK_DEFAULTS){return remaining===null?'normal':remaining<=0?'overtime':remaining<=prefs.orange*60000?'orange':remaining<=prefs.yellow*60000?'yellow':'normal';}
export function timerText(milliseconds){
 const seconds=milliseconds>0?Math.ceil(milliseconds/1000):Math.floor(Math.abs(milliseconds)/1000),h=Math.floor(seconds/3600),m=Math.floor(seconds%3600/60),s=seconds%60;
 return (h?h+':':'')+String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');
}
export function pauseSession(s,now=Date.now()){
 if(s.status!=='running'||s.mode==='clock')return s;
 return {...s,status:'paused',pausedAt:now,remainingMs:remainingTime(s,now),elapsedBeforePause:elapsedTime(s,now)};
}
export function resumeSession(s,now=Date.now()){
 if(s.status!=='paused')return s;
 return {...s,status:'running',deadline:now+s.remainingMs,startedAt:s.startedAt+(now-s.pausedAt),activeStartedAt:now,pausedAt:null,remainingMs:null};
}
export function adjustSession(s,deltaMs,now=Date.now()){
 if(s.mode==='clock'||s.status==='finished'||!Number.isFinite(deltaMs))return s;
 return {...s,deadline:s.deadline+deltaMs,plannedMs:Math.max(1000,s.plannedMs+deltaMs),remainingMs:s.status==='paused'?s.remainingMs+deltaMs:null};
}
export function setFinish(s,deadline,now=Date.now()){
 if(!Number.isFinite(deadline)||s.mode==='clock')throw Error('Choose a finishing time.');
 const before=s.status==='paused'?now+s.remainingMs:s.deadline;
 return {...adjustSession(s,deadline-before,now),deadline};
}
export function finishSession(s,now=Date.now()){return {...s,status:'finished',remainingMs:remainingTime(s,now),elapsedBeforePause:elapsedTime(s,now),finishedAt:now};}
// A duration is elapsed time, so a manual device-clock jump must not change its length.
// End At follows the actual device clock. Visibility resets the monotonic sample,
// because some platforms suspend performance.now() during device sleep.
export function reconcileClockJump(s,wallDelta,monotonicDelta){
 const jump=wallDelta-monotonicDelta;
 if(!s||s.status!=='running'||s.mode!=='duration'||!Number.isFinite(jump)||Math.abs(jump)<2000)return s;
 return {...s,deadline:s.deadline+jump,startedAt:s.startedAt+jump,activeStartedAt:s.activeStartedAt+jump};
}
