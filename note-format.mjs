const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Store readable text only. Rendering never accepts user-supplied HTML.
export function renderNote(value,depth=0){
 if(depth>12)return escape(value);
 const text=String(value??''),pattern=/(\*\*\*|\*\*|__|\*)([^\n]+?)\1/g;let result='',end=0,match;
 while((match=pattern.exec(text))){result+=escape(text.slice(end,match.index));const tag=match[1]==='***'?'strong':match[1]==='**'?'strong':match[1]==='__'?'u':'em';result+='<'+tag+'>'+(match[1]==='***'?'<em>'+renderNote(match[2],depth+1)+'</em>':renderNote(match[2],depth+1))+'</'+tag+'>';end=pattern.lastIndex;}
 return (result+escape(text.slice(end))).replace(/\r?\n/g,'<br>');
}
export function formatSelection(value,start,end,marker){
 const selected=value.slice(start,end)||'text';
 if(start>=marker.length&&value.slice(start-marker.length,start)===marker&&value.slice(end,end+marker.length)===marker)return {value:value.slice(0,start-marker.length)+selected+value.slice(end+marker.length),start:start-marker.length,end:end-marker.length};
 return {value:value.slice(0,start)+marker+selected+marker+value.slice(end),start:start+marker.length,end:start+marker.length+selected.length};
}
export function installNoteEditors(){
 const attach=root=>{for(const area of root.querySelectorAll('textarea')){if(area.dataset.noteEditor||!/(notes?|details|journal|outreach)/i.test(area.name))continue;area.dataset.noteEditor='true';const label=area.closest('label');if(label&&!area.hasAttribute('aria-label'))area.setAttribute('aria-label',[...label.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent).join(' ').trim()||'Notes');const bar=document.createElement('span');bar.className='note-format-toolbar';bar.setAttribute('role','group');bar.setAttribute('aria-label','Note formatting');
  for(const [label,marker,tag] of [['Bold','**','strong'],['Italic','*','em'],['Underline','__','u']]){const button=document.createElement('button');button.type='button';button.title=label;button.setAttribute('aria-label',label);const glyph=document.createElement(tag);glyph.textContent=label[0];button.append(glyph);button.onpointerdown=event=>event.preventDefault();button.onclick=event=>{event.preventDefault();event.stopPropagation();const next=formatSelection(area.value,area.selectionStart,area.selectionEnd,marker);area.value=next.value;area.focus();area.setSelectionRange(next.start,next.end);area.dispatchEvent(new Event('input',{bubbles:true}));};bar.append(button);}area.before(bar);
  const preview=document.createElement('div');preview.className='note-format-preview';preview.setAttribute('aria-label','Formatted note preview');const update=()=>{preview.hidden=!area.value;preview.innerHTML=renderNote(area.value);};area.after(preview);area.addEventListener('input',update);update();
 }};
 attach(document);new MutationObserver(changes=>{if(changes.some(c=>[...c.addedNodes].some(n=>n.nodeType===1&&(n.matches('textarea')||n.querySelector('textarea')))))attach(document);}).observe(document.body,{childList:true,subtree:true});
}
