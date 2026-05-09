// Service Worker for 勞保老年年金試算表
// 版本控制：每次更新 HTML 後，把版號 +1，使用者下次開啟會自動更新快取
const CACHE_VERSION = 'v1.0.0';
const CACHE_NAME = `labor-pension-calculator-${CACHE_VERSION}`;

// 要快取的核心檔案
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// 安裝時：預先快取核心檔案
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CORE_ASSETS).catch((err) => {
        console.warn('部分檔案快取失敗：', err);
      });
    })
  );
  // 跳過等待，立即啟用新版
  self.skipWaiting();
});

// 啟用時：清除舊版快取
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key.startsWith('labor-pension-calculator-') && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    })
  );
  // 立即接管所有 client
  self.clients.claim();
});

// 攔截請求：先看快取，沒有再從網路取得（Cache First 策略）
self.addEventListener('fetch', (event) => {
  // 只處理 GET 請求
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // 背景更新快取（不阻塞使用者）
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.ok) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, networkResponse.clone());
            });
          }
        }).catch(() => {});
        return cachedResponse;
      }
      // 沒快取就走網路
      return fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.ok) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      }).catch(() => {
        // 離線時若連 fallback 都沒有，回傳一個簡單錯誤頁面
        return new Response('離線中，請連線後再試', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      });
    })
  );
});
