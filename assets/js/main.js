// MegaCess Web minimal JS (no framework)
// - Toggles active nav item based on body[data-page]
// - Mobile sidebar toggle
(function () {
  function initActiveNav() {
    try {
      var current = document.body.getAttribute('data-page');
      if (!current) return;
      document.querySelectorAll('.sidebar a[data-page]').forEach(function (a) {
        if (a.getAttribute('data-page') === current) {
          a.classList.add('active');
        }
      });
    } catch (e) { console.warn('Nav init error', e); }
  }

  function initSidebarToggle() {
    var toggleBtn = document.getElementById('sidebarToggle');
    var sidebar = document.querySelector('.sidebar');
    if (toggleBtn && sidebar) {
      toggleBtn.addEventListener('click', function () {
        sidebar.classList.toggle('open');
      });
    }
  }


  // Initialize tabs for Manage Resources pages
  function initTabs() {
    var tabs = document.querySelectorAll('.tab-btn');
    var panes = document.querySelectorAll('.tab-pane');

    if (tabs.length === 0) return;

    function activateTab(tab) {
      var target = tab.getAttribute('data-target');

      // Update tab buttons
      tabs.forEach(function (t) { t.classList.remove('active'); });
      tab.classList.add('active');

      // Update tab panes
      panes.forEach(function (p) {
        if (p.getAttribute('data-name') === target) {
          p.style.display = 'block';
        } else {
          p.style.display = 'none';
        }
      });
    }

    tabs.forEach(function (tab) {
      tab.addEventListener('click', function (e) {
        e.preventDefault();
        activateTab(tab);
      });
    });

    // Initialize state (show active tab or first one)
    var activeTab = document.querySelector('.tab-btn.active');
    if (!activeTab && tabs.length > 0) {
      activeTab = tabs[0];
    }
    if (activeTab) {
      activateTab(activeTab);
    }
  }

  function loadSidebar() {
    var root = document.getElementById('sidebar-root');
    if (!root) {
      initActiveNav();
      initSidebarToggle();
      // initialize in-page tabs if present
      initTabs();
      return;
    }
    var basePath = typeof APP_BASE_PATH !== 'undefined' ? APP_BASE_PATH : '/';
    // Cache sidebar HTML in sessionStorage to avoid re-fetching on every page load
    var cacheKey = 'sidebarHTML_' + basePath;
    var cachedSidebar = null;
    try { cachedSidebar = sessionStorage.getItem(cacheKey); } catch (e) {}

    function applySidebar(html) {
      root.innerHTML = html;
        // Rewrite sidebar links to match actual base path
        root.querySelectorAll('a[href]').forEach(function(a) {
          var href = a.getAttribute('href');
          if (href && href.startsWith('/megacessweb/')) {
            a.setAttribute('href', href.replace('/megacessweb/', basePath));
          }
        });
        initActiveNav();
        initSidebarToggle();
        // Run sidebar username update if present
        if (typeof window.updateSidebarUsername === 'function') {
          window.updateSidebarUsername();
        } else {
          // Try to run if defined in sidebar
          var el = document.getElementById('sidebarUsername');
          if (el) {
            var name = localStorage.getItem('user_nickname') || sessionStorage.getItem('user_nickname');
            el.textContent = (name && name.trim().length > 0) ? name : '';
          }
        }
        // Hide Log in link if user is logged in
        var isLoggedIn = false;
        var keys = ['accessToken', 'token', 'authToken', 'mwmsToken', 'megacess_token'];
        for (var i = 0; i < keys.length; i++) {
          if (localStorage.getItem(keys[i]) || sessionStorage.getItem(keys[i])) {
            isLoggedIn = true;
            break;
          }
        }
        if (!isLoggedIn) {
          // fallback: look for any key containing "token", "access" or "auth"
          for (var i = 0; i < localStorage.length; i++) {
            var k = localStorage.key(i);
            if (/token|access|auth/i.test(k) && localStorage.getItem(k)) {
              isLoggedIn = true;
              break;
            }
          }
          for (var i = 0; i < sessionStorage.length; i++) {
            var k = sessionStorage.key(i);
            if (/token|access|auth/i.test(k) && sessionStorage.getItem(k)) {
              isLoggedIn = true;
              break;
            }
          }
        }
        if (isLoggedIn) {
          var loginLink = root.querySelector('a[data-page="login"]');
          if (loginLink) loginLink.style.display = 'none';
        }
    }

    if (cachedSidebar) {
      // Instant render from cache, then refresh silently in background
      applySidebar(cachedSidebar);
      fetch(basePath + 'partials/sidebar.html')
        .then(function (r) { return r.ok ? r.text() : null; })
        .then(function (html) {
          if (html && html !== cachedSidebar) {
            try { sessionStorage.setItem(cacheKey, html); } catch (e) {}
            applySidebar(html);
          }
        })
        .catch(function () {});
    } else {
      fetch(basePath + 'partials/sidebar.html')
        .then(function (r) { return r.text(); })
        .then(function (html) {
          try { sessionStorage.setItem(cacheKey, html); } catch (e) {}
          applySidebar(html);
        })
        .catch(function (e) {
          console.warn('Sidebar load failed', e);
          initActiveNav();
          initSidebarToggle();
        });
    }
  }

  document.addEventListener('DOMContentLoaded', loadSidebar);

  // Register Service Worker for PWA/Caching capabilities
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      // Register relative to main.js -> goes up 2 levels -> root (service-worker.js)
      // Since main.js is in assets/js/, 2 levels up is the project root.
      // However, it's safer to register relative to the domain root if we know the structure, 
      // but here we want it relative to the HTML page usually.
      // Best practice: use a path relative to the site root derived from location.

      // We assume service-worker.js is at the project root.
      // If we are at /megacessweb/pages/dashboard.html, root is ../../
      // If we are at /megacessweb/index.html, root is ./

      // Let's deduce the root path from the script's location or just try reasonable paths using ./ or ../
      // Actually, passing './service-worker.js' works if we are at root specific pages.
      // But simpler: let's use a robust method.

      // We know the structure: /service-worker.js is at the root of the serving directory for this app.
      // Determine the path to service-worker.js based on current location.
      // If we are in /pages/, we need ../../service-worker.js ??? No, that's filesystem.
      // URL: localhost/megacessweb/service-worker.js

      // Let's use getBaseUrl from config (if available) or assume relative path logic.
      // We can try to finding it relative to the current script or page.

      var basePath = typeof APP_BASE_PATH !== 'undefined' ? APP_BASE_PATH : '/';
      let swPath = basePath + 'service-worker.js';

      navigator.serviceWorker.register(swPath)
        .then(function (registration) {
          // Registration was successful
          // console.log('ServiceWorker registration successful with scope: ', registration.scope);
        }, function (err) {
          // registration failed :(
          console.warn('ServiceWorker registration failed: ', err);
        });
    });
  }
})();



