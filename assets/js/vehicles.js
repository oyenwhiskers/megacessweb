// ==================== GET /vehicles ====================
async function getAllVehicles({ search = '', status = '', page = 1 } = {}) {
  const token = getToken();
  if (!token) {
    showErrorNoToken("Missing authentication token. Please login first.");
    return;
  }

  const apiUrl = new URL('https://mwms.megacess.com/api/v1/vehicles');
  if (search) apiUrl.searchParams.append('search', search);
  if (status) apiUrl.searchParams.append('status', status);
  if (page) apiUrl.searchParams.append('page', page);

  const loading = document.getElementById('loading');
  const tableBody = document.getElementById('vehicleTableBody');
  if (loading) loading.style.display = 'block';
  if (tableBody) tableBody.innerHTML = '';

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

    if (loading) loading.style.display = 'none';

    if (response.ok && result.success) {
      if (result.data && result.data.length > 0) {
        populateVehicleTable(result.data);

        if (result.meta) {
          updatePaginationControls(result.meta);
        } else {
          if (document.getElementById('currentPage')) document.getElementById('currentPage').textContent = 1;
          if (document.getElementById('totalPages')) document.getElementById('totalPages').textContent = 1;
          if (document.getElementById('totalRecords')) document.getElementById('totalRecords').textContent = result.data.length;
          renderPagination(1, 1);
        }

      } else {
        if (tableBody) tableBody.innerHTML = `<div class="text-center text-muted py-3">No vehicles found</div>`;
      }
    } else {
      if (tableBody) tableBody.innerHTML = `<div class="text-center text-danger py-3">Error: ${result?.message || 'Unknown error'}</div>`;
      showError(result?.message || 'Failed to load vehicles.');
    }

  } catch (error) {
    if (loading) loading.style.display = 'none';
    if (tableBody) tableBody.innerHTML = `<div class="text-center text-danger py-3">Failed to load vehicles</div>`;
    console.error('Fetch error:', error);
    showError('Failed to load vehicles. Please try again.');
  }
}

// ==================== Populate Table ====================
function populateVehicleTable(vehicles) {
  const tableBody = document.getElementById('vehicleTableBody');
  if (!tableBody) return;
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

  attachEditListeners();
  attachDeleteListeners();
}

// Animate the counting with fade-in & scale effect
function animateCount(el, value, duration = 1500) {
  if (!el) return;
  let start = 0;
  const startTime = performance.now();

  el.style.opacity = 0;
  el.style.transform = "scale(0.9)";
  el.style.transition = "opacity 0.4s ease-out, transform 0.4s ease-out";

  requestAnimationFrame(() => {
    el.style.opacity = 1;
    el.style.transform = "scale(1)";
  });

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
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

// Helpers to show/hide spinner indicators for analytics cards
function setStatsLoading(isLoading) {
  const mapping = [
    ['totalVehiclesSpinner', 'totalVehiclesValue'],
    ['availableVehiclesSpinner', 'availableVehiclesValue'],
    ['inUseVehiclesSpinner', 'inUseVehiclesValue'],
    ['maintenanceVehiclesSpinner', 'maintenanceVehiclesValue']
  ];

  mapping.forEach(([spinnerId, valueId]) => {
    const spinner = document.getElementById(spinnerId);
    const valueEl = document.getElementById(valueId);
    if (!spinner || !valueEl) return;

    if (isLoading) {
      spinner.classList.remove('d-none');
      valueEl.classList.add('opacity-50');
    } else {
      spinner.classList.add('d-none');
      valueEl.classList.remove('opacity-50');
    }
  });
}

// -------------------- Real Analytics (Summary) --------------------
async function fetchResourcesUsageAnalytics() {
  const token = getToken();
  if (!token) return null;

  try {
    const resp = await fetch('https://mwms.megacess.com/api/v1/analytics/resources-usage', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      }
    });

    const result = await resp.json();
    if (result?.success && result?.data) {
      return result.data;
    }
  } catch (err) {
    console.error("Failed to fetch analytics:", err);
  }

  return null;
}

async function refreshVehicleSummary() {
  setStatsLoading(true);

  const analytics = await fetchResourcesUsageAnalytics();
  if (!analytics || !analytics.vehicle_analytics) {
    console.warn("Unable to fetch vehicle analytics.");
    setStatsLoading(false);
    return;
  }

  const vehicles = analytics.vehicle_analytics;

  animateCount(document.getElementById('totalVehiclesValue'), Number(vehicles.total_vehicles) || 0, 1200);
  animateCount(document.getElementById('availableVehiclesValue'), Number(vehicles.available) || 0, 1200);
  animateCount(document.getElementById('inUseVehiclesValue'), Number(vehicles.in_use) || 0, 1200);
  animateCount(document.getElementById('maintenanceVehiclesValue'), Number(vehicles.under_maintenance) || 0, 1200);

  setStatsLoading(false);
}

// ==================== Pagination Controls ====================
let paginationState = {
  currentPage: 1,
  lastPage: 1,
  perPage: 15,
  total: 0,
  search: '',
  status: ''
};

function updatePaginationControls(meta) {
  paginationState.currentPage = meta.current_page;
  paginationState.lastPage = meta.last_page;
  paginationState.perPage = meta.per_page;
  paginationState.total = meta.total;

  const currentEl = document.getElementById('currentPage');
  const totalPagesEl = document.getElementById('totalPages');
  const totalRecordsEl = document.getElementById('totalRecords');
  if (currentEl) currentEl.textContent = meta.current_page;
  if (totalPagesEl) totalPagesEl.textContent = meta.last_page;
  if (totalRecordsEl) totalRecordsEl.textContent = meta.total;

  renderPagination(meta.current_page, meta.last_page);
}

function renderPagination(current, last) {
  const container = document.getElementById('vehiclePagination');
  if (!container) return;

  const maxButtons = 7;
  let start = Math.max(1, current - Math.floor(maxButtons / 2));
  let end = Math.min(last, start + maxButtons - 1);
  if (end - start + 1 < maxButtons) {
    start = Math.max(1, end - maxButtons + 1);
  }

  let html = '';
  const prevDisabled = current <= 1;
  html += `<li class="page-item ${prevDisabled ? 'disabled' : ''}"><a class="page-link" href="#" data-page="${Math.max(1, current - 1)}">Previous</a></li>`;

  for (let i = start; i <= end; i++) {
    if (i === current) {
      html += `<li class="page-item active" aria-current="page"><a class="page-link" href="#" data-page="${i}">${i}</a></li>`;
    } else {
      html += `<li class="page-item"><a class="page-link" href="#" data-page="${i}">${i}</a></li>`;
    }
  }

  const nextDisabled = current >= last;
  html += `<li class="page-item ${nextDisabled ? 'disabled' : ''}"><a class="page-link" href="#" data-page="${Math.min(last, current + 1)}">Next</a></li>`;

  container.innerHTML = html;

  const enabledLinks = container.querySelectorAll('li.page-item:not(.disabled) a[data-page]');
  enabledLinks.forEach(link => {
    link.removeEventListener('click', handlePaginationClick);
    link.addEventListener('click', handlePaginationClick);
  });
}

function handlePaginationClick(e) {
  e.preventDefault();
  const page = parseInt(e.currentTarget.dataset.page, 10);
  if (!page || page === paginationState.currentPage) return;

  getAllVehicles({
    search: paginationState.search,
    status: paginationState.status,
    per_page: paginationState.perPage,
    page: page
  });
  window.scrollTo(0, 0);
}

// ==================== POST /vehicles ====================
const addVehicleBtn = document.getElementById('addVehicleBtn');
if (addVehicleBtn) {
  addVehicleBtn.addEventListener('click', async () => {
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

    addVehicleBtn.disabled = true;
    const originalText = addVehicleBtn.textContent;
    addVehicleBtn.textContent = 'Adding...';

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
        if (typeof refreshVehicleSummary === 'function') refreshVehicleSummary();
        showSuccess('Success!', 'Vehicle added successfully!');
      } else {
        showError(result.message);
      }
    } catch (error) {
      console.error(error);
      showError('Failed to add vehicle. Please try again.');
    } finally {
      addVehicleBtn.disabled = false;
      addVehicleBtn.textContent = originalText;
    }
  });
}

// ==================== DELETE /vehicles ====================
function attachDeleteListeners() {
  const deleteButtons = document.querySelectorAll('.delete-vehicle-btn');
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

  const vehicleId = e.currentTarget.dataset.id;
  showConfirm('You want to delete this vehicle?', async () => {
    showLoading();
    try {
      const response = await fetch(`https://mwms.megacess.com/api/v1/vehicles/${vehicleId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      const result = await response.json();
      if (response.ok && result.success) {
        showSuccess('Success!', result.message);
        getAllVehicles();
        if (typeof refreshVehicleSummary === 'function') refreshVehicleSummary();
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

const updateVehicleBtn = document.getElementById('updateVehicleBtn');
if (updateVehicleBtn) {
  updateVehicleBtn.addEventListener('click', async () => {
    const token = getToken();
    if (!token) {
      showErrorNoToken("Missing authentication token. Please login first.");
      return;
    }

    if (!currentVehicleId) return;

    const name = document.getElementById('updateVehicleName').value.trim();
    const plate = document.getElementById('updatePlateNo').value.trim();
    const status = document.getElementById('updateVehicleStatus').value;

    if (!name && !plate && !status) {
      showError('Please fill at least one field to update.');
      return;
    }

    updateVehicleBtn.disabled = true;
    const originalText = updateVehicleBtn.textContent;
    updateVehicleBtn.textContent = 'Updating...';

    try {
      const response = await fetch(`https://mwms.megacess.com/api/v1/vehicles/${currentVehicleId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
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
        if (typeof refreshVehicleSummary === 'function') refreshVehicleSummary();
        showSuccess('Success!', result.message);
      } else {
        showError(result.message);
      }
    } catch (err) {
      console.error(err);
      showError('Failed to update vehicle.');
    } finally {
      updateVehicleBtn.disabled = false;
      updateVehicleBtn.textContent = originalText;
    }
  });
}

// ==================== Search Functions ====================
function updateVehicleTable() {
  const searchInput = document.getElementById('vehicleSearch');
  const statusInput = document.getElementById('vehicleStatus');

  const searchValue = searchInput ? searchInput.value.trim() : '';
  const statusValue = statusInput ? statusInput.value : '';

  paginationState.search = searchValue;
  paginationState.status = statusValue;

  getAllVehicles({ search: searchValue, status: statusValue, page: 1 });
}

// Use debounce from utils.js
const handleVehicleSearch = typeof debounce === 'function' ? debounce(updateVehicleTable, 150) : updateVehicleTable;

// ==================== DOMContentLoaded ====================
window.addEventListener('DOMContentLoaded', () => {
  getAllVehicles();
  if (typeof refreshVehicleSummary === 'function') refreshVehicleSummary();

  const searchInput = document.getElementById('vehicleSearch');
  const statusInput = document.getElementById('vehicleStatus');
  const refreshBtn = document.getElementById('refreshVehicleBtn');

  if (searchInput) searchInput.addEventListener('input', handleVehicleSearch);
  if (statusInput) statusInput.addEventListener('change', updateVehicleTable);

  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      if (statusInput) statusInput.value = '';
      paginationState.search = '';
      paginationState.status = '';
      paginationState.currentPage = 1;
      getAllVehicles({ page: 1 });
    });
  }
});