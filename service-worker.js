const CACHE_NAME = 'megacess-static-v2';
const ASSETS_TO_CACHE = [
    // Pages (Core)
    './index.html',
    './pages/log-in.html',
    './pages/manage-account.html',
    './pages/manage-payroll.html',
    './pages/manage-attendance.html',
    './pages/manage-advance.html',
    './pages/manage-resources.html',
    './pages/manage-resources-vehicle.html',
    './pages/manage-resources-tools.html',
    './pages/manage-resources-fuel.html',
    './pages/analytics.html',

    // CSS
    './assets/css/style.css',
    './assets/css/roderickv1.css',
    './assets/css/login.css',
    './assets/css/manageaccount.css',
    './assets/css/managepayroll.css',
    './assets/css/manageattendance.css',
    './assets/css/manageadvance.css',
    './assets/css/manage-payment-rate.css',

    // JS (Core)
    './assets/js/config.js',
    './assets/js/main.js',
    './assets/js/utils.js',
    './assets/js/logout.js',
    './assets/js/login.js',

    // JS (Features)
    './assets/js/dashboard.js',
    './assets/js/worker_list.js',
    './assets/js/staff_list.js',
    './assets/js/register_worker.js',
    './assets/js/register_staff.js',
    './assets/js/manage_payroll.js',
    './assets/js/list_workers_att.js',
    './assets/js/list_staff_att.js',
    './assets/js/manage_advance.js',
    './assets/js/view_advance_details.js',
    './assets/js/view_attendance_details.js',
    './assets/js/vehicles.js',
    './assets/js/vehicle_bookings.js',
    './assets/js/tools.js',
    './assets/js/fuel.js',
    './assets/js/fuel_usage.js',
    './assets/js/analytics.js',
    './assets/js/manage_resources_analytics.js',

    // External Libraries (CDNs) - Note: CDNs are better handled by runtime caching, but we can try
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css',
    'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css',
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js',
    'https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.all.min.js',
    'https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.min.css'
];

// Install Event - Pre-cache static assets
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[Service Worker] Caching static assets');
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .then(() => self.skipWaiting())
    );
});

// Activate Event - Clean up old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME) {
                        console.log('[Service Worker] Deleting old cache:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch Event - Network First for API, Cache First for Static
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // 1. API Calls: Network Only (or handled by apiFetchWithCache in app logic)
    // We don't want the SW to cache API calls deeply because we have precise control in utils.js
    if (url.pathname.includes('/api/') || url.hostname.includes('ngrok-free.app')) {
        return; // Let the browser/app handle it (Network Only)
    }

    // 2. Static Assets: Cache First, Fallback to Network
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    return response; // Return cached hit
                }
                return fetch(event.request).then(networkResponse => {
                    // Optional: Runtime cache for other assets not in ASSETS_TO_CACHE
                    // Check if valid response and is a static asset we missed
                    if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                        return networkResponse;
                    }

                    // Simple logic: if it's in assets folder, cache it for next time
                    if (url.pathname.startsWith('/assets/')) {
                        const responseToCache = networkResponse.clone();
                        caches.open(CACHE_NAME).then(cache => {
                            cache.put(event.request, responseToCache);
                        });
                    }

                    return networkResponse;
                });
            })
    );
});
