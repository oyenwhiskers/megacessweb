let ALL_TOOLS = [];
let ALL_USERS_STAFF = [];

// ==================== Debounce Helper ====================
function debounce(func, delay) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), delay);
  };
}

// ==================== SweetAlert2 & UI Helper Functions ====================
function showSuccess(title, msg = '') {
  Swal.fire({
    icon: 'success',
    title: title,
    text: msg,
    timer: 2000,
    showConfirmButton: false
  });
}

function showErrorNoToken(msg) {
  Swal.fire({
    icon: 'error',
    title: 'Missing authentication token',
    text: msg,
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

function showLoading() {
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) overlay.classList.remove('d-none');
}

function hideLoading() {
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) overlay.classList.add('d-none');
}

/* -------------------- Token & API Utilities -------------------- */
function getToken() {
  const keys = ['authToken', 'auth_token', 'token', 'access_token'];
  for (const k of keys) {
    const v = localStorage.getItem(k) || sessionStorage.getItem(k);
    if (v) return v;
  }
  console.warn(" No token found in storage");
  return null;
}

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

// ==================== Data Fetching Functions ====================

async function fetchUsersStaff() {
  const path = `/users-and-staff`;

  showLoading();
  try {
    const result = await apiFetch(path, { method: 'GET' });
    hideLoading();
    console.log(result);
    return result.data || [];
  } catch (error) {
    hideLoading();
    showError('Failed to fetch user and staff list.');
    console.error('Fetch Users/Staff Error:', error);
    return [];
  }
}

async function fetchTools() {
  const path = `/tools?status=available`;

  showLoading();
  try {
    const result = await apiFetch(path, { method: 'GET' });
    hideLoading();
    return result.data || [];
  } catch (error) {
    hideLoading();
    showError('Failed to fetch tools list.');
    console.error('Fetch Tools Error:', error);
    return [];
  }
}

// ==================== Date Formatting Helper ====================

function formatForDateTimeLocal(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  const offset = date.getTimezoneOffset() * 60000;
  const localTime = new Date(date.getTime() - offset);
  return localTime.toISOString().slice(0, 16);
}

// ==================== CRUD: Read & Render ====================

async function getAllToolBookings({ search = '', sortBy = '', page = 1 } = {}) {
  const path = `/tool-bookings?search=${search}&statusFilter=${sortBy}&page=${page}`;
  const loading = document.getElementById('loadingToolBooking');
  const tableBody = document.getElementById('toolBookingTableBody');

  if (loading) loading.style.display = 'block';
  if (tableBody) tableBody.innerHTML = '';

  try {
    const result = await apiFetch(path, { method: 'GET' });

    if (result.data && result.data.length > 0) {
      populateToolBookingTable(result.data);

      if (result.meta) {
        updateToolPaginationControls(result.meta);
      }
    } else {
      if (tableBody) tableBody.innerHTML = `<div class="text-center text-muted py-3">No tool bookings found</div>`;
    }
  } catch (error) {
    showError(error.message);
    if (tableBody) tableBody.innerHTML = `<div class="text-center text-danger py-3">Error: ${error.message}</div>`;
  } finally {
    if (loading) loading.style.display = 'none';
  }
}

function populateToolBookingTable(toolbookings) {
  const tableBody = document.getElementById('toolBookingTableBody');
  if (!tableBody) return;
  tableBody.innerHTML = '';

  toolbookings.forEach(toolbooking => {
    const row = document.createElement('div');
    row.className = 'content-row d-flex border-bottom py-2 align-items-center';

    const bookingDate = toolbooking.datetime_booking ? new Date(toolbooking.datetime_booking).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : '-';
    const returnDate = toolbooking.datetime_return ? new Date(toolbooking.datetime_return).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : '-';
    const assignedPerson = toolbooking.user ? toolbooking.user.user_fullname : toolbooking.staff ? toolbooking.staff.staff_fullname : '-';

    row.innerHTML = `
      <div class="col">${toolbooking.tool.tool_name || 'Unnamed Tool'}</div>
      <div class="col">${assignedPerson}</div>
      <div class="col">${bookingDate}</div>
      <div class="col">${returnDate}</div>
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

    const editBtn = row.querySelector('.update-tool-booking-btn');
    if (editBtn) editBtn.addEventListener('click', () => {
      openUpdateToolBookingModal(toolbooking);
    });

    const deleteBtn = row.querySelector('.delete-tool-booking-btn');
    if (deleteBtn) deleteBtn.addEventListener('click', (e) => {
      const toolBookingId = e.currentTarget.dataset.id;
      const message = `You are about to delete the booking for tool: ${toolbooking.tool.tool_name}. This action cannot be undone.`;
      showConfirm(message, () => {
        deleteToolBooking(toolBookingId);
      });
    });
  });
}

// ==================== CRUD: Delete ====================

async function deleteToolBooking(id) {
  const path = `/tool-bookings/${id}`;
  showLoading();
  try {
    await apiFetch(path, { method: 'DELETE' });
    hideLoading();
    showSuccess('Tool booking deleted !');
    getAllToolBookings();
  } catch (error) {
    hideLoading();
    showError(error.message || 'Failed to delete tool booking.');
  }
}

// ==================== CRUD: Create Modal & Logic ====================

// --- Autocomplete Helper Functions ---
function handleSearch(inputElement, resultsListElement, dataArray, displayKey, type) {
    const query = inputElement.value.toLowerCase().trim();
    
    // Logic to show all results on focus OR filtered results while typing
    let filteredResults = [];
    
    // 🎯 MODIFIED: If query is empty (on focus), use all data.
    if (query.length === 0) {
        filteredResults = dataArray; 
    } else {
        // Filter based on the query when the user is typing
        filteredResults = dataArray.filter(item => {
            const searchAgainst = item[displayKey] ? item[displayKey].toLowerCase() : (item.searchField || '').toLowerCase();
            return searchAgainst.includes(query);
        });
    }

    // Render results
    renderResults(inputElement, resultsListElement, filteredResults, displayKey, type);
}

/**
 * Renders the filtered results into the UL list.
 */
function renderResults(inputElement, resultsListElement, results, displayKey, type) {
    resultsListElement.innerHTML = '';

    if (results.length === 0) {
        resultsListElement.innerHTML = `<li class="list-group-item text-muted">No results found.</li>`;
        resultsListElement.style.display = 'block';
        return;
    }

    results.forEach(item => {
        const listItem = document.createElement('li');
        listItem.className = 'list-group-item list-group-item-action cursor-pointer';
        listItem.textContent = item[displayKey];
        
        listItem.onclick = () => selectItem(inputElement, resultsListElement, item, type);
        
        resultsListElement.appendChild(listItem);
    });

    resultsListElement.style.display = 'block';
}

/**
 * Sets the selected item's value into the hidden input and clears the search box.
 */
function selectItem(inputElement, resultsListElement, selectedItem, type) {
    // 1. Set the visible input text
    inputElement.value = selectedItem.name || selectedItem.tool_name;

    // 2. Set the hidden input value (This is what gets submitted!)
    let hiddenInputId;
    if (type === 'tool') {
        hiddenInputId = 'create_tool_id';
        document.getElementById(hiddenInputId).value = selectedItem.id;
    } else { 
        hiddenInputId = 'create_user_id';
        document.getElementById(hiddenInputId).value = selectedItem.id; 
    }
    
    // 3. Hide the results list
    resultsListElement.style.display = 'none';
    
    // 4. Manually trigger change for validation on hidden field
    const hiddenInput = document.getElementById(hiddenInputId);
    if (hiddenInput) hiddenInput.dispatchEvent(new Event('change'));
}

// --- Main Create Functions ---

async function openCreateToolBookingModal() {
  console.log('Opening create modal for new Tool Booking');

  // 1. Fetch required data and store it globally for search
  const [combinedRawData, toolsList] = await Promise.all([
    fetchUsersStaff(),
    fetchTools()
  ]);

  // 2. Store and Transform Data Globally for Search
  ALL_TOOLS = toolsList.map(t => ({
    id: t.id,
    tool_name: t.tool_name,
    searchField: t.tool_name.toLowerCase()
  }));

  ALL_USERS_STAFF = combinedRawData.map(entity => {
    // Transform API response structure into standardized objects for search/display
    const isUser = entity.role === 'user';
    const type = isUser ? 'user' : 'staff';
    const idKey = isUser ? 'user_id' : 'staff_id';
    const typeLabel = isUser ? '(User)' : '(Staff)';

    return {
      // Value submitted: "type-ID" (e.g., "user-1", "staff-5")
      id: `${type}-${entity[idKey]}`,
      name: `${entity.fullname} ${typeLabel}`,
      searchField: entity.fullname.toLowerCase()
    };
  });

  // 3. Get Modal/Form Elements and Reset
  const createModalElement = document.getElementById('createToolBookingModal');
  if (!createModalElement) return showError("Modal element 'createToolBookingModal' not found.");

  const createModal = new bootstrap.Modal(createModalElement);
  const form = document.getElementById('createToolBookingForm');
  if (!form) return showError("Form element 'createToolBookingForm' not found.");

  form.reset();
  form.onsubmit = handleCreateToolBookingSubmit; // Attach submission handler

  // 4. Get Autocomplete Elements and Reset their state (CRUCIAL for re-opening)
  const toolInput = document.getElementById('toolSearchInput');
  const userInput = document.getElementById('userSearchInput');
  const toolResults = document.getElementById('toolSearchResults');
  const userResults = document.getElementById('userSearchResults');
  
  // Reset input values and hide results lists
  if (toolInput) toolInput.value = '';
  if (document.getElementById('create_tool_id')) document.getElementById('create_tool_id').value = '';
  if (userInput) userInput.value = '';
  if (document.getElementById('create_user_id')) document.getElementById('create_user_id').value = '';
  if (toolResults) toolResults.style.display = 'none';
  if (userResults) userResults.style.display = 'none';


  // 5. Attach Debounced Search and Focus Listeners
  
  // Debounced search for Tools
  const debouncedToolSearch = debounce(() => handleSearch(toolInput, toolResults, ALL_TOOLS, 'tool_name', 'tool'), 300);
  if (toolInput) {
    toolInput.oninput = debouncedToolSearch;
    // Show all results if input is empty when focused
    toolInput.onfocus = () => { if (toolInput.value.trim() === '') handleSearch(toolInput, toolResults, ALL_TOOLS, 'tool_name', 'tool'); };
  }

  // Debounced search for Users/Staff
  const debouncedUserSearch = debounce(() => handleSearch(userInput, userResults, ALL_USERS_STAFF, 'name', 'user-staff'), 300);
  if (userInput) {
    userInput.oninput = debouncedUserSearch;
    // Show all results if input is empty when focused
    userInput.onfocus = () => { if (userInput.value.trim() === '') handleSearch(userInput, userResults, ALL_USERS_STAFF, 'name', 'user-staff'); };
  }

  // Hide results when clicking outside the input/results area
  createModalElement.onclick = (e) => {
    if (toolResults && toolInput && !e.target.closest('#toolSearchResults') && !e.target.closest('#toolSearchInput')) toolResults.style.display = 'none';
    if (userResults && userInput && !e.target.closest('#userSearchResults') && !e.target.closest('#userSearchInput')) userResults.style.display = 'none';
  };

  // 6. Set default date/time values
  const now = new Date();
  document.getElementById('create_datetime_booking').value = formatForDateTimeLocal(now.toISOString());
  document.getElementById('create_datetime_return').value = '';

  // 7. Display the modal
  createModal.show();
}
async function handleCreateToolBookingSubmit(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const formData = new FormData(form);
  const data = Object.fromEntries(formData.entries());

  const combinedUserId = data.create_user_id;

  if (!combinedUserId) {
    showError('Please select a user or staff member.');
    return;
  }

  const [type, id] = combinedUserId.split('-');

  // Construct the API Payload
  const payload = {
    tool_id: data.create_tool_id,
    datetime_booking: data.create_datetime_booking,
    datetime_return: data.create_datetime_return,
    ...(type === 'user' && { user_id: id }),
    ...(type === 'staff' && { staff_id: id }),
  };

  showLoading();
  try {
    await apiFetch(`/tool-bookings`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    hideLoading();
    showSuccess('Booking Created!', `New tool booking has been successfully recorded.`);

    const createModalInstance = bootstrap.Modal.getInstance(document.getElementById('createToolBookingModal'));
    if (createModalInstance) {
      createModalInstance.hide();
    }

    getAllToolBookings();

  } catch (error) {
    hideLoading();
    showError(error.message || 'Failed to create tool booking. Please check your inputs.');
  }
}

// ==================== Placeholder Functions ====================

// Required for the edit button handler
function openUpdateToolBookingModal(toolbooking) {
    showError("Update Modal functionality is not yet implemented.");
    console.warn("Attempted to open update modal for:", toolbooking);
}

// Required for the pagination logic
function updateToolPaginationControls(meta) {
    // Implement logic to update pagination buttons based on meta data (meta.current_page, meta.last_page, etc.)
    console.log("Pagination update required:", meta);
}


// ==================== Initializer ====================

window.addEventListener('DOMContentLoaded', () => {
  const addButton = document.getElementById('addNewToolBookingBtn');
  if (addButton) {
    addButton.addEventListener('click', openCreateToolBookingModal);
  }

  // Load the initial table data when the page loads
  getAllToolBookings();
});