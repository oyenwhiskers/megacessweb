// MegaCess Web minimal JS (no framework)
// - Toggles active nav item based on body[data-page]
// - Mobile sidebar toggle
(function(){
  function initActiveNav(){
    try{
      var current = document.body.getAttribute('data-page');
      if(!current) return;
      document.querySelectorAll('.sidebar a[data-page]').forEach(function(a){
        if(a.getAttribute('data-page') === current){
          a.classList.add('active');
        }
      });
    }catch(e){ console.warn('Nav init error', e); }
  }

  function initSidebarToggle(){
    var toggleBtn = document.getElementById('sidebarToggle');
    var sidebar = document.querySelector('.sidebar');
    if(toggleBtn && sidebar){
      toggleBtn.addEventListener('click', function(){
        sidebar.classList.toggle('open');
      });
    }
  }

  function loadSidebar(){
    var root = document.getElementById('sidebar-root');
    if(!root){
      initActiveNav();
      initSidebarToggle();
      return;
    }
    fetch('/megacessweb/partials/sidebar.html', {cache:'no-store'})
      .then(function(r){ return r.text(); })
      .then(function(html){
        root.innerHTML = html;
        initActiveNav();
        initSidebarToggle();
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
      })
      .catch(function(e){
        console.warn('Sidebar load failed', e);
        initActiveNav();
        initSidebarToggle();
      });
  }

  document.addEventListener('DOMContentLoaded', loadSidebar);
})();
