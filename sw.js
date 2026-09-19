const CACHE='relay-shell-v8-github-auto-sync';
const SHELL=['./','index.html','styles.css','polish.css','app.mjs','domain.mjs','icons.mjs','seed.mjs','store.mjs','tide-reconciliation.mjs','contact-polish.mjs','finance.mjs','finance-plan.mjs','manifest.webmanifest','logo.png','logo-transparent.svg','helm.webp','manifest.webp','voyage.webp','tides.webp','contours.svg','parchment.svg'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL))));
SHELL.push('relay-icon-180.png','relay-icon-192.png','relay-icon-512.png');
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('relay-shell-')&&key!==CACHE).map(key=>caches.delete(key))))));
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(url.origin!==self.location.origin||event.request.method!=='GET')return;
 // Never cache calendar/account/Sheets responses or private records.
 event.respondWith(fetch(event.request).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));}return response;}).catch(()=>caches.match(event.request)));
});
