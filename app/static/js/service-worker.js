/**
 * Service Worker for WOL Manager
 * Provides offline functionality and caching
 */

// Cache version - change this when content changes
const CACHE_VERSION = 'wol-manager-v1';

// Static assets to cache on install
const STATIC_CACHE = [
  '/',
  '/static/css/modules/main.css',
  '/static/css/modules/animations.css',
  '/static/css/modules/buttons.css',
  '/static/css/modules/components.css',
  '/static/css/modules/forms.css',
  '/static/css/modules/layout.css',
  '/static/css/modules/responsive.css',
  '/static/css/modules/tables.css',
  '/static/css/modules/themes.css',
  '/static/css/modules/toast.css',
  '/static/css/modules/variables.css',
  '/static/js/animations.js',
  '/static/js/main.js',
  '/static/js/toast.js',
  '/static/js/ping.js',
  '/static/img/wol-manager-logo.png',
  '/static/img/wol-manager-title.png',
  '/static/img/favicon.ico',
  '/static/img/favicon.png'
];

// Install event - cache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => {
        console.log('[Service Worker] Caching static assets');
        return cache.addAll(STATIC_CACHE);
      })
      .then(() => {
        console.log('[Service Worker] Installation complete');
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_VERSION) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[Service Worker] Activated and claiming clients');
      return self.clients.claim();
    })
  );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', event => {
  // Skip non-GET requests and browser extensions
  if (event.request.method !== 'GET' || event.request.url.startsWith('chrome-extension://')) {
    return;
  }
  
  // Skip AJAX requests and API calls
  if (event.request.headers.get('accept')?.includes('application/json') || 
      event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached response if found
        if (response) {
          return response;
        }
        
        // Clone the request - request can only be used once
        const fetchRequest = event.request.clone();
        
        // Make network request
        return fetch(fetchRequest).then(response => {
          // Check if valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          // Clone the response - response can only be used once
          const responseToCache = response.clone();
          
          // Cache the fetched response
          caches.open(CACHE_VERSION).then(cache => {
            cache.put(event.request, responseToCache);
          });
          
          // Return the network response
          return response;
        });
      })
      .catch(error => {
        console.error('[Service Worker] Fetch error:', error);
        // You could return a custom offline page here
      })
  );
});

// Handle messages from clients
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
}); 