const CACHE_NAME = 'cofrinho-v3'; // Mude o número sempre que alterar algo

const ASSETS = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json'
];

// Instalação do Service Worker
self.addEventListener('install', (e) => {
  self.skipWaiting(); // OBRIGA o novo Service Worker a assumir imediatamente
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

// Ativação e limpeza de cache antigo
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key); // Apaga as versões antigas da memória
          }
        })
      );
    }).then(() => self.clients.claim()) // OBRIGA a controlar a tela inicial imediatamente
  );
});

// Resposta com cache / rede
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((res) => res || fetch(e.request))
  );
});
