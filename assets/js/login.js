// Login page API integration (updated payload + no credentials to avoid CORS wildcard issue)
(function(){
  var API_URL = 'https://mwms.megacess.com/api/v1/auth/login';

  function qs(sel){ return document.querySelector(sel); }
  function show(el, txt){ if(!el) return; el.style.display='block'; if(txt!==undefined) el.textContent = txt; }
  function hide(el){ if(!el) return; el.style.display='none'; }

  function togglePassword(e){
    var btn = e.currentTarget;
    var pwd = qs('#password');
    if(!pwd || !btn) return;
    if(pwd.type === 'password'){ pwd.type = 'text'; btn.title = 'Hide password'; }
    else { pwd.type = 'password'; btn.title = 'Show password'; }
  }

  async function submitLogin(ev){
    ev && ev.preventDefault();
    var form = qs('#loginForm');
    if(!form) return;

    var user = qs('#email'), password = qs('#password'), remember = qs('#remember');
    var emailError = qs('#emailError'), passwordError = qs('#passwordError'), submitError = qs('#submitError');
    var btn = form.querySelector('button[type="submit"]');

    hide(emailError); hide(passwordError); hide(submitError);

    var ok = true;
    if(!user || !user.value || user.value.trim().length < 2){ show(emailError); ok = false; }
    if(!password || !password.value || password.value.trim().length < 1){ show(passwordError); ok = false; }
    if(!ok) return;

    if(btn){ btn.disabled = true; var origText = btn.textContent; btn.textContent = 'Logging in...'; }

    try {
      // API expects "user_nickname" and "password" (example payload)
      var payload = {
        user_nickname: user.value.trim(),
        password: password.value,
        remember: !!(remember && remember.checked)
      };

      var res = await fetch(API_URL, {
        method: 'POST',
        mode: 'cors',
        // do NOT send credentials when the API responds with Access-Control-Allow-Origin: *
        credentials: 'omit',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload)
      });

      var data = null;
      try { data = await res.json(); } catch(e){}

      if(res.ok){
        if(data && data.token){
          try{ localStorage.setItem('mc_token', data.token); }catch(e){}
        }
        var redirectTo = (data && data.redirect) ? data.redirect : '/megacessweb/index.html';
        window.location.href = redirectTo;
        return;
      }

      var msg = (data && (data.message || data.error)) ? (data.message || data.error) : ('Login failed (' + res.status + ')');
      show(submitError, msg);

    } catch(err){
      show(submitError, 'Network error. Please try again.');
      console.warn('Login failed', err);
    } finally {
      if(btn){ btn.disabled = false; btn.textContent = origText || 'Login'; }
    }
  }

  // init on DOM ready
  document.addEventListener('DOMContentLoaded', function(){
    var form = qs('#loginForm');
    if(!form) return;
    // wire up submit
    form.addEventListener('submit', submitLogin, {passive:false});

    // wire up password toggle button if present
    var eyeBtn = qs('.show-pass');
    if(eyeBtn) eyeBtn.addEventListener('click', togglePassword);

    // expose simple helper for manual submit (optional)
    form.login = submitLogin;
  });
})();