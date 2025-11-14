// ==================== SweetAlert2 Helper Functions ====================
function showSuccess(msg) {
  Swal.fire({
    icon: 'success',
    title: 'Success!',
    text: msg,
    timer: 2000,
    showConfirmButton: false
  });
}

function showErrorNoToken(msg) {
  Swal.fire({
    icon: 'error',
    title: 'Missing authentication token',
    text: 'Please login first',
  }).then(() => {
    window.location.replace('../log-in.html');
  });
}

function showError(msg) {
  Swal.fire({
    icon: 'error',
    title: 'Error',
    text: msg,
    timer: 3000,
    showConfirmButton: true
  });
}

function showConfirm(message, callbackYes) {
  Swal.fire({
    title: 'Are you sure?',
    text: message,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#3085d6',
    cancelButtonColor: '#d33',
    confirmButtonText: 'Yes, do it!'
  }).then((result) => {
    if (result.isConfirmed) {
      callbackYes();
    }
  });
}

// ==================== Loading Overlay ====================
function showLoading() {
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) overlay.classList.remove('d-none');
}

function hideLoading() {
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) overlay.classList.add('d-none');
}

/* -------------------- Token Utilities -------------------- */
function getToken() {
  const keys = ['authToken', 'auth_token', 'token', 'access_token'];
  for (const k of keys) {
    const v = localStorage.getItem(k) || sessionStorage.getItem(k);
    if (v) return v;
  }
  console.warn(" No token found in storage");
  return null;
}

// ==================== GET /fuels ====================
async function getAllFuels({ supplier_name = '', date_from = '', date_to = '', per_page = 15 } = {}) {
  const token = getToken();
  if (!token) {
    showErrorNoToken("Missing authentication token. Please login first.");
    return;
  }

  const apiUrl = new URL('https://mwms.megacess.com/api/v1/fuels');

  if (supplier_name) apiUrl.searchParams.append('supplier_name', supplier_name);
  if (date_from) apiUrl.searchParams.append('date_from', date_from);
  if (date_to) apiUrl.searchParams.append('date_to', date_to);
  if (per_page) apiUrl.searchParams.append('per_page', per_page);

  const loading = document.getElementById('loading');
  const tableBody = document.getElementById('fuelsTableBody');

  loading.style.display = 'block';
  tableBody.innerHTML = '';

  try {
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    const result = await response.json();
    loading.style.display = 'none';

    if (response.ok && result.success) {
      if (result.data.length > 0) populateFuelsTable(result.data);
      else tableBody.innerHTML = `<div class="text-center text-muted py-3">No fuels found</div>`;
    } else {
      tableBody.innerHTML = `<div class="text-center text-danger py-3">Error: ${result.message || 'Unknown error'}</div>`;
      if (typeof showError === 'function') showError(result.message);
    }
  } catch (error) {
    loading.style.display = 'none';
    tableBody.innerHTML = `<div class="text-center text-danger py-3">Failed to load fuels</div>`;
    if (typeof showError === 'function') showError('Failed to load fuels. Please try again.');
    console.error('Fetch error:', error);
  }
}

// ==================== Populate Table ====================
function populateFuelsTable(fuels) {
  const tableBody = document.getElementById('fuelsTableBody');
  tableBody.innerHTML = '';

  fuels.forEach(fuel => {
    const row = document.createElement('div');
    row.className = 'content-row d-flex border-bottom py-2 align-items-center';

    // Example: choose badge color based on fuel amount
    let fuelClass = 'bg-warning text-black';

    row.innerHTML = `
      <div class="col">${fuel.supplier_name || 'Unnamed Fuel'}</div>
      <div class="col">
        ${fuel.user ? `${fuel.user.user_fullname}<br><small>(ID: ${fuel.user.id})</small>` : '-'}
      </div>
      <div class="col">
        <span class="badge ${fuelClass} px-3 py-2 fs-6">${fuel.fuel_bought || 'Unknown'}</span>
      </div>
      <div class="col">
        ${fuel.date_bought ? new Date(fuel.date_bought).toLocaleString('en-GB', { day:'2-digit', month:'short', year:'numeric' }) : '-'}
      </div>
      <div class="col text-center">
        <button class="btn btn-sm btn-warning me-2 update-fuel-btn"
                data-id="${fuel.id}"
                data-supplier-name="${fuel.supplier_name || ''}"
                data-user="${fuel.user?.user_fullname || ''} (ID:${fuel.user?.id || '-'})">
          <i class="bi bi-pencil"></i> Edit
        </button>
        <button class="btn btn-sm btn-danger delete-fuel-btn" data-id="${fuel.id}">
          <i class="bi bi-trash"></i> Delete
        </button>
      </div>
    `;

    tableBody.appendChild(row);
  });

  // Reattach listeners
  if (typeof attachEditListeners === 'function') attachEditListeners();
  if (typeof attachDeleteListeners === 'function') attachDeleteListeners();
}

// ==================== Initialize Fetch on Page Load ====================
document.addEventListener('DOMContentLoaded', () => {
  getAllFuels(); // Fetch and render all fuels
});