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

/* -------------------- Token Helper -------------------- */
function getToken() {
  const keys = ['authToken', 'auth_token', 'token', 'access_token'];
  for (const k of keys) {
    const v = localStorage.getItem(k) || sessionStorage.getItem(k);
    if (v) return v;
  }
  console.warn(" No token found in storage");
  return null;
}

// ==================== GET /vehicles ====================
async function getAllVehicles({ search = '', status = '', per_page = 15 } = {}) {
  const token = getToken();
  if (!token) {
    showErrorNoToken("Missing authentication token. Please login first.");  
    return;
  }

  const apiUrl = new URL('https://mwms.megacess.com/api/v1/vehicles');

  if (search) apiUrl.searchParams.append('search', search);
  if (status) apiUrl.searchParams.append('status', status);
  if (per_page) apiUrl.searchParams.append('per_page', per_page);

  const loading = document.getElementById('loading');
  const tableBody = document.getElementById('vehicleTableBody');
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
      if (result.data.length > 0) populateVehicleTable(result.data);
      else tableBody.innerHTML = `<div class="text-center text-muted py-3">No vehicles found</div>`;
    } else {
      tableBody.innerHTML = `<div class="text-center text-danger py-3">Error: ${result.message}</div>`;
      showError(result.message);
    }
  } catch (error) {
    loading.style.display = 'none';
    tableBody.innerHTML = `<div class="text-center text-danger py-3">Failed to load vehicles</div>`;
    showError('Failed to load vehicles. Please try again.');
    console.error('Fetch error:', error);
  }
}

// ==================== Populate Table ====================
function populateVehicleTable(vehicles) {
  const tableBody = document.getElementById('vehicleTableBody');
  tableBody.innerHTML = '';

  vehicles.forEach(vehicle => {
    const row = document.createElement('div');
    row.className = 'content-row d-flex border-bottom py-2 align-items-center';

    let statusClass = 'bg-secondary';
    if (vehicle.status.toLowerCase() === 'available') statusClass = 'bg-success';
    else if (vehicle.status.toLowerCase() === 'in use') statusClass = 'bg-warning text-dark';
    else if (vehicle.status.toLowerCase() === 'under maintenance') statusClass = 'bg-danger';

    row.innerHTML = `
      <div class="col ps-3">${vehicle.vehicle_name}</div>
      <div class="col">${vehicle.plate_number}</div>
      <div class="col"><span class="badge ${statusClass}">${vehicle.status}</span></div>
      <div class="col text-center">
        <button class="btn btn-sm btn-warning me-2 edit-vehicle-btn" 
                data-id="${vehicle.id}" 
                data-name="${vehicle.vehicle_name}" 
                data-plate="${vehicle.plate_number}" 
                data-status="${vehicle.status.toLowerCase()}">
          <i class="bi bi-pencil"></i> Edit
        </button>
        <button class="btn btn-sm btn-danger delete-vehicle-btn" data-id="${vehicle.id}">
          <i class="bi bi-trash"></i> Delete
        </button>
      </div>
    `;
    tableBody.appendChild(row);
  });

  // ✅ Update stat cards
  updateVehicleStats(vehicles);

  // ✅ Reattach event listeners
  attachEditListeners();
  attachDeleteListeners();
}

// Animate the counting with fade-in & scale effect
function animateCount(el, value, duration = 1500) {
  let start = 0;
  const startTime = performance.now();

  // Reset visual styles before animating
  el.style.opacity = 0;
  el.style.transform = "scale(0.9)";
  el.style.transition = "opacity 0.4s ease-out, transform 0.4s ease-out";

  // Trigger fade/scale animation
  requestAnimationFrame(() => {
    el.style.opacity = 1;
    el.style.transform = "scale(1)";
  });

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // Ease-out curve (smooth stop)
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.floor(start + (value - start) * eased);
    el.textContent = current;

    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      el.textContent = value;
    }
  }

  requestAnimationFrame(update);
}

// Update vehicle stats cards
function updateVehicleStats(vehicles) {
  const total = vehicles.length;
  const available = vehicles.filter(v => v.status.toLowerCase() === 'available').length;
  const inUse = vehicles.filter(v => v.status.toLowerCase() === 'in use').length;
  const maintenance = vehicles.filter(v => v.status.toLowerCase() === 'under maintenance').length;

  animateCount(document.getElementById('totalVehicles'), total, 1800);
  animateCount(document.getElementById('availableVehicles'), available, 1800);
  animateCount(document.getElementById('inUseVehicles'), inUse, 1800);
  animateCount(document.getElementById('maintenanceVehicles'), maintenance, 1800);
}

// ==================== POST /vehicles ====================
document.getElementById('addVehicleBtn').addEventListener('click', async () => {
  const token = getToken();
  if (!token) {
    showError("Missing authentication token. Please login first.");
    return;
  }

  const vehicleName = document.getElementById('vehicleName').value.trim();
  const plateNo = document.getElementById('plateNo').value.trim();
  const statusSelect = document.getElementById('addVehicleStatus');
  const status = statusSelect.value;

  if (!vehicleName || !plateNo || !status || status === 'Choose status') {
    showError('Please fill in all fields.');
    return;
  }

  const addBtn = document.getElementById('addVehicleBtn');
  addBtn.disabled = true;
  const originalText = addBtn.textContent;
  addBtn.textContent = 'Adding...';

  try {
    const response = await fetch('https://mwms.megacess.com/api/v1/vehicles', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ vehicle_name: vehicleName, plate_number: plateNo, status })
    });
    const result = await response.json();

    if (response.ok && result.success) {
      bootstrap.Modal.getInstance(document.getElementById('addVehicleModal')).hide();
      document.getElementById('vehicleName').value = '';
      document.getElementById('plateNo').value = '';
      statusSelect.value = 'Choose status';
      getAllVehicles();
      showSuccess('Vehicle added successfully!');
    } else {
      showError(result.message);
    }
  } catch (error) {
    console.error(error);
    showError('Failed to add vehicle. Please try again.');
  } finally {
    addBtn.disabled = false;
    addBtn.textContent = originalText;
  }
});

// ==================== DELETE /vehicles ====================
function attachDeleteListeners() {
  const deleteButtons = document.querySelectorAll('.delete-vehicle-btn');
  deleteButtons.forEach(btn => {
    btn.removeEventListener('click', handleDelete);
    btn.addEventListener('click', handleDelete);
  });
}

async function handleDelete(e) {
  const vehicleId = e.currentTarget.dataset.id;
  showConfirm('You want to delete this vehicle?', async () => {
    showLoading();
    try {
      const response = await fetch(`https://mwms.megacess.com/api/v1/vehicles/${vehicleId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer 69|Pqml1FrUSJP2y2LbluqZH826kI3hb8RtwOajuPos9e9fd0f0`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      const result = await response.json();
      if (response.ok && result.success) {
        showSuccess(result.message);
        getAllVehicles();
      } else {
        showError(result.message);
      }
    } catch (err) {
      console.error(err);
      showError('Failed to delete vehicle. Please try again.');
    } finally {
      hideLoading();
    }
  });
}

// ==================== UPDATE /vehicles ====================
let currentVehicleId = null;

function attachEditListeners() {
  const editBtns = document.querySelectorAll('.edit-vehicle-btn');
  editBtns.forEach(btn => {
    btn.removeEventListener('click', handleEdit);
    btn.addEventListener('click', handleEdit);
  });
}

function handleEdit(e) {
  const btn = e.currentTarget;
  currentVehicleId = btn.dataset.id;
  document.getElementById('updateVehicleName').value = btn.dataset.name;
  document.getElementById('updatePlateNo').value = btn.dataset.plate;
  document.getElementById('updateVehicleStatus').value = btn.dataset.status;
  bootstrap.Modal.getOrCreateInstance(document.getElementById('updateVehicleModal')).show();
}

document.getElementById('updateVehicleBtn').addEventListener('click', async () => {
  if (!currentVehicleId) return;

  const name = document.getElementById('updateVehicleName').value.trim();
  const plate = document.getElementById('updatePlateNo').value.trim();
  const status = document.getElementById('updateVehicleStatus').value;

  if (!name && !plate && !status) {
    showError('Please fill at least one field to update.');
    return;
  }

  const updateBtn = document.getElementById('updateVehicleBtn');
  updateBtn.disabled = true;
  const originalText = updateBtn.textContent;
  updateBtn.textContent = 'Updating...';

  try {
    const response = await fetch(`https://mwms.megacess.com/api/v1/vehicles/${currentVehicleId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer 69|Pqml1FrUSJP2y2LbluqZH826kI3hb8RtwOajuPos9e9fd0f0`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        vehicle_name: name || undefined,
        plate_number: plate || undefined,
        status: status || undefined
      })
    });
    const result = await response.json();

    if (response.ok && result.success) {
      bootstrap.Modal.getInstance(document.getElementById('updateVehicleModal')).hide();
      getAllVehicles();
      showSuccess(result.message);
    } else {
      showError(result.message);
    }
  } catch (err) {
    console.error(err);
    showError('Failed to update vehicle.');
  } finally {
    updateBtn.disabled = false;
    updateBtn.textContent = originalText;
  }
});

// ==================== DOMContentLoaded ====================
window.addEventListener('DOMContentLoaded', () => {
  getAllVehicles();
});

// ==================== Search Functions ====================
// Debounce helper to limit rapid API calls
function debounce(func, delay) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => func.apply(this, args), delay);
  };
}

// Triggered whenever search input or filter changes
function updateVehicleTable() {
  const searchValue = document.getElementById('vehicleSearch').value.trim() || undefined;
  const statusValue = document.getElementById('vehicleStatus').value || undefined; // 'All Status' can map to undefined
  getAllVehicles({ search: searchValue, status: statusValue });
}

// Debounce the search input to avoid flooding API requests
const handleVehicleSearch = debounce(updateVehicleTable, 300);

// Attach event listeners
document.getElementById('vehicleSearch').addEventListener('input', handleVehicleSearch);
document.getElementById('vehicleStatus').addEventListener('change', updateVehicleTable);

document.getElementById('refreshVehicleBtn').addEventListener('click', () => {
  // Reset search input
  document.getElementById('vehicleSearch').value = '';

  // Reset status filter
  document.getElementById('vehicleStatus').value = '';

  // Reload vehicle table
  getAllVehicles();
});