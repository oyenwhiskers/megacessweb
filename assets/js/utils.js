// ==================== GLOBAL CONSTANTS ====================
const BASE_URL = 'https://mwms.megacess.com/api/v1';

// ==================== AUTH & TOKEN ====================
function getToken() {
  const keys = ['authToken', 'auth_token', 'token', 'access_token'];
  for (const k of keys) {
    const v = localStorage.getItem(k) || sessionStorage.getItem(k);
    if (v) return v;
  }
  console.warn("No token found in storage");
  return null;
}

// ==================== API FETCH WRAPPER ====================
async function apiFetch(path, options = {}) {
  const token = getToken();

  if (!token) {
    showErrorNoToken("Authentication token missing.");
    throw new Error("Authentication failed.");
  }

  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers
      },
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok || result.success === false) {
      throw new Error(result.message || `API Error: ${response.status}`);
    }

    return result;

  } catch (error) {
    console.error('API Fetch Error:', error);
    throw error;
  }
}

// ==================== UI HELPERS (SweetAlert) ====================
function showSuccess(title, msg = '') {
  Swal.fire({ icon: 'success', title: title, text: msg, timer: 2000, showConfirmButton: false });
}

function showError(msg) {
  Swal.fire({ icon: 'error', title: 'Error', text: msg, timer: 3000, showConfirmButton: true });
}

function showErrorNoToken(msg) {
  Swal.fire({ icon: 'error', title: 'Missing authentication token', text: msg }).then(() => {
    window.location.replace('../log-in.html');
  });
}

function showConfirm(message, callbackYes) {
  Swal.fire({
    title: 'Are you sure?', text: message, icon: 'warning', showCancelButton: true,
    confirmButtonColor: '#3085d6', cancelButtonColor: '#d33', confirmButtonText: 'Yes, do it!'
  }).then((result) => {
    if (result.isConfirmed) callbackYes();
  });
}

// ==================== DOM HELPERS ====================
function showLoading() {
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) {
    overlay.classList.remove('d-none');
  } else {
    console.warn('showLoading: #loadingOverlay not found');
  }
}

function hideLoading() {
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) overlay.classList.add('d-none');
}

function debounce(func, delay) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), delay);
  };
}

function formatForDateTimeLocal(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  const offset = date.getTimezoneOffset() * 60000;
  const localTime = new Date(date.getTime() - offset);
  return localTime.toISOString().slice(0, 16);
}