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
        ${fuel.user ? `
          <div class="person-block">
            <strong>User:</strong><br>
            ${fuel.user.user_fullname}<br>
            <small>${fuel.user.user_role}</small><br>
            <small>(ID: ${fuel.user.id})</small>
          </div>` : ''}
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

// ==================== ADD /fuels =======================
async function createFuelRecord(payload) {
  const token = getToken();
  if (!token) {
    showErrorNoToken("Missing authentication token.");
    return;
  }

  try {
    const res = await fetch('https://mwms.megacess.com/api/v1/fuels', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const result = await res.json();

    if (res.ok && result.success) {
      showSuccess("Fuel record added successfully!");
    } else {
      showError(result.message || "Failed to add fuel record.");
    }

  } catch (error) {
    console.error("POST fuel error:", error);
    showError("Failed to add fuel record. Try again.");
  }
}

//

// ==================== DELETE /fuels ====================
function attachDeleteListeners() {
  const deleteButtons = document.querySelectorAll('.delete-fuel-btn');
  deleteButtons.forEach(btn => {
    btn.removeEventListener('click', handleDelete);
    btn.addEventListener('click', handleDelete);
  });
}

async function handleDelete(e) {
  const token = getToken();
  if (!token) {
    showErrorNoToken("Missing authentication token. Please login first.");
    return;
  }

  const fuelId = e.currentTarget.dataset.id;
  showConfirm('You want to delete this fuel?', async () => {
    showLoading();
    try {
      const response = await fetch(`https://mwms.megacess.com/api/v1/fuels/${fuelId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      const result = await response.json();
      if (response.ok && result.success) {
        showSuccess(result.message);
        getAllFuels();
      } else {
        showError(result.message);
      }
    } catch (err) {
      console.error(err);
      showError('Failed to delete fuel. Please try again.');
    } finally {
      hideLoading();
    }
  });
}

// =============================================
// 2. FETCH USERS → BUYER LIST
// =============================================
async function getAllBuyers() {
  const token = getToken();
  if (!token) {
    showErrorNoToken("Missing authentication token. Please login first.");
    return [];
  }

  const usersUrl = 'https://mwms.megacess.com/api/v1/users';

  try {
    const usersRes = await fetch(usersUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    const usersData = await usersRes.json();
    const users = usersData?.data || [];

    // Normalize
    const combined = users.map(u => ({
      id: u.id,
      fullname: u.user_fullname,
      account_type: 'user'
    }));

    return combined;

  } catch (err) {
    console.error("Error fetching buyers:", err);
    if (typeof showError === 'function') showError("Failed to load buyers.");
    return [];
  }
}

// =============================================
// 3. INITIALIZE BUYER DROPDOWN
// =============================================
let allBuyers = [];
let selectedBuyer = null;

async function initBuyerDropdown() {
  allBuyers = await getAllBuyers();
}

initBuyerDropdown();

// =============================================
// 4. DROPDOWN UI LOGIC
// =============================================
const buyerInput = document.getElementById('assignedPerson');
const buyerDropdown = document.createElement('ul');
buyerDropdown.className = 'dropdown-menu w-100 shadow-sm overflow-auto';
buyerDropdown.style.position = "absolute";
buyerDropdown.style.zIndex = "1000";
buyerDropdown.style.maxHeight = "200px";
buyerDropdown.style.overflowY = "auto";
buyerDropdown.style.width = "100%";
buyerDropdown.style.left = "0px";
buyerDropdown.style.right = "0px";

buyerInput.parentNode.appendChild(buyerDropdown);

function showBuyerDropdown(list) {
  buyerDropdown.innerHTML = '';

  if (list.length === 0) {
    const li = document.createElement('li');
    li.classList.add('dropdown-item', 'text-muted');
    li.textContent = "No results found";
    buyerDropdown.appendChild(li);
    buyerDropdown.classList.add('show');
    return;
  }

  list.forEach(person => {
    const li = document.createElement('li');
    li.classList.add('dropdown-item');

    li.innerHTML = `
      ${person.fullname}
      <small class="text-muted d-block">
        (${person.account_type.toUpperCase()} ID: ${person.id})
      </small>
    `;

    li.addEventListener('click', () => {
      buyerInput.value = person.fullname;
      selectedBuyer = person;
      buyerDropdown.classList.remove('show');
    });

    buyerDropdown.appendChild(li);
  });

  if (list.length > 0) buyerDropdown.classList.add('show');
  else buyerDropdown.classList.remove('show');
}

buyerInput.addEventListener('input', () => {
  const search = buyerInput.value.toLowerCase();

  const filtered = allBuyers.filter(p =>
    p.fullname.toLowerCase().includes(search) ||
    String(p.id).includes(search)
  );

  showBuyerDropdown(filtered);
});

document.addEventListener('click', (e) => {
  if (!buyerInput.contains(e.target)) buyerDropdown.classList.remove('show');
});

// =============================================
// 5. ADD FUEL FORM SUBMIT HANDLER
// =============================================
document.getElementById('addFuelForm').addEventListener('submit', async function (e) {
  e.preventDefault();

  if (!selectedBuyer) {
    alert("Please select a buyer from the dropdown.");
    return;
  }

  const supplier_name = document.getElementById('supplierName').value;
  const fuel_bought = document.getElementById('fuelBought').value;
  const date_bought = document.getElementById('dateBought').value;

  const payload = {
    supplier_name,
    fuel_bought,
    date_bought,
    user_id: selectedBuyer.id // Only user
  };

  const saveBtn = document.getElementById('saveFuelBtn');
  saveBtn.disabled = true;
  saveBtn.textContent = "Adding...";

  try {
    await createFuelRecord(payload);

    const modalEl = document.getElementById('addFuelModal');
    const modal = bootstrap.Modal.getInstance(modalEl);
    modal.hide();

    if (typeof getAllFuels === 'function') getAllFuels();

  } catch (err) {
    console.error(err);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = "Save Fuel";
  }
});

// ==================== Initialize Fetch on Page Load ====================
document.addEventListener('DOMContentLoaded', () => {
  getAllFuels(); // Fetch and render all fuels
});

// Show dropdown on click
buyerInput.addEventListener('click', () => {
  showBuyerDropdown(allBuyers);
}); 