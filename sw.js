// 纪念币图片缓存 Service Worker
// 策略：Cache First（先查缓存，没有再请求网络并缓存）
const CACHE_NAME = 'coin-images-v1';

self.addEventListener('install', function(e) {
    self.skipWaiting();
});

self.addEventListener('activate', function(e) {
    e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', function(e) {
    var url = e.request.url;
    // 只缓存纪念币图片 (cbpm.cn 和 placehold.co)
    if (!/cbpm\.cn|placehold\.co/.test(url)) return;

    e.respondWith(
        caches.open(CACHE_NAME).then(function(cache) {
            return cache.match(e.request).then(function(cached) {
                if (cached) return cached;
                return fetch(e.request).then(function(response) {
                    if (response.ok && response.type === 'basic') {
                        cache.put(e.request, response.clone());
                    }
                    return response;
                }).catch(function() {
                    // 网络失败时返回缓存（如果有的话），否则返回占位图
                    return cached || new Response('', {status: 503});
                });
            });
        })
    );
});
