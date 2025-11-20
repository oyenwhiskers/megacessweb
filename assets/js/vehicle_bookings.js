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

// Helper function to format a Date object into the YYYY-MM-DDTHH:MM string
function formatForDateTimeLocal(dateString) {
    if (!dateString) return "";

    const d = new Date(dateString);

    // Get components in local time
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');

    // Manually build the required format
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

// --- Global State for Booking Pagination ---
let bookingPaginationState = {
  currentPage: 1,
  lastPage: 1,
  perPage: 15,
  total: 0,
  search: '',
  bookingFilter: '' // Used for your 'bookingFilter' parameter
};

function updateBookingPaginationControls(meta) {
  // Update global state with data from the API's meta object
  bookingPaginationState.currentPage = meta.current_page;
  bookingPaginationState.lastPage = meta.last_page;
  bookingPaginationState.perPage = meta.per_page;
  bookingPaginationState.total = meta.total;

  // You can update non-button UI elements here if you have them, e.g.:
  // document.getElementById('totalBookingRecords').textContent = meta.total;

  // Trigger the function to build the clickable buttons
  renderBookingPagination(meta.current_page, meta.last_page);
}

function renderBookingPagination(current, last) {
  // 🎯 Note the use of your HTML ID: vehicleBookingPagination
  const container = document.getElementById('vehicleBookingPagination');
  if (!container) return;

  const maxButtons = 7; 
  let start = Math.max(1, current - Math.floor(maxButtons / 2));
  let end = Math.min(last, start + maxButtons - 1);
  if (end - start + 1 < maxButtons) {
    start = Math.max(1, end - maxButtons + 1);
  }

  let html = '';

  // Previous button
  const prevDisabled = current <= 1;
  html += `<li class="page-item ${prevDisabled ? 'disabled' : ''}">
             <a class="page-link" href="#" data-page="${Math.max(1, current - 1)}">Previous</a>
           </li>`;

  // Numbered pages
  for (let i = start; i <= end; i++) {
    html += `<li class="page-item ${i === current ? 'active' : ''}">
               <a class="page-link" href="#" data-page="${i}">${i}</a>
             </li>`;
  }

  // Next button
  const nextDisabled = current >= last;
  html += `<li class="page-item ${nextDisabled ? 'disabled' : ''}">
             <a class="page-link" href="#" data-page="${Math.min(last, current + 1)}">Next</a>
           </li>`;

  container.innerHTML = html;

  // --- Attach Click Listeners ---
  const enabledLinks = container.querySelectorAll('li.page-item:not(.disabled) a[data-page]');
  enabledLinks.forEach(link => {
    link.removeEventListener('click', handleBookingPaginationClick);
    link.addEventListener('click', handleBookingPaginationClick);
  });
}

function handleBookingPaginationClick(e) {
  e.preventDefault();
  
  // Get the page number from the clicked button
  const page = parseInt(e.currentTarget.dataset.page, 10);
  
  if (!page || page === bookingPaginationState.currentPage) return;

  // Call the main fetch function with the new page and current filters
  getAllVehicleBookings({
    search: bookingPaginationState.search,
    bookingFilter: bookingPaginationState.bookingFilter,
    page: page
  });
  
  // Scrolls the page to the top for better UX
  window.scrollTo(0, 0);
}

// Update Booking Table
function updateBookingTable() {
  const searchValue = document.getElementById('bookingSearch').value.trim() || '';
  const filterValue = document.getElementById('bookingFilterSelect').value || '';
  
  // Update the global state with new search/filter values
  bookingPaginationState.search = searchValue;
  bookingPaginationState.bookingFilter = filterValue;
  
  // Reset to page 1 and call the fetch function with the new parameters
  getAllVehicleBookings({ 
      search: searchValue, 
      bookingFilter: filterValue, 
      page: 1 // Always go to page 1 after a search/filter change
  });
}

// Attach event listeners to your search/filter inputs (using a debounce is recommended here)
// Example: document.getElementById('bookingSearch').addEventListener('input', updateBookingTable);
// Example: document.getElementById('bookingFilterSelect').addEventListener('change', updateBookingTable);

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
          updateBookingPaginationControls(result.meta);
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
          ${booking.datetime_booking ? new Date(booking.datetime_booking).toLocaleString('en-GB', { 
              day:'2-digit', 
              month:'short', 
              year:'numeric', 
              hour: '2-digit',      
              minute: '2-digit',
              hour12: true     
          }) : '-'}
      </div>
      <div class="col">
          ${booking.datetime_return ? new Date(booking.datetime_return).toLocaleString('en-GB', { 
              day:'2-digit', 
              month:'short', 
              year:'numeric', 
              hour: '2-digit',      
              minute: '2-digit',
              hour12: true     
          }) : '-'}
      </div>
      <div class="col text-center">
        <button class="btn btn-sm btn-warning me-2 edit-vehicle_booking-btn">
          <i class="bi bi-pencil"></i> Edit
        </button>
        <button class="btn btn-sm btn-danger delete-vehicle_booking-btn" data-id="${booking.id}" data-vehicle-id="${booking.vehicle_id}">
          <i class="bi bi-trash"></i> Delete
        </button>
      </div>
    `;

    tableBody.appendChild(row);

    // ✅ Attach click event to Edit button for opening update modal
    const editBtn = row.querySelector('.edit-vehicle_booking-btn');
    editBtn.addEventListener('click', () => {
      openUpdateVehicleBookingModal(booking); // Pass booking object
    });
  });

  // Reattach delete listeners
  attachDeleteBookingListeners();
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

// add vehicle form
document.getElementById("addVehicleBookingForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const vehicleInput = document.getElementById("bookingVehicleInput");
  const usedByInput = document.getElementById("usedBy");
  const vehicleId = vehicleInput.dataset.selectedId;
  const usedById = usedByInput.dataset.selectedUserId || usedByInput.dataset.selectedStaffId;
  const btn = document.getElementById("createBookingBtn");

  btn.disabled = true;
  btn.textContent = "Creating..."

  if (!vehicleId || !usedById) {
    showError("Please select a vehicle and a user/staff from the dropdown.");
    btn.disabled = false;
    btn.textContent = "Create Booking";
    return;
  }

  const bookingDate = document.getElementById("bookingDateInput").value;
  const returnDate = document.getElementById("returnDateInput").value;

  if (returnDate && new Date(bookingDate) >= new Date(returnDate)) {
    showError("Return date must be after booking date.");
    btn.disabled = false;
    btn.textContent = "Create Booking";
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

    btn.disabled = false;
    btn.textContent = "Create Booking";

    // Close modal
    bootstrap.Modal.getInstance(document.getElementById("addVehicleBookingModal")).hide();

  } catch (error) {
    console.error("💥 Error creating booking:", error);
    showError("Something went wrong while creating the booking.");
  }
});

// Attach delete button listeners
function attachDeleteBookingListeners() {
  const deleteButtons = document.querySelectorAll('.delete-vehicle_booking-btn');
  
  deleteButtons.forEach(btn => {
    // Remove previous listeners to avoid duplicates
    btn.replaceWith(btn.cloneNode(true));
  });

  // Re-select buttons after cloning
  const freshButtons = document.querySelectorAll('.delete-vehicle_booking-btn');

  freshButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const bookingId = btn.dataset.id;

      showConfirm("This will permanently delete the booking. Are you sure?", async () => {
        try {
          showLoading();
          const token = getToken();
          if (!token) return showErrorNoToken("Missing authentication token.");

          const response = await fetch(`https://mwms.megacess.com/api/v1/vehicle-bookings/${bookingId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          const result = await response.json();

          if (!response.ok || !result.success) {
            return showError(result.message || "Failed to delete booking.");
          }

          hideLoading();
          showSuccess(result.message || "Booking deleted successfully!");

          // Refresh table
          await getAllVehicleBookings();

        } catch (error) {
          console.error("💥 Error deleting booking:", error);
          showError("Something went wrong while deleting the booking.");
        }
      });
    });
  });
}

// ==================== Update Vehicle Booking ====================
async function updateVehicleBooking(bookingId, payload) {
  const token = getToken();
  if (!token) return showErrorNoToken();

  try {
    const response = await fetch(
      `https://mwms.megacess.com/api/v1/vehicle-bookings/${bookingId}`,
      {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    const result = await response.json();
    return { ok: response.ok && result.success, result };

  } catch (error) {
    console.error("💥 Update Error:", error);
    return { ok: false, result: { message: "Network or server error" } };
  }
}

function openUpdateVehicleBookingModal(booking) {
  const modalEl = document.getElementById('updateVehicleBookingModal');
  const modal = new bootstrap.Modal(modalEl);

  const vehicleInput = document.getElementById('updateBookingVehicleInput');
  const usedByInput = document.getElementById('updateUsedBy');

  // Prefill text values
  vehicleInput.value = `${booking.vehicle.vehicle_name} (${booking.vehicle.plate_number})`;
  usedByInput.value = booking.user 
    ? booking.user.user_fullname 
    : booking.staff 
    ? booking.staff.staff_fullname 
    : '';

  // Store selected IDs
  vehicleInput.dataset.selectedId = booking.vehicle.id;

  if (booking.user) {
    usedByInput.dataset.selectedUserId = booking.user.id;
    usedByInput.dataset.selectedStaffId = "";
  } else if (booking.staff) {
    usedByInput.dataset.selectedStaffId = booking.staff.id;
    usedByInput.dataset.selectedUserId = "";
  }

  // Pre-fill dates
  document.getElementById('updateBookingDateInput').value =
    booking.datetime_booking ? formatForDateTimeLocal(booking.datetime_booking) : "";

  document.getElementById('updateReturnDateInput').value =
    booking.datetime_return ? formatForDateTimeLocal(booking.datetime_return) : "";

  // Save booking ID for submission
  document.getElementById('updateVehicleBookingForm').dataset.bookingId = booking.id;

  modal.show();
}

document.getElementById("updateVehicleBookingForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const bookingId = e.target.dataset.bookingId;
  const btn = document.getElementById("updateBookingBtn");

  btn.disabled = true;
  btn.textContent = "Updating...";

  const payload = buildUpdateBookingPayload();

  // Date validation
  if (payload.datetime_return && new Date(payload.datetime_booking) >= new Date(payload.datetime_return)) {
    showError("Return date must be after booking date.");
    btn.disabled = false;
    btn.textContent = "Update";
    return;
  }

  const { ok, result } = await updateVehicleBooking(bookingId, payload);

  if (!ok) {
    showError(result.message || "Failed to update booking.");
    btn.disabled = false;
    btn.textContent = "Update";
    return;
  }

  showSuccess("Booking updated successfully!");
  await getAllVehicleBookings();

  // Close modal
  bootstrap.Modal.getInstance(document.getElementById('updateVehicleBookingModal')).hide();

  btn.disabled = false;
  btn.textContent = "Update";
});


function buildUpdateBookingPayload() {
  const vehicleInput = document.getElementById("updateBookingVehicleInput");
  const usedByInput = document.getElementById("updateUsedBy");

  const userId = usedByInput.dataset.selectedUserId || null;
  const staffId = usedByInput.dataset.selectedStaffId || null;

  return {
    vehicle_id: vehicleInput.dataset.selectedId || null,
    datetime_booking: document.getElementById("updateBookingDateInput").value,
    datetime_return: document.getElementById("updateReturnDateInput").value || null,
    user_id: userId,
    staff_id: staffId,
    person_type: userId ? "user" : "staff"
  };
}

let updateVehicleAutocompleteInitialized = false;

function setupUpdateVehicleAutocomplete() {
  if (updateVehicleAutocompleteInitialized) return;
  updateVehicleAutocompleteInitialized = true;

  const input = document.getElementById("updateBookingVehicleInput");
  const dropdown = document.getElementById("updateVehicleDropdown");
  if (!input || !dropdown) return;

  input.addEventListener("focus", () => {
    updateVehicleDropdownList(input.value, dropdown, input);
    dropdown.classList.add("show");
  });

  input.addEventListener("input", () => {
    updateVehicleDropdownList(input.value, dropdown, input);
    dropdown.classList.add("show");
  });

  document.addEventListener("click", (e) => {
    if (!input.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.classList.remove("show");
    }
  });
}

function initUpdateVehicleAutocomplete() {
  const input = document.getElementById("updateBookingVehicleInput");
  const dropdown = document.getElementById("updateVehicleDropdown");

  if (!input || !dropdown) return;
  if (input._initialized) return; // Prevent double init
  input._initialized = true;

  function renderList(filterText = "") {
    dropdown.innerHTML = "";

    const filtered = allVehicles.filter(v =>
      v.vehicle_name.toLowerCase().includes(filterText.toLowerCase()) ||
      v.plate_number.toLowerCase().includes(filterText.toLowerCase())
    );

    if (filtered.length === 0) {
      dropdown.innerHTML = `<li class="dropdown-item text-muted">No matching vehicles</li>`;
      dropdown.classList.add("show");
      return;
    }

    filtered.forEach(v => {
      const li = document.createElement("li");
      li.classList.add("dropdown-item");
      li.textContent = `${v.vehicle_name} (${v.plate_number})`;
      li.dataset.id = v.id;

      li.onclick = () => {
        input.value = li.textContent;
        input.dataset.selectedId = li.dataset.id;
        dropdown.classList.remove("show");
      };

      dropdown.appendChild(li);
    });

    dropdown.classList.add("show");
  }

  input.addEventListener("focus", () => renderList(input.value));
  input.addEventListener("input", () => renderList(input.value));

  document.addEventListener("click", (e) => {
    if (!input.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.classList.remove("show");
    }
  });
}

let updateUsedByAutocompleteInitialized = false;

function initUpdateUsedByAutocomplete() {
  const input = document.getElementById("updateUsedBy");
  const dropdown = document.getElementById("updateUsedByDropdown");

  if (!input || !dropdown) return;
  if (input._initialized) return; // Prevent double init
  input._initialized = true;

  function renderList(filterText = "") {
    dropdown.innerHTML = "";

    const filtered = allUsersAndStaff.filter(p =>
      p.fullname.toLowerCase().includes(filterText.toLowerCase())
    );

    if (filtered.length === 0) {
      dropdown.innerHTML = `<li class="dropdown-item text-muted">No matching users/staff</li>`;
      dropdown.classList.add("show");
      return;
    }

    filtered.forEach(person => {
      const li = document.createElement("li");
      li.classList.add("dropdown-item");
      li.textContent = `${person.fullname} (${person.user_id || person.staff_id}) - ${person.role}`;

      li.onclick = () => {
        input.value = li.textContent;

        // Store correct IDs
        input.dataset.selectedUserId = person.user_id || "";
        input.dataset.selectedStaffId = person.staff_id || "";

        dropdown.classList.remove("show");
      };

      dropdown.appendChild(li);
    });

    dropdown.classList.add("show");
  }

  input.addEventListener("focus", () => renderList(input.value));
  input.addEventListener("input", () => renderList(input.value));

  document.addEventListener("click", (e) => {
    if (!input.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.classList.remove("show");
    }
  });
}


function updateUsedByDropdownList(filterText, dropdown, input) {
  dropdown.innerHTML = "";

  const filtered = allUsersAndStaff.filter(item =>
    item.fullname.toLowerCase().includes(filterText.toLowerCase())
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

// ==================== DOMContentLoaded ====================
window.addEventListener('DOMContentLoaded', () => {
  getAllVehicleBookings();
  fetchUserAndStaff();
  fetchVehicle();
  initUpdateVehicleAutocomplete();
  initUpdateUsedByAutocomplete();
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
function updateVehicleBookingTable() {
  const searchValue = document.getElementById('vehicleBookingSearch').value.trim() || '';
  const filterValue = document.getElementById('vehicleBookingSortBy').value || '';
  
  // Reset to page 1 when searching or filtering
  getAllVehicleBookings({ search: searchValue, bookingFilter: filterValue, page: 1 });
}

// Debounce the search input to avoid flooding API requests
const handleVehicleBookingSearch = debounce(updateVehicleBookingTable, 150);

// Attach event listeners
document.getElementById('vehicleBookingSearch').addEventListener('input', handleVehicleBookingSearch);
document.getElementById('vehicleBookingSortBy').addEventListener('change', updateVehicleBookingTable);

document.getElementById('refreshVehicleBookingBtn').addEventListener('click', () => {
  // Reset search input
  document.getElementById('vehicleBookingSearch').value = '';

  // Reset status filter
  document.getElementById('vehicleBookingSortBy').value = '';

  // Reload vehicle table
  getAllVehicleBookings({ page: 1 });
});