// Login page API integration (updated payload + no credentials to avoid CORS wildcard issue)
(function () {
  var LOGIN_API_URL = `${API_URL}/auth/login`;

  function qs(sel) { return document.querySelector(sel); }
  function show(el, txt) { if (!el) return; el.style.display = 'block'; if (txt !== undefined) el.textContent = txt; }
  function hide(el) { if (!el) return; el.style.display = 'none'; }
  // Remember password helpers
  function savePasswordIfRemembered(user, password, remember) {
    try {
      if (remember && user && password) {
        localStorage.setItem('rememberedUser', user);
        localStorage.setItem('rememberedPassword', password);
      } else {
        localStorage.removeItem('rememberedUser');
        localStorage.removeItem('rememberedPassword');
      }
    } catch (e) { }
  }

  function prefillRememberedCredentials() {
    try {
      var user = localStorage.getItem('rememberedUser');
      var password = localStorage.getItem('rememberedPassword');
      if (user) {
        var userInput = qs('#email');
        if (userInput) userInput.value = user;
      }
      if (password) {
        var pwdInput = qs('#password');
        if (pwdInput) pwdInput.value = password;
        var rememberBox = qs('#remember');
        if (rememberBox) rememberBox.checked = true;
      }
    } catch (e) { }
  }

  function togglePassword(e) {
    var btn = e.currentTarget;
    var pwd = qs('#password');
    if (!pwd || !btn) return;
    if (pwd.type === 'password') { pwd.type = 'text'; btn.title = 'Hide password'; }
    else { pwd.type = 'password'; btn.title = 'Show password'; }
  }

  async function submitLogin(ev) {
    ev && ev.preventDefault();
    var form = qs('#loginForm');
    if (!form) return;

    var user = qs('#email'), password = qs('#password'), remember = qs('#remember');
    var emailError = qs('#emailError'), passwordError = qs('#passwordError'), submitError = qs('#submitError');
    var btn = form.querySelector('button[type="submit"]');

    hide(emailError); hide(passwordError); hide(submitError);

    var ok = true;
    if (!user || !user.value || user.value.trim().length < 2) { show(emailError); ok = false; }
    if (!password || !password.value || password.value.trim().length < 1) { show(passwordError); ok = false; }
    if (!ok) return;

    // Save password if 'Remember' is checked
    savePasswordIfRemembered(user.value.trim(), password.value, remember && remember.checked);

    if (btn) { btn.disabled = true; var origText = btn.textContent; btn.textContent = 'Logging in...'; }

    try {
      // API expects "user_nickname" and "password" (example payload)
      var payload = {
        user_nickname: user.value.trim(),
        password: password.value,
        remember: !!(remember && remember.checked)
      };

      var res = await fetch(LOGIN_API_URL, {
        method: 'POST',
        mode: 'cors',
        // do NOT send credentials when the API responds with Access-Control-Allow-Origin: *
        credentials: 'omit',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload)
      });

      var data = null;
      try { data = await res.json(); } catch (e) { }

      if (res.ok) {
        // store token from common response shapes
        const token = (data && (data.token || data.access_token)) || (data && data.data && (data.data.token || data.data.access_token));
        if (token) {
          try { localStorage.setItem('authToken', token); console.log('authToken set', token); } catch (e) { }
        } else {
          console.warn('Login succeeded but no token found in response', data);
        }

        // Store user_nickname (login input) for sidebar display
        if (user && user.value) {
          try {
            localStorage.setItem('user_nickname', user.value.trim());
            sessionStorage.setItem('user_nickname', user.value.trim());
          } catch (e) { }
        }

        // Reload sidebar if present
        if (window.loadSidebar) {
          window.loadSidebar();
        }
        var redirectTo = (data && data.redirect) ? data.redirect : '../index.html';
        window.location.href = redirectTo;
        return;
      }

      var msg = (data && (data.message || data.error)) ? (data.message || data.error) : ('Login failed (' + res.status + ')');
      show(submitError, msg);

    } catch (err) {
      show(submitError, 'Network error. Please try again.');
      console.warn('Login failed', err);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = origText || 'Login'; }
    }
  }

  // init on DOM ready
  document.addEventListener('DOMContentLoaded', function () {
    var form = qs('#loginForm');
    if (!form) return;
    // Pre-fill remembered credentials
    prefillRememberedCredentials();
    // wire up submit
    form.addEventListener('submit', submitLogin, { passive: false });

    // wire up password toggle button if present
    var eyeBtn = qs('.show-pass');
    if (eyeBtn) eyeBtn.addEventListener('click', togglePassword);

    // wire up forgot password link
    var forgot = qs('#forgotPasswordLink');
    if (forgot) {
      forgot.addEventListener('click', function (e) {
        e.preventDefault();
        alert('Please contact your Admin to Change Password');
      });
    }

    // expose simple helper for manual submit (optional)
    form.login = submitLogin;
  });
})();
