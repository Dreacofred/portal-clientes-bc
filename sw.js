const CACHE_NAME = 'bc-clientes-v2'; // Subimos a la versión 2
const urlsToCache = [
  '/',
  '/index.html',
  '/login.html',
  '/style.css',
  '/app.js',
  '/exportar.html',
  '/exportar.js'
];

// 1. INSTALACIÓN: Guarda los archivos básicos
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
  // Fuerza al Service Worker a instalarse inmediatamente
  self.skipWaiting(); 
});

// 2. ACTIVACIÓN: El "camión de basura" que borra la versión vieja (v1)
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Borrando caché antigua:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Asegura que los clientes tomen la nueva versión al instante
  self.clients.claim();
});

// 3. ESTRATEGIA DE LECTURA: "Red Primero" (Network First)
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Si hay internet, trae la versión más nueva y de paso actualiza la caché oculta
        const resClone = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, resClone);
        });
        return response;
      })
      .catch(() => {
        // Si NO hay internet o falla la red, recién ahí muestra lo que tiene guardado
        return caches.match(event.request);
      })
  );
});
