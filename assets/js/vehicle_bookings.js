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

  const loading = document.getElementById('loadingBooking');
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

// Global storage for autocomplete
let allVehicles = [];
let allUsersAndStaff = [];

// Open Modal and populate dropdowns
async function openAddVehicleBookingModal() {
  console.log("🔍 Opening Add Vehicle Booking Modal...");

  // Get modal element
  const modalEl = document.getElementById("addVehicleBookingModal");
  if (!modalEl) {
    console.warn("❌ Modal element not found.");
    return;
  }

  // Open Bootstrap modal
  const modal = new bootstrap.Modal(modalEl);
  modal.show();
}

// Fetch all vehicles (handle pagination)
async function fetchVehicle() {
  console.log("🔍 Starting fetchVehicle()...");

  const token = getToken();
  if (!token) {
    showErrorNoToken("Missing authentication token. Please login first.");
    return;
  }

  try {
    let allData = [];
    let page = 1;
    let lastPage = 1;

    do {
      console.log(`🌐 Fetching vehicles page ${page}...`);

      const url = new URL("https://mwms.megacess.com/api/v1/vehicles");
      url.searchParams.append("page", page);

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const result = await response.json();

      if (!response.ok) {
        showError(result.message || "Failed to fetch vehicles");
        return;
      }

      allData = allData.concat(result.data);

      // Pagination info
      lastPage = result.meta.last_page;
      page++;

    } while (page <= lastPage);

    allVehicles = allData;
    console.log("🔧 All vehicles fetched:", allVehicles);

    setupVehicleAutocomplete();

  } catch (error) {
    console.error("💥 Error fetching vehicles:", error);
    showError("Something went wrong while fetching vehicles.");
  }
}

// Vehicle autocomplete
let vehicleAutocompleteInitialized = false;
function setupVehicleAutocomplete() {
  if (vehicleAutocompleteInitialized) return;
  vehicleAutocompleteInitialized = true;
  const input = document.getElementById("bookingVehicleInput");
  const dropdown = document.getElementById("vehicleDropdown");
  if (!input || !dropdown) return;

  input.addEventListener("focus", () => {
    updateVehicleDropdown(input.value);
    dropdown.classList.add("show");
  });

  input.addEventListener("input", () => {
    updateVehicleDropdown(input.value);
    dropdown.classList.add("show");
  });

  document.addEventListener("click", (e) => {
    if (!input.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.classList.remove("show");
    }
  });
}

// Vehicle dropdown helper
function updateVehicleDropdown(filterText) {
  const input = document.getElementById("bookingVehicleInput");
  const dropdown = document.getElementById("vehicleDropdown");

  dropdown.innerHTML = "";

  const filtered = allVehicles.filter(v =>
    v.vehicle_name.toLowerCase().includes(filterText.toLowerCase()) ||
    v.plate_number.toLowerCase().includes(filterText.toLowerCase())
  );

  filtered.forEach(vehicle => {
    const li = document.createElement("li");
    li.classList.add("dropdown-item");
    li.textContent = `${vehicle.vehicle_name} (${vehicle.plate_number})`;
    li.dataset.id = vehicle.id;

    li.addEventListener("click", () => {
      input.value = li.textContent;
      input.dataset.selectedId = li.dataset.id;
      dropdown.classList.remove("show");
      console.log("✅ Selected vehicle:", li.textContent, "ID:", li.dataset.id);
    });

    dropdown.appendChild(li);
  });

  if (filtered.length === 0) {
    const li = document.createElement("li");
    li.classList.add("dropdown-item", "text-muted");
    li.textContent = "No matching vehicles";
    li.style.pointerEvents = "none";
    dropdown.appendChild(li);
  }
}

// Fetch Users & Staff
async function fetchUserAndStaff() {
  console.log("🔍 Starting fetchUserAndStaff()...");

  const token = getToken();
  if (!token) {
    showErrorNoToken("Missing authentication token. Please login first.");
    return;
  }

  try {
    const response = await fetch("https://mwms.megacess.com/api/v1/users-and-staff", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    const result = await response.json();
    if (!response.ok) {
      showError(result.message || "Failed to fetch users and staff");
      return;
    }

    allUsersAndStaff = result.data.map(item => ({
      user_id: item.user_id || null,
      staff_id: item.staff_id || null,
      fullname: item.fullname,
      role: item.role,
      img: item.img || null,
    }));

    console.log("🔧 Users and Staff fetched:", allUsersAndStaff);

    setupUsedByAutocomplete();

  } catch (error) {
    console.error("💥 Error fetching users/staff:", error);
    showError("Something went wrong while fetching users and staff.");
  }
}

// Used By autocomplete
let usedByAutocompleteInitialized = false;
function setupUsedByAutocomplete() {
  if (usedByAutocompleteInitialized) return; // already initialized
  usedByAutocompleteInitialized = true;

  const input = document.getElementById("usedBy");
  const dropdown = document.getElementById("usedByDropdown");
  if (!input || !dropdown) return;

  input.addEventListener("focus", () => {
    updateUsedByDropdown(input.value);
    dropdown.classList.add("show");
  });

  input.addEventListener("input", () => {
    updateUsedByDropdown(input.value);
    dropdown.classList.add("show");
  });

  document.addEventListener("click", (e) => {
    if (!input.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.classList.remove("show");
    }
  });
}

// Used By dropdown helper
function updateUsedByDropdown(filterText) {
  const input = document.getElementById("usedBy");
  const dropdown = document.getElementById("usedByDropdown");

  dropdown.innerHTML = "";

  const filtered = allUsersAndStaff.filter(item =>
    item.fullname.toLowerCase().includes(filterText.toLowerCase()) ||
    (item.user_id && item.user_id.toString().includes(filterText)) ||
    (item.staff_id && item.staff_id.toString().includes(filterText))
  );

  filtered.forEach(item => {
    const li = document.createElement("li");
    li.classList.add("dropdown-item");
    li.textContent = `${item.fullname} (${item.user_id || item.staff_id}) - ${item.role}`;
    li.dataset.userId = item.user_id;
    li.dataset.staffId = item.staff_id;

    li.addEventListener("click", () => {
      input.value = li.textContent;
      input.dataset.selectedUserId = item.user_id;
      input.dataset.selectedStaffId = item.staff_id;
      dropdown.classList.remove("show");
      console.log("✅ Selected Used By:", li.textContent);
    });

    dropdown.appendChild(li);
  });

  if (filtered.length === 0) {
    const li = document.createElement("li");
    li.classList.add("dropdown-item", "text-muted");
    li.textContent = "No matching users/staff";
    li.style.pointerEvents = "none";
    dropdown.appendChild(li);
  }
}

// EVENT LISTENER FOR OPENING MODAL
document.getElementById("openModalBtn").addEventListener("click", () => {
  openAddVehicleBookingModal();
});

//
document.getElementById("addVehicleBookingForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const vehicleInput = document.getElementById("bookingVehicleInput");
  const usedByInput = document.getElementById("usedBy");
  const vehicleId = vehicleInput.dataset.selectedId;
  const usedById = usedByInput.dataset.selectedUserId || usedByInput.dataset.selectedStaffId;

  if (!vehicleId || !usedById) {
    showError("Please select a vehicle and a user/staff from the dropdown.");
    return;
  }

  const bookingDate = document.getElementById("bookingDateInput").value;
  const returnDate = document.getElementById("returnDateInput").value;

  if (returnDate && new Date(bookingDate) >= new Date(returnDate)) {
    showError("Return date must be after booking date.");
    return;
  }

  const payload = {
    vehicle_id: vehicleId,
    datetime_booking: bookingDate,
    datetime_return: returnDate || null
  };

  const userId = usedByInput.dataset.selectedUserId;
  const staffId = usedByInput.dataset.selectedStaffId;

  if (userId && userId !== "null") {
    payload.user_id = userId;
  } else if (staffId && staffId !== "null") {
    payload.staff_id = staffId;
  }

  try {
    const token = getToken();
    if (!token) return showErrorNoToken("Missing authentication token.");

    const response = await fetch("https://mwms.megacess.com/api/v1/vehicle-bookings", {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    if (!response.ok || !result.success) return showError(result.message || "Failed to create booking.");

    showSuccess(result.message || "Booking created successfully!");

    // Refresh bookings table
    await getAllVehicleBookings();

    // Reset form
    document.getElementById("addVehicleBookingForm").reset();
    vehicleInput.dataset.selectedId = "";
    usedByInput.dataset.selectedUserId = "";
    usedByInput.dataset.selectedStaffId = "";
    document.getElementById("vehicleDropdown").classList.remove("show");
    document.getElementById("usedByDropdown").classList.remove("show");

    // Close modal
    bootstrap.Modal.getInstance(document.getElementById("addVehicleBookingModal")).hide();

  } catch (error) {
    console.error("💥 Error creating booking:", error);
    showError("Something went wrong while creating the booking.");
  }
});


// ==================== DOMContentLoaded ====================
window.addEventListener('DOMContentLoaded', () => {
  getAllVehicleBookings();
  fetchUserAndStaff();
  fetchVehicle();
});