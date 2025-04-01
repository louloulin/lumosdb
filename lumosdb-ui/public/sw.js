// 这个文件会被next-pwa替换，但我们需要提供一个基本实现
self.addEventListener('install', (event) => {
  self.skipWaiting();
  console.log('Service Worker installed');
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activated');
});

self.addEventListener('fetch', (event) => {
  // 默认的fetch处理，next-pwa会替换为更复杂的实现
  event.respondWith(fetch(event.request));
}); 