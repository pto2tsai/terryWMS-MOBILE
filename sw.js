// Terry WMS Service Worker v2.0 (拆分版)
const CACHE_NAME = 'wms-mobile-v2';
const urlsToCache = [
    './',
    './index.html',
    './manifest.json',
    './css/main.css',
    './js/firebase-init.js',
    './js/scanner.js',
    './js/inventory-log.js',
    './js/dispatch-orders.js',
    './js/ui.js',
    './js/feedback.js',
    './js/picking.js',
    './js/inbound-task.js',
    './js/dispatch.js',
    './js/query.js',
    './js/stocktake.js',
    './js/stocktake-batch.js',
    './js/scan-operations.js',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js'
];

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

self.addEventListener('activate', function(event) {
    console.log('[SW] 啟動中...');
    event.waitUntil(
        caches.keys().then(function(cacheNames) {
            return Promise.all(
                cacheNames.filter(function(cacheName) {
                    return cacheName !== CACHE_NAME;
                }).map(function(cacheName) {
                    return caches.delete(cacheName);
                })
            );
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', function(event) {
    if (event.request.url.includes('firestore.googleapis.com') ||
        event.request.url.includes('firebase') ||
        event.request.url.includes('gstatic.com')) {
        return;
    }
    
    event.respondWith(
        caches.match(event.request).then(function(response) {
            if (response) return response;
            return fetch(event.request).catch(function() {
                console.log('[SW] 網路請求失敗:', event.request.url);
            });
        })
    );
});
