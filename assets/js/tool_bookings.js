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

// ==================== Loading Overlay That Covers Entire Screen in HTML ====================
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

// ==================== Reusable API Fetch Helper (DRY Principle) ====================
async function apiFetch(path, options = {}) {
  const BASE_URL = 'https://mwms.megacess.com/api/v1'; 
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

    // Attempt to parse JSON; handles 204 No Content by returning null/empty object
    const result = await response.json().catch(() => ({})); 

    // Check for HTTP errors (4xx, 5xx) or API-reported success: false
    if (!response.ok || result.success === false) {
      throw new Error(result.message || `API Error: ${response.status}`);
    }

    return result; 

  } catch (error) {
    console.error('API Fetch Error:', error);
    // Re-throw the error to be caught by the specific CRUD function
    throw error; 
  }
}

// Function name changed to reflect tool bookings
async function getAllToolBookings({ search = '', sortBy = '', page = 1 } = {}) {
  // 🎯 Endpoint changed from /vehicle-bookings to /tool-bookings
  const path = `/tool-bookings?search=${search}&statusFilter=${sortBy}&page=${page}`;

  // 🎯 HTML ID changes
  const loading = document.getElementById('loadingToolBooking');
  const tableBody = document.getElementById('toolBookingTableBody');
  loading.style.display = 'block';
  tableBody.innerHTML = '';

  try {
    const result = await apiFetch(path, { method: 'GET' });
    console.log(result)

    if (result.data && result.data.length > 0) {
      // 🎯 Renderer function name changed
      console.log("rendering tool bookings")
      populateToolBookingTable(result.data); 
      
      if (result.meta) {
        // 🎯 Pagination function name changed
        updateToolPaginationControls(result.meta); 
      }
    } else {
      tableBody.innerHTML = `<div class="text-center text-muted py-3">No tool bookings found</div>`;
    }
  } catch (error) {
    showError(error.message); 
    tableBody.innerHTML = `<div class="text-center text-danger py-3">Error: ${error.message}</div>`;
  } finally {
    loading.style.display = 'none';
  }
}

function populateToolBookingTable(toolbookings){
  const tableBody = document.getElementById('toolBookingTableBody');
  tableBody.innerHTML = '';

  toolbookings.forEach(toolbooking => {
    const row = document.createElement('div');
    row.className = 'content-row d-flex border-bottom py-2 align-items-center';

    row.innerHTML = `
      <div class="col">${toolbooking.tool.tool_name || 'Unnamed Tool'}</div>
      <div class="col">${toolbooking.user ? toolbooking.user.user_fullname : toolbooking.staff ? toolbooking.staff.staff_fullname : '-'}</div>
      <div class="col">
          ${toolbooking.datetime_booking ? new Date(toolbooking.datetime_booking).toLocaleString('en-GB', { 
              day:'2-digit', 
              month:'short', 
              year:'numeric', 
              hour: '2-digit',      
              minute: '2-digit',
              hour12: true     
          }) : '-'}
      </div>
      <div class="col">
          ${toolbooking.datetime_return ? new Date(toolbooking.datetime_return).toLocaleString('en-GB', { 
              day:'2-digit', 
              month:'short', 
              year:'numeric', 
              hour: '2-digit',      
              minute: '2-digit',
              hour12: true     
          }) : '-'}
      </div>
      <div class="col text-center">
        <button class="btn btn-sm btn-warning me-2 update-tool-booking-btn" data-id="${toolbooking.id}">
          <i class="bi bi-pencil"></i> Edit
        </button>
        <button class="btn btn-sm btn-danger delete-tool-booking-btn" data-id="${toolbooking.id}">
          <i class="bi bi-trash"></i> Delete
        </button>
      </div>
    `;
    tableBody.appendChild(row);

    // ✅ FIX: Attach click event to Edit button and pass the correct 'toolbooking' object
    const editBtn = row.querySelector('.update-tool-booking-btn');
    editBtn.addEventListener('click', () => {
      openUpdateToolBookingModal(toolbooking); // ***CORRECTED FUNCTION NAME AND VARIABLE***
    });
    
    // ✅ Next Step: Attach click event to Delete button
    const deleteBtn = row.querySelector('.delete-tool-booking-btn');
    deleteBtn.addEventListener('click', (e) => {
      const toolBookingId = e.currentTarget.dataset.id;
      const message = `You are about to delete the booking for tool: ${toolbooking.tool.tool_name}. This action cannot be undone.`;

      // *** REFACTORED TO USE showConfirm ***
      showConfirm(message, () => {
        deleteToolBooking(toolBookingId); 
      });
    });
  });
}

// Function 1: To open and populate the update modal
function openUpdateToolBookingModal(toolbooking) {
    console.log('Opening update modal for Tool Booking ID:', toolbooking.id);
    // You must implement the logic to:
    // 1. Find the modal element (e.g., using Bootstrap or a custom solution).
    // 2. Populate its form fields (Tool Name, User, Booking Date, Return Date) 
    //    using the data from the 'toolbooking' object.
    // 3. Display the modal.
}

// Function 2: To handle the deletion of a booking
async function deleteToolBooking(id) {
    const path = `/tool-bookings/${id}`;
    showLoading();
    try {
        const result = await apiFetch(path, { method: 'DELETE' });
        hideLoading();
        showSuccess('Tool booking deleted !')
        // Refresh the table after successful deletion
        getAllToolBookings(); 
    } catch (error) {
        hideLoading();
        showError(error.message || 'Failed to delete tool booking.');
    }
}


// ==================== DOMContentLoaded ====================
window.addEventListener('DOMContentLoaded', () => {
  getAllToolBookings();
});