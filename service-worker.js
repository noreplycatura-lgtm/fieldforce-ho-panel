// ============================================
// SERVICE WORKER - BACKGROUND SYNC & CACHE
// ============================================

const CACHE_NAME = 'ho-admin-cache-v1';
const DATA_CACHE_NAME = 'ho-admin-data-v1';

// Files to cache (App Shell)
const STATIC_FILES = [
    '/',
    '/index.html',
    '/css/style.css',
    '/js/app.js',
    '/manifest.json',
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// API URL
const API_URL = 'https://script.google.com/macros/s/AKfycbyo9YciQoWC_Z7Ak3IYtF_fZKrPUxpoZTsbDHY-9laLcd4oj9_AlK6EGmlJu-XVTmUxXQ/exec';

// ============================================
// INSTALL EVENT - Cache Static Files
// ============================================
self.addEventListener('install', (event) => {
    console.log('[SW] Installing Service Worker...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Caching static files');
                return cache.addAll(STATIC_FILES);
            })
            .then(() => {
                console.log('[SW] Static files cached');
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('[SW] Cache failed:', error);
            })
    );
});

// ============================================
// ACTIVATE EVENT - Clean Old Caches
// ============================================
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating Service Worker...');
    
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME && cache !== DATA_CACHE_NAME) {
                        console.log('[SW] Deleting old cache:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => {
            console.log('[SW] Service Worker activated');
            return self.clients.claim();
        })
    );
});

// ============================================
// FETCH EVENT - Serve from Cache
// ============================================
self.addEventListener('fetch', (event) => {
    const requestUrl = event.request.url;
    
    // API calls - Network first, then cache
    if (requestUrl.includes('script.google.com')) {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    // Clone response to store in cache
                    const responseClone = response.clone();
                    caches.open(DATA_CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                    return response;
                })
                .catch(() => {
                    // If network fails, try cache
                    return caches.match(event.request);
                })
        );
        return;
    }
    
    // Static files - Cache first, then network
    event.respondWith(
        caches.match(event.request)
            .then((cachedResponse) => {
                if (cachedResponse) {
                    return cachedResponse;
                }
                return fetch(event.request).then((response) => {
                    // Cache new resources
                    if (response.status === 200) {
                        const responseClone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseClone);
                        });
                    }
                    return response;
                });
            })
            .catch(() => {
                // Offline fallback
                if (event.request.mode === 'navigate') {
                    return caches.match('/index.html');
                }
            })
    );
});

// ============================================
// MESSAGE EVENT - Manual Sync Trigger
// ============================================
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'MANUAL_SYNC') {
        console.log('[SW] Manual sync triggered');
        syncAllData().then(() => {
            // Notify all clients
            self.clients.matchAll().then((clients) => {
                clients.forEach((client) => {
                    client.postMessage({
                        type: 'SYNC_COMPLETE',
                        timestamp: new Date().toISOString()
                    });
                });
            });
        });
    }
    
    if (event.data && event.data.type === 'CACHE_DATA') {
        cacheApiData(event.data.key, event.data.data);
    }
});

// ============================================
// BACKGROUND SYNC
// ============================================
self.addEventListener('sync', (event) => {
    console.log('[SW] Background sync triggered:', event.tag);
    
    if (event.tag === 'sync-data') {
        event.waitUntil(syncAllData());
    }
});

// ============================================
// PERIODIC BACKGROUND SYNC (if supported)
// ============================================
self.addEventListener('periodicsync', (event) => {
    if (event.tag === 'sync-data-periodic') {
        console.log('[SW] Periodic sync triggered');
        event.waitUntil(syncAllData());
    }
});

// ============================================
// SYNC FUNCTIONS
// ============================================
async function syncAllData() {
    console.log('[SW] Syncing all data...');
    
    try {
        // Sync endpoints
        const endpoints = [
            { action: 'getAllEmployees', key: 'employees' },
            { action: 'getAllCustomersHO', key: 'customers' },
            { action: 'getAllStockistsHO', key: 'stockists' },
            { action: 'getAllProducts', key: 'products' },
            { action: 'getAllAreas', key: 'areas' },
            { action: 'getPendingCustomers', key: 'pendingCustomers' },
            { action: 'getPendingExpenses', key: 'pendingExpenses' },
            { action: 'getAnnouncements', key: 'announcements' },
            { action: 'getSettings', key: 'settings' }
        ];
        
        for (const endpoint of endpoints) {
            try {
                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain' },
                    body: JSON.stringify({ action: endpoint.action })
                });
                
                if (response.ok) {
                    const data = await response.json();
                    await cacheApiData(endpoint.key, data);
                    console.log(`[SW] Synced: ${endpoint.key}`);
                }
            } catch (error) {
                console.error(`[SW] Failed to sync ${endpoint.key}:`, error);
            }
        }
        
        // Update last sync time
        await cacheApiData('lastSyncTime', { timestamp: new Date().toISOString() });
        
        console.log('[SW] Sync complete');
        return true;
    } catch (error) {
        console.error('[SW] Sync failed:', error);
        return false;
    }
}

async function cacheApiData(key, data) {
    const cache = await caches.open(DATA_CACHE_NAME);
    const response = new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' }
    });
    await cache.put(`/api-cache/${key}`, response);
}

async function getCachedData(key) {
    const cache = await caches.open(DATA_CACHE_NAME);
    const response = await cache.match(`/api-cache/${key}`);
    if (response) {
        return await response.json();
    }
    return null;
}
