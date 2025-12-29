const CACHE_NAME = 'word-filter-v9';
const ASSETS_TO_CACHE = [
  '/coretest/',
  '/coretest/index.html',
  '/coretest/styles.css',
  '/coretest/script.js',
  '/coretest/manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css'
];

// Install event - cache assets and skip waiting
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => {
        // Skip waiting to activate immediately
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches and claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      // Delete ALL old caches, including current one if version changed
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Claim all clients immediately
      return self.clients.claim();
    }).then(() => {
      // Send message to all clients to reload
      return self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({ type: 'SW_ACTIVATED', cacheName: CACHE_NAME });
        });
      });
    })
  );
});

// Listen for messages from clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
    }).then(() => {
      event.ports[0].postMessage({ success: true });
    });
  }
});

// Fetch event - network first with cache busting for app files
self.addEventListener('fetch', (event) => {
  // For HTML, CSS, and JS files, always check network first
  const url = new URL(event.request.url);
  const isAppFile = url.pathname.includes('/coretest/') && 
                    (url.pathname.endsWith('.html') || 
                     url.pathname.endsWith('.css') || 
                     url.pathname.endsWith('.js'));
  
  if (isAppFile) {
    // Network first strategy with cache busting for app files
    event.respondWith(
      fetch(event.request, {
        cache: 'no-store', // Don't use browser cache
        headers: {
          'Cache-Control': 'no-cache'
        }
      })
        .then((response) => {
          // If network request succeeds, update cache and return response
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseClone);
              });
          }
          return response;
        })
        .catch(() => {
          // If network fails, serve from cache
          return caches.match(event.request);
        })
    );
  } else {
    // Cache first strategy for other resources (images, fonts, etc.)
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          if (response) {
            return response;
          }
          return fetch(event.request)
            .then((response) => {
              // Cache new responses
              if (response && response.status === 200) {
                const responseClone = response.clone();
                caches.open(CACHE_NAME)
                  .then((cache) => {
                    cache.put(event.request, responseClone);
                  });
              }
              return response;
            });
        })
    );
  }
}); 