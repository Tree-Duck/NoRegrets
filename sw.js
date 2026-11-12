/* No Regrets offline cache. Bump VERSION whenever the app files change. */
var VERSION='nr-v4';
var CORE=['./','index.html','manifest.webmanifest','icon-192.png','icon-512.png','icon-maskable-512.png'];
self.addEventListener('install',function(e){
  e.waitUntil(caches.open(VERSION).then(function(c){return c.addAll(CORE)}).then(function(){return self.skipWaiting()}));
});
self.addEventListener('activate',function(e){
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.filter(function(k){return k.indexOf('nr-')===0&&k!==VERSION}).map(function(k){return caches.delete(k)}));
  }).then(function(){return self.clients.claim()}));
});
self.addEventListener('fetch',function(e){
  var req=e.request;
  if(req.method!=='GET')return;
  var url=new URL(req.url);
  var isFont=url.hostname==='fonts.googleapis.com'||url.hostname==='fonts.gstatic.com';
  if(url.origin!==self.location.origin&&!isFont)return;
  if(isFont){
    /* Fonts never change: cache first. */
    e.respondWith(caches.match(req).then(function(hit){
      return hit||fetch(req).then(function(res){
        if(res&&res.ok){var copy=res.clone();caches.open(VERSION).then(function(c){return c.put(req,copy)}).catch(function(){})}return res;
      });
    }));
    return;
  }
  /* App files: network first so updates arrive, cache when offline. */
  e.respondWith(fetch(req).then(function(res){
    if(res&&res.ok){var copy=res.clone();caches.open(VERSION).then(function(c){return c.put(req,copy)}).catch(function(){})}
    return res;
  }).catch(function(){
    return caches.match(req,{ignoreSearch:true}).then(function(hit){return hit||(req.mode==='navigate'?caches.match('index.html'):Response.error())});
  }));
});
