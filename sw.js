const CACHE='relay-shell-v103-quick-amenities';
const STATE_SEARCH_SHELL=['state-search.mjs?v=20261022','amenity-status.mjs?v=20261022','map-style.mjs?v=20261022','course-planner.mjs?v=20261022-ios','lodging.mjs?v=20261022-ios'];
const SHELL=['./','index.html','styles.css','polish.css','app.mjs','contact-actions.mjs','realtime-sync.mjs','contact-cleanup.mjs','us-map.mjs','domain.mjs','icons.mjs','seed.mjs','store.mjs','polarsteps-journal.mjs','tide-reconciliation.mjs','contact-polish.mjs','meeting-debrief.mjs','device-activity.mjs','data-health.mjs','calendar-sync.mjs','finance.mjs','finance-plan.mjs','manifest.webmanifest','logo.png','logo-transparent.svg','helm.webp','manifest.webp','voyage.webp','tides.webp','contours.svg','parchment.svg'];
SHELL.push('nav-dock.mjs?v=20261022-report','finance-report.mjs?v=20261022-report','finance-plan.mjs?v=20261022-report');
SHELL.push('church-giving.mjs?v=20261022');
SHELL.push('app.mjs?v=20261027-low-read','realtime-sync.mjs?v=20261027-low-read','sync-engine.mjs','sync-engine.mjs?v=20261027-low-read','local-database.mjs','local-database.mjs?v=20261027-low-read','calendar-sync.mjs?v=20261027-cancellations','meeting-debrief.mjs?v=20261027-cancellations');
SHELL.push('app.mjs?v=20261027-call-duration','device-activity.mjs?v=20261027-call-duration');
SHELL.push('app.mjs?v=20261027-lodging','polish.css?v=20261027-lodging','lodging.mjs?v=20261027-lodging','course-planner.mjs?v=20261027-lodging','map-style.mjs?v=20261027-lodging');
SHELL.push('app.mjs?v=20261027-lodging-types','lodging.mjs?v=20261027-lodging-types');
SHELL.push('app.mjs?v=20261027-clock','preaching-clock.mjs?v=20261027-clock','preaching-time.mjs?v=20261027-clock','preaching-clock.css?v=20261027-clock');
SHELL.push('preaching-clock.css?v=20261027-clock-visibility');
SHELL.push('app.mjs?v=20261027-settings','settings-design.mjs?v=20261027-settings','settings-design.css?v=20261027-settings');
SHELL.push('app.mjs?v=20261028-flip-clock','preaching-clock.mjs?v=20261028-flip-clock','preaching-clock.css?v=20261028-flip-clock','clock-digits.ttf','clock-font-license.txt');
SHELL.push('app.mjs?v=20261028-clock-exit','preaching-clock.mjs?v=20261028-clock-exit','preaching-clock.css?v=20261028-clock-exit');
SHELL.push('app.mjs?v=20261028-quick-amenities','amenity-status.mjs?v=20261028-quick-amenities','lodging.mjs?v=20261028-quick-amenities','polish.css?v=20261028-quick-amenities');
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll([...SHELL,...STATE_SEARCH_SHELL].map(url=>new Request(url,{cache:'reload'})))).then(()=>self.skipWaiting())));
SHELL.push('relay-icon-180.png','relay-icon-192.png','relay-icon-512.png');
SHELL.push('chart-manifest.svg?v=20261022','chart-voyage.svg?v=20261022','chart-tides.svg?v=20261022');
SHELL.push('chart-helm.svg?v=20261022');
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('relay-shell-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting();});
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(url.origin!==self.location.origin||event.request.method!=='GET')return;
 // Never cache calendar/account/Sheets responses or private records.
 // Bypass Safari's HTTP cache online; the shell cache remains the offline fallback.
 event.respondWith(fetch(event.request,{cache:'no-store'}).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));}return response;}).catch(()=>caches.match(event.request)));
});
