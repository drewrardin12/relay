const CACHE='relay-shell-v23-field-card';
const SHELL=['./','index.html','styles.css','polish.css','src/app.mjs','src/us-map.mjs','src/domain.mjs','src/icons.mjs','src/seed.mjs','src/store.mjs','src/tide-reconciliation.mjs','src/contact-polish.mjs','src/meeting-debrief.mjs','src/device-activity.mjs','src/data-health.mjs','src/calendar-sync.mjs','src/finance.mjs','src/finance-plan.mjs','manifest.webmanifest','assets/logo.png','assets/logo-transparent.svg','assets/helm.webp','assets/manifest.webp','assets/voyage.webp','assets/tides.webp','assets/contours.svg','assets/parchment.svg'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting())));
SHELL.push('assets/relay-icon-180.png','assets/relay-icon-192.png','assets/relay-icon-512.png');
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('relay-shell-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting();});
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(url.origin!==self.location.origin||event.request.method!=='GET')return;
 // Never cache calendar/account/Sheets responses or private records.
 event.respondWith(fetch(event.request).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));}return response;}).catch(()=>caches.match(event.request)));
});
