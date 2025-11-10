/* ===============================
   Vehicle Management JS
=============================== */

// Token
const TOKEN = '69|Pqml1FrUSJP2y2LbluqZH826kI3hb8RtwOajuPos9e9fd0f0';

/* ---------- Loading Overlay ---------- */
function showLoading() {
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) overlay.classList.remove('d-none');
}

function hideLoading() {
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) overlay.classList.add('d-none');
}

/* ---------- GET Vehicles ---------- */
async function getAllVehicles({ search = '', status = '', per_page = 15 } = {}) {
  const apiUrl = new URL('https://mwms.megacess.com/api/v1/vehicles');
  if (search) apiUrl.searchParams.append('search', search);
  if (status && status !== 'all') apiUrl.searchParams.append('status', status);
  if (per_page) apiUrl.searchParams.append('per_page', per_page);

  const loading = document.getElementById('loading');
  const tableBody = document.getElementById('vehicleTableBody');

  loading.style.display = 'block';
  tableBody.innerHTML = '';

  try {
    const res = await fetch(apiUrl, {
      headers: { 
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    const result = await res.json();
    loading.style.display = 'none';

    if (res.ok && result.success) {
      if (result.data.length > 0) populateVehicleTable(result.data);
      else tableBody.innerHTML = `<div class="text-center text-muted py-3">No vehicles found</div>`;
    } else {
      tableBody.innerHTML = `<div class="text-center text-danger py-3">Error: ${result.message}</div>`;
      console.error(result.message);
    }
  } catch (err) {
    loading.style.display = 'none';
    tableBody.innerHTML = `<div class="text-center text-danger py-3">Failed to load vehicles</div>`;
    console.error(err);
  }
}

/* ---------- Populate Table ---------- */
function populateVehicleTable(vehicles) {
  const tableBody = document.getElementById('vehicleTableBody');
  tableBody.innerHTML = '';

  vehicles.forEach(vehicle => {
    const row = document.createElement('div');
    row.className = 'vehicle-row d-flex border-bottom py-2';

    let statusClass = 'bg-secondary';
    if (vehicle.status.toLowerCase() === 'available') statusClass = 'bg-success';
    else if (vehicle.status.toLowerCase() === 'in use') statusClass = 'bg-warning text-dark';
    else if (vehicle.status.toLowerCase() === 'under maintenance') statusClass = 'bg-danger';

    row.innerHTML = `
      <div class="col ps-3">${vehicle.vehicle_name}</div>
      <div class="col">${vehicle.plate_number}</div>
      <div class="col"><span class="badge ${statusClass}">${vehicle.status}</span></div>
      <div class="col text-center">
        <button 
          class="btn btn-sm btn-warning me-2 edit-vehicle-btn" 
          data-id="${vehicle.id}" 
          data-name="${vehicle.vehicle_name}" 
          data-plate="${vehicle.plate_number}" 
          data-status="${vehicle.status.toLowerCase()}"
        >
          <i class="bi bi-pencil"></i> Edit
        </button>
        <button class="btn btn-sm btn-danger delete-vehicle-btn" data-id="${vehicle.id}">
          <i class="bi bi-trash"></i> Delete
        </button>
      </div>
    `;

    tableBody.appendChild(row);
  });

  attachEditListeners();
  attachDeleteListeners();
}

/* ---------- Debounce Search ---------- */
function debounce(func, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => func.apply(this, args), delay);
  };
}

function updateVehicleTable() {
  const searchValue = document.getElementById('vehicleSearch').value.trim() || undefined;
  const statusValue = document.getElementById('vehicleStatus').value || 'all';
  getAllVehicles({ search: searchValue, status: statusValue });
}

const handleSearch = debounce(updateVehicleTable, 200);
document.getElementById('vehicleSearch').addEventListener('input', handleSearch);
document.getElementById('vehicleStatus').addEventListener('change', updateVehicleTable);

/* ---------- POST Add Vehicle ---------- */
document.getElementById('addVehicleBtn').addEventListener('click', async () => {
  const vehicleName = document.getElementById('vehicleName').value.trim();
  const plateNo = document.getElementById('plateNo').value.trim();
  const status = document.getElementById('addVehicleStatus').value;

  if (!vehicleName || !plateNo || !status || status === 'Choose status') {
    alert('Please fill in all fields.');
    return;
  }

  const addBtn = document.getElementById('addVehicleBtn');
  addBtn.disabled = true;
  const originalText = addBtn.textContent;
  addBtn.textContent = 'Adding...';

  try {
    const res = await fetch('https://mwms.megacess.com/api/v1/vehicles', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ vehicle_name: vehicleName, plate_number: plateNo, status })
    });

    const result = await res.json();
    if (res.ok && result.success) {
      bootstrap.Modal.getInstance(document.getElementById('addVehicleModal')).hide();
      document.getElementById('vehicleName').value = '';
      document.getElementById('plateNo').value = '';
      document.getElementById('addVehicleStatus').value = 'Choose status';
      getAllVehicles();
      alert('Vehicle added successfully!');
    } else {
      alert('Error: ' + result.message);
    }
  } catch (err) {
    console.error(err);
    alert('Failed to add vehicle');
  } finally {
    addBtn.disabled = false;
    addBtn.textContent = originalText;
  }
});

/* ---------- DELETE Vehicle ---------- */
function attachDeleteListeners() {
  document.querySelectorAll('.delete-vehicle-btn').forEach(btn => {
    btn.removeEventListener('click', handleDelete);
    btn.addEventListener('click', handleDelete);
  });
}

async function handleDelete(e) {
  const vehicleId = e.currentTarget.dataset.id;
  if (!confirm('Are you sure you want to delete this vehicle?')) return;

  showLoading();
  try {
    const res = await fetch(`https://mwms.megacess.com/api/v1/vehicles/${vehicleId}`, {
      method: 'DELETE',
      headers: { 
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    const result = await res.json();
    if (res.ok && result.success) {
      getAllVehicles();
      alert(result.message);
    } else alert('Error: ' + result.message);
  } catch (err) {
    console.error(err);
    alert('Failed to delete vehicle');
  } finally {
    hideLoading();
  }
}

/* ---------- UPDATE Vehicle ---------- */
let currentVehicleId = null;

function attachEditListeners() {
  document.querySelectorAll('.edit-vehicle-btn').forEach(btn => {
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

  if (!name || !plate || !status) {
    alert('Please fill all fields.');
    return;
  }

  const updateBtn = document.getElementById('updateVehicleBtn');
  updateBtn.disabled = true;
  const originalText = updateBtn.textContent;
  updateBtn.textContent = 'Updating...';

  try {
    const res = await fetch(`https://mwms.megacess.com/api/v1/vehicles/${currentVehicleId}`, {
      method: 'PUT',
      headers: { 
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ vehicle_name: name, plate_number: plate, status })
    });
    const result = await res.json();

    if (res.ok && result.success) {
      bootstrap.Modal.getInstance(document.getElementById('updateVehicleModal')).hide();
      getAllVehicles();
      alert(result.message);
    } else alert('Error: ' + result.message);
  } catch (err) {
    console.error(err);
    alert('Failed to update vehicle');
  } finally {
    updateBtn.disabled = false;
    updateBtn.textContent = originalText;
  }
});

/* ---------- Init ---------- */
window.addEventListener('DOMContentLoaded', () => getAllVehicles());
