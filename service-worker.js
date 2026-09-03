const CACHE_NAME = 'megacess-static-v8';
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
    './pages/manage-fertilizer.html',
    './pages/individual-summary.html',

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
    './assets/js/fertilizers.js',
    './assets/js/individual_summary.js',

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

// Fetch Event
// - Static assets (CSS/JS/images/fonts): CACHE FIRST -> instant loads, refresh in background
// - HTML pages: Network First, Fallback to Cache (so content stays fresh)
self.addEventListener('fetch', event => {
    // Only handle GET requests
    if (event.request.method !== 'GET') {
        return;
    }

    const url = new URL(event.request.url);

    // 1. API Calls: Network Only (or handled by apiFetchWithCache in app logic)
    if (url.pathname.includes('/api/') || url.hostname.includes('ngrok-free.app')) {
        return;
    }

    const isStaticAsset =
        url.pathname.match(/\.(css|js|mjs|png|jpe?g|gif|svg|webp|ico|woff2?|ttf|eot)$/i) ||
        url.hostname.includes('cdn.jsdelivr.net');

    // 2. Static Assets & CDN libs: Cache First (stale-while-revalidate)
    if (isStaticAsset && (url.protocol === 'http:' || url.protocol === 'https:')) {
        event.respondWith(
            caches.open(CACHE_NAME).then(cache =>
                cache.match(event.request).then(cached => {
                    const networkFetch = fetch(event.request)
                        .then(networkResponse => {
                            if (networkResponse && networkResponse.status === 200) {
                                cache.put(event.request, networkResponse.clone());
                            }
                            return networkResponse;
                        })
                        .catch(() => cached);
                    // Serve cache immediately if we have it; update in background
                    return cached || networkFetch;
                })
            )
        );
        return;
    }

    // 3. HTML Pages: Network First, Fallback to Cache
    event.respondWith(
        fetch(event.request)
            .then(networkResponse => {
                if (networkResponse && networkResponse.status === 200 && (url.protocol === 'http:' || url.protocol === 'https:')) {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseToCache);
                    });
                }
                return networkResponse;
            })
            .catch(() => caches.match(event.request))
    );
});
