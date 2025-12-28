// Terry WMS Service Worker v1.0
const CACHE_NAME = 'wms-mobile-v1';
const urlsToCache = [
    './',
    './index.html',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-solid-900.woff2',
    'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js'
];

// 安裝事件 - 快取靜態資源
self.addEventListener('install', function(event) {
    console.log('[SW] 安裝中...');
    event.waitUntil(
        caches.open(CACHE_NAME).then(function(cache) {
            console.log('[SW] 快取靜態資源');
            return cache.addAll(urlsToCache);
        })
    );
    self.skipWaiting();
});

// 啟動事件 - 清理舊快取
self.addEventListener('activate', function(event) {
    console.log('[SW] 啟動中...');
    event.waitUntil(
        caches.keys().then(function(cacheNames) {
            return Promise.all(
                cacheNames.filter(function(cacheName) {
                    return cacheName !== CACHE_NAME;
                }).map(function(cacheName) {
                    console.log('[SW] 刪除舊快取:', cacheName);
                    return caches.delete(cacheName);
                })
            );
        })
    );
    self.clients.claim();
});

// 攔截請求 - 快取優先策略
self.addEventListener('fetch', function(event) {
    // 跳過 Firebase 請求（需要即時資料）
    if (event.request.url.includes('firestore.googleapis.com') ||
        event.request.url.includes('firebase')) {
        return;
    }
    
    event.respondWith(
        caches.match(event.request).then(function(response) {
            // 快取命中，返回快取
            if (response) {
                return response;
            }
            
            // 嘗試從網路獲取
            return fetch(event.request).then(function(response) {
                // 檢查是否為有效回應
                if (!response || response.status !== 200 || response.type !== 'basic') {
                    return response;
                }
                
                // 快取新資源
                var responseToCache = response.clone();
                caches.open(CACHE_NAME).then(function(cache) {
                    cache.put(event.request, responseToCache);
                });
                
                return response;
            }).catch(function() {
                // 網路失敗，返回離線頁面（如果有）
                console.log('[SW] 網路請求失敗:', event.request.url);
            });
        })
    );
});

// 接收主程式訊息
self.addEventListener('message', function(event) {
    if (event.data.action === 'skipWaiting') {
        self.skipWaiting();
    }
});
