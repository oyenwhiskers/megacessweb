// Attach to the button with id="logoutBtn"

(function () {
  const LOGOUT_URL = "https://mwms.megacess.com/api/v1/auth/logout";
  const LOGIN_PAGE = "/megacessweb/pages/log-in.html";

  function findTokenFromStorage() {
    // try common keys first
    const commonKeys = ['accessToken', 'token', 'authToken', 'mwmsToken', 'megacess_token'];
    for (const k of commonKeys) {
      const v = localStorage.getItem(k) || sessionStorage.getItem(k);
      if (v) return { key: k, value: v, storage: localStorage.getItem(k) ? 'local' : 'session' };
    }
    // fallback: look for any key containing "token", "access" or "auth"
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (/token|access|auth/i.test(k)) {
        const v = localStorage.getItem(k);
        if (v) return { key: k, value: v, storage: 'local' };
      }
    }
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (/token|access|auth/i.test(k)) {
        const v = sessionStorage.getItem(k);
        if (v) return { key: k, value: v, storage: 'session' };
      }
    }
    return null;
  }

  function clearFoundTokens() {
    const keysToRemove = ['accessToken', 'token', 'authToken', 'mwmsToken', 'megacess_token'];
    // remove standard keys
    keysToRemove.forEach(k => {
      localStorage.removeItem(k);
      sessionStorage.removeItem(k);
    });
    // also remove any keys that look like tokens to be safe
    [...Object.keys(localStorage)].forEach(k => { if (/token|access|auth/i.test(k)) localStorage.removeItem(k); });
    [...Object.keys(sessionStorage)].forEach(k => { if (/token|access|auth/i.test(k)) sessionStorage.removeItem(k); });
  }

  async function doLogout(token) {
    const headers = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    try {
      const res = await fetch(LOGOUT_URL, { method: 'POST', headers, credentials: 'include' });
      // not strictly required to parse the body; proceed regardless of result
      return { ok: res.ok, status: res.status };
    } catch (err) {
      // network/CORS error
      console.error('Logout fetch failed:', err);
      return { ok: false, error: err };
    }
  }

  // delegated listener so script can be loaded anywhere
  document.addEventListener('click', async function (e) {
    const btn = e.target.closest && e.target.closest('#logoutBtn');
    if (!btn) return;

    e.preventDefault();
    btn.disabled = true;

    const found = findTokenFromStorage();
    const token = found ? found.value : null;
    console.debug('Attempting logout, token found:', !!token, found ? found.key : null);

    const result = await doLogout(token);

    // always clear local session state and redirect to login even if logout network fails
    clearFoundTokens();

    // if your app uses cookies for session, you may need to clear them server-side or set them to expired
    console.debug('Logout result:', result);

    // small delay so user sees button state change (optional)
    setTimeout(() => {
      window.location.href = LOGIN_PAGE;
    }, 150);
  });
})();