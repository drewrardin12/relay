const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Store readable text only. Rendering never accepts user-supplied HTML.
function renderInline(value,depth=0){
 if(depth>12)return escape(value);
 const text=String(value??''),pattern=/(\*\*\*|\*\*|__|\*)([^\n]+?)\1/g;let result='',end=0,match;
 while((match=pattern.exec(text))){result+=escape(text.slice(end,match.index));const tag=match[1]==='***'?'strong':match[1]==='**'?'strong':match[1]==='__'?'u':'em';result+='<'+tag+'>'+(match[1]==='***'?'<em>'+renderInline(match[2],depth+1)+'</em>':renderInline(match[2],depth+1))+'</'+tag+'>';end=pattern.lastIndex;}
 return (result+escape(text.slice(end))).replace(/\r?\n/g,'<br>');
}
const listItem=line=>line.match(/^\s*(?:([-*•])\s+|(\d+)[.)]\s+)(.*)$/);
export function renderNote(value){
 const lines=String(value??'').replace(/\r\n/g,'\n').split('\n');
 if(!lines.some(listItem))return renderInline(value);
 let html='',i=0;
 while(i<lines.length){
  const item=listItem(lines[i]);
  if(!item){const plain=[];while(i<lines.length&&!listItem(lines[i]))plain.push(lines[i++]);html+=renderInline(plain.join('\n'));if(i<lines.length&&plain.at(-1)!=='')html+='<br>';continue;}
  const tag=item[2]?'ol':'ul';html+='<'+tag+(tag==='ol'&&Number(item[2])!==1?' start="'+Number(item[2])+'"':'')+' class="note-list">';
  while(i<lines.length){const row=listItem(lines[i]);if(!row||(row[2]?'ol':'ul')!==tag)break;html+='<li>'+renderInline(row[3])+'</li>';i++;}
  html+='</'+tag+'>';
 }
 return html;
}
export function formatListSelection(value,start,end,kind){
 const from=start===0?0:value.lastIndexOf('\n',start-1)+1;
 const last=end>start&&value[end-1]==='\n'?end-1:end;
 const lineEnd=value.indexOf('\n',last),to=lineEnd<0?value.length:lineEnd;
 const lines=value.slice(from,to).split('\n'),matches=lines.map(listItem);
 const remove=matches.every(m=>m&&(kind==='numbered'?Boolean(m[2]):Boolean(m[1])));
 const changed=lines.map((line,i)=>{const m=matches[i],text=m?m[3]:line;return remove?text:(kind==='numbered'?(i+1)+'. ':'- ')+text;}).join('\n');
 return {value:value.slice(0,from)+changed+value.slice(to),start:from,end:from+changed.length};
}
export function continueNoteList(value,start,end){
 if(start!==end)return null;
 const from=start===0?0:value.lastIndexOf('\n',start-1)+1,line=value.slice(from,start),m=listItem(line);
 if(!m)return null;
 if(!m[3].trim())return {value:value.slice(0,from)+value.slice(end),start:from,end:from};
 const insert='\n'+(m[2]?(Number(m[2])+1)+'. ':'- '),position=start+insert.length;
 return {value:value.slice(0,start)+insert+value.slice(end),start:position,end:position};
}
export function formatSelection(value,start,end,marker){
 const selected=value.slice(start,end)||'text';
 if(start>=marker.length&&value.slice(start-marker.length,start)===marker&&value.slice(end,end+marker.length)===marker)return {value:value.slice(0,start-marker.length)+selected+value.slice(end+marker.length),start:start-marker.length,end:end-marker.length};
 return {value:value.slice(0,start)+marker+selected+marker+value.slice(end),start:start+marker.length,end:start+marker.length+selected.length};
}
export function installNoteEditors(){
 const attach=root=>{for(const area of root.querySelectorAll('textarea')){if(area.dataset.noteEditor||!/(notes?|details|journal|outreach)/i.test(area.name))continue;area.dataset.noteEditor='true';const label=area.closest('label');if(label&&!area.hasAttribute('aria-label'))area.setAttribute('aria-label',[...label.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent).join(' ').trim()||'Notes');const bar=document.createElement('span');bar.className='note-format-toolbar';bar.setAttribute('role','group');bar.setAttribute('aria-label','Note formatting');
  for(const [label,marker,tag] of [['Bold','**','strong'],['Italic','*','em'],['Underline','__','u']]){const button=document.createElement('button');button.type='button';button.title=label;button.setAttribute('aria-label',label);const glyph=document.createElement(tag);glyph.textContent=label[0];button.append(glyph);button.onpointerdown=event=>event.preventDefault();button.onclick=event=>{event.preventDefault();event.stopPropagation();const next=formatSelection(area.value,area.selectionStart,area.selectionEnd,marker);area.value=next.value;area.focus();area.setSelectionRange(next.start,next.end);area.dispatchEvent(new Event('input',{bubbles:true}));};bar.append(button);}area.before(bar);
  const apply=next=>{area.value=next.value;area.focus();area.setSelectionRange(next.start,next.end);area.dispatchEvent(new Event('input',{bubbles:true}));};
  for(const [label,kind,glyph] of [['Bullet list','bullets','• ≡'],['Numbered list','numbered','1. ≡']]){const button=document.createElement('button');button.type='button';button.title=label;button.setAttribute('aria-label',label);button.textContent=glyph;button.onpointerdown=event=>event.preventDefault();button.onclick=event=>{event.preventDefault();event.stopPropagation();apply(formatListSelection(area.value,area.selectionStart,area.selectionEnd,kind));};bar.append(button);}
  area.addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing){const next=continueNoteList(area.value,area.selectionStart,area.selectionEnd);if(next){event.preventDefault();apply(next);}}});
  const preview=document.createElement('div');preview.className='note-format-preview';preview.setAttribute('aria-label','Formatted note preview');const update=()=>{preview.hidden=!area.value;preview.innerHTML=renderNote(area.value);};area.after(preview);area.addEventListener('input',update);update();
 }};
 attach(document);new MutationObserver(changes=>{if(changes.some(c=>[...c.addedNodes].some(n=>n.nodeType===1&&(n.matches('textarea')||n.querySelector('textarea')))))attach(document);}).observe(document.body,{childList:true,subtree:true});
}
