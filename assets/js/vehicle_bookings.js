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

// ==================== GET vehicle bookings ====================
async function getAllVehicleBookings({ search = '', bookingFilter = '', page = 1 } = {}) {
  const token = getToken();
  if (!token) {
    showErrorNoToken("Missing authentication token. Please login first.");  
    return;
  }

  const apiUrl = new URL('https://mwms.megacess.com/api/v1/vehicle-bookings');
  if (search) apiUrl.searchParams.append('search', search);
  if (bookingFilter) apiUrl.searchParams.append('bookingFilter', bookingFilter);
  //if (per_page) apiUrl.searchParams.append('per_page', per_page);
  if (page) apiUrl.searchParams.append('page', page);

  const loading = document.getElementById('loading');
  const tableBody = document.getElementById('vehicleBookingTableBody');
  loading.style.display = 'block';
  tableBody.innerHTML = '';

  try {
    console.log('Fetching vehicle bookings from:', apiUrl.toString()); // debug

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    console.log('Response status:', response.status); // debug
    const result = await response.json();
    console.log('Result:', result); // debug

    loading.style.display = 'none';

    if (response.ok && result.success) {
      if (result.data && result.data.length > 0) {
        populateVehicleBookingTable(result.data);

        // Only update pagination if meta exists
        if (result.meta) {
          updatePaginationControls(result.meta);
        } else {
          console.warn('No pagination meta received.');
          document.getElementById('currentPage').textContent = 1;
          document.getElementById('totalPages').textContent = 1;
          document.getElementById('totalRecords').textContent = result.data.length;
          renderPagination(1, 1);
        }

      } else {
        tableBody.innerHTML = `<div class="text-center text-muted py-3">No vehicle bookings found</div>`;
      }
    } else {
      tableBody.innerHTML = `<div class="text-center text-danger py-3">Error: ${result?.message || 'Unknown error'}</div>`;
      showError(result?.message || 'Failed to load vehicle bookings.');
    }

  } catch (error) {
    loading.style.display = 'none';
    tableBody.innerHTML = `<div class="text-center text-danger py-3">Failed to load vehicle bookings</div>`;
    console.error('Fetch error:', error);
    showError('Failed to load vehicle bookings. Please try again.');
  }
}

// ==================== Populate Vehicle Bookings Table ====================
function populateVehicleBookingTable(bookings) {
  const tableBody = document.getElementById('vehicleBookingTableBody');
  tableBody.innerHTML = '';

  bookings.forEach(booking => {
    const row = document.createElement('div');
    row.className = 'content-row d-flex border-bottom py-2 align-items-center';

    row.innerHTML = `
      <div class="col ps-3">
        ${booking.vehicle.vehicle_name}<br>
        <small>(${booking.vehicle.plate_number})</small>
      </div>
      <div class="col">${booking.user ? booking.user.user_fullname : booking.staff ? booking.staff.staff_fullname : '-'}</div>
      <div class="col">
        ${booking.datetime_booking ? new Date(booking.datetime_booking).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }) : '-'}
      </div>
      <div class="col">
        ${booking.datetime_return ? new Date(booking.datetime_return).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }) : '-'}
      </div>
      <div class="col text-center">
        <button class="btn btn-sm btn-warning me-2 edit-vehicle_booking-btn"
            data-id="${booking.id}"
            data-vehicleName="${booking.vehicle.vehicle_name}"
            data-plate="${booking.vehicle.plate_number}"
            data-person="${booking.user ? booking.user.user_fullname : booking.staff ? booking.staff.staff_fullname : ''}"
            data-bookingDate="${booking.datetime_booking ? new Date(booking.datetime_booking).toISOString().split('T')[0] : ''}"
            data-returnDate="${booking.datetime_return ? new Date(booking.datetime_return).toISOString().split('T')[0] : ''}">
          <i class="bi bi-pencil"></i> Edit
        </button>
        <button class="btn btn-sm btn-danger delete-vehicle_booking-btn" data-id="${booking.id}" data-vehicle-id="${booking.vehicle_id}">
          <i class="bi bi-trash"></i> Delete
        </button>
      </div>
    `;
    tableBody.appendChild(row);
  });

  // NOTE: Do not update stat cards here (per-page counts).
  // Stats are refreshed from the server via `refreshVehicleSummary()`
  // to ensure analytics reflect global totals only.

  // ✅ Reattach event listeners
  attachEditListeners();
  attachDeleteListeners();
}

// ==================== DOMContentLoaded ====================
window.addEventListener('DOMContentLoaded', () => {
  getAllVehicleBookings();
  // Fetch global analytics once on load
  //if (typeof refreshVehicleSummary === 'function') refreshVehicleSummary();
});