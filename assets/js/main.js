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

  function initTabs(){
  }

  function loadSidebar(){
    var root = document.getElementById('sidebar-root');
    if(!root){
      initActiveNav();
      initSidebarToggle();
      // initialize in-page tabs if present
      initTabs();
      return;
    }
    fetch('/megacessweb/partials/sidebar.html', {cache:'no-store'})
      .then(function(r){ return r.text(); })
      .then(function(html){
        root.innerHTML = html;
        initActiveNav();
        initSidebarToggle();
        // initialize in-page tabs after sidebar is loaded
        initTabs();
      })
      .catch(function(e){
        console.warn('Sidebar load failed', e);
        initActiveNav();
        initSidebarToggle();
      });
  }

  document.addEventListener('DOMContentLoaded', loadSidebar);
})();


