// -----------------------
// Tab handling (vanilla JS)
// Looks for elements with .tab-btn and .tab-pane[data-name]
// Tab buttons should have a `data-target` attribute matching the pane's `data-name`.
function initTabs(){
  try{
    var tabBtns = document.querySelectorAll('.tab-btn');
    var panes = document.querySelectorAll('.tab-pane');
    if(!tabBtns.length || !panes.length) return;

    function showTab(name){
      tabBtns.forEach(function(b){
        if(b.dataset && b.dataset.target === name) b.classList.add('active'); else b.classList.remove('active');
      });
      panes.forEach(function(p){
        if(p.getAttribute('data-name') === name){
          p.style.display = '';
        } else {
          p.style.display = 'none';
        }
      });
    }

    // determine initial tab: the .tab-btn.active or first button with data-target
    var activeBtn = document.querySelector('.tab-btn.active');
    var initial = (activeBtn && activeBtn.dataset && activeBtn.dataset.target) ? activeBtn.dataset.target : (tabBtns[0] && tabBtns[0].dataset && tabBtns[0].dataset.target);
    if(initial) showTab(initial);

    tabBtns.forEach(function(btn){
      btn.addEventListener('click', function(e){
        var target = btn.dataset && btn.dataset.target;
        if(target){
          e.preventDefault();
          showTab(target);
        }
        // if no data-target, allow normal link behaviour
      });
    });
  }catch(e){ console.warn('Tabs init error', e); }
}