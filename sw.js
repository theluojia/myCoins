// 纪念币图片缓存 Service Worker
// 策略：Stale While Revalidate（缓存优先 + 后台静默更新）
const CACHE_NAME = 'coin-images-v3';

self.addEventListener('install', function(e) {
    self.skipWaiting();
});

self.addEventListener('activate', function(e) {
    e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', function(e) {
    var url = e.request.url;
    // 缓存纪念币图片（本地 + 外链）
    if (!/cbpm\.cn|placehold\.co|coins\/img\//.test(url)) return;

    e.respondWith(
        caches.open(CACHE_NAME).then(function(cache) {
            return cache.match(e.request).then(function(cached) {
                var fetchPromise = fetch(e.request).then(function(response) {
                    if (response.ok && response.type === 'basic') {
                        cache.put(e.request, response.clone());
                    }
                    return response;
                }).catch(function() {
                    // 网络失败，静默忽略
                });

                // 有缓存直接返回，后台更新；没缓存等网络
                return cached || fetchPromise;
            });
        })
    );
});
