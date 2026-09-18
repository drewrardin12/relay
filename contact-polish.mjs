export function locationLabel(c){
 const region=String(c.state||'').trim(),city=String(c.city||'').trim();
 const parts=city.split(',').map(s=>s.trim()).filter(Boolean);
 while(region&&parts.at(-1)?.toLowerCase()===region.toLowerCase())parts.pop();
 return [...parts,region].filter(Boolean).join(', ');
}
export function visitedStates(state){
 const found=new Set();
 for(const log of state.logs||[]){if(log.type!=='visit'||log.date>new Date().toISOString().slice(0,10))continue;const c=state.contacts.find(c=>c.id===log.contactId);if(c?.state)found.add(c.state);}
 // Calendar history is scheduled evidence, not verified attendance. Manual corrections win.
 for(const [region,visited] of Object.entries(state.settings.visitedStates||{})){if(visited)found.add(region);else found.delete(region);}
 return found;
}
export async function contactPhoto(file){
 if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw Error('Choose a JPG, PNG or WebP photo.');
 if(file.size>15*1024*1024)throw Error('Choose a photo smaller than 15 MB.');
 const bitmap=await createImageBitmap(file),canvas=document.createElement('canvas');
 canvas.width=canvas.height=320;const side=Math.min(bitmap.width,bitmap.height);
 canvas.getContext('2d').drawImage(bitmap,(bitmap.width-side)/2,(bitmap.height-side)/2,side,side,0,0,320,320);
 bitmap.close();return canvas.toDataURL('image/jpeg',.82);
}
