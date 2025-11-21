// GLOBAL DECLARATION
let ALL_TOOLS = [];
let ALL_USERS_STAFF = [];
const TOOL_BOOKING_RESULTS_LIMIT = 8;

const toolBookingState = {
  search: '',
  sortBy: '',
  currentPage: 1,
  lastPage: 1,
  perPage: 10,
  total: 0,
};

async function loadBookingReferenceData({ force = false } = {}) {
  if (!force && ALL_TOOLS.length && ALL_USERS_STAFF.length) return;

  const [combinedRawData, toolsList] = await Promise.all([
    fetchUsersStaff(),
    fetchTools(),
  ]);

  ALL_TOOLS = toolsList.map(t => ({
    id: t.id,
    tool_name: t.tool_name,
    searchField: (t.tool_name || '').toLowerCase(),
  }));

  ALL_USERS_STAFF = combinedRawData.map(entity => {
    const isUser = entity.role === 'user';
    const type = isUser ? 'user' : 'staff';
    const idKey = isUser ? 'user_id' : 'staff_id';
    const typeLabel = isUser ? '(User)' : '(Staff)';
    const fullname = entity.fullname || entity.user_fullname || entity.staff_fullname || '';

    return {
      id: `${type}-${entity[idKey]}`,
      name: `${fullname} ${typeLabel}`.trim(),
      searchField: fullname.toLowerCase(),
    };
  }).filter(item => item.id && item.searchField);
}

function handleBookingSearch(inputElement, resultsListElement, sourceData, displayKey, type) {
  if (!inputElement || !resultsListElement || !Array.isArray(sourceData)) return;

  const query = inputElement.value.trim().toLowerCase();
  let filtered = sourceData;
  if (query) {
    filtered = sourceData.filter(item => (item.searchField || '').includes(query));
  }

  renderResults(
    inputElement,
    resultsListElement,
    filtered.slice(0, TOOL_BOOKING_RESULTS_LIMIT),
    displayKey,
    type
  );
}

function attachAutocomplete(inputElement, resultsListElement, sourceData, displayKey, type) {
  if (!inputElement || !resultsListElement) return;

  const debouncedSearch = debounce(() => handleBookingSearch(inputElement, resultsListElement, sourceData, displayKey, type), 300);
  inputElement.oninput = debouncedSearch;
  inputElement.onfocus = () => {
    if (inputElement.value.trim() === '') {
      handleBookingSearch(inputElement, resultsListElement, sourceData, displayKey, type);
    }
  };
}

function registerAutocompleteOutsideClick(modalElement, pairs = []) {
  if (!modalElement) return;
  modalElement.onclick = (e) => {
    pairs.forEach(({ input, results }) => {
      if (
        results &&
        input &&
        !e.target.closest(`#${results.id}`) &&
        !e.target.closest(`#${input.id}`)
      ) {
        results.style.display = 'none';
      }
    });
  };
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

// ==================== CRUD: Read & Render ====================

async function getAllToolBookings({ search = '', sortBy = '', page = 1 } = {}) {
  toolBookingState.search = search;
  toolBookingState.sortBy = sortBy;
  toolBookingState.currentPage = page;

  const queryParams = new URLSearchParams({
    search,
    statusFilter: sortBy,
    page,
    per_page: toolBookingState.perPage,
  });

  const path = `/tool-bookings?${queryParams.toString()}`;
  const loading = document.getElementById('loadingToolBooking');
  const tableBody = document.getElementById('toolBookingTableBody');

  if (loading) loading.style.display = 'block';
  if (tableBody) tableBody.innerHTML = '';

  try {
    const result = await apiFetch(path, { method: 'GET' });

    if (result.data && result.data.length > 0) {
      populateToolBookingTable(result.data);
    } else if (tableBody) {
      tableBody.innerHTML = `<div class="text-center text-muted py-3">No tool bookings found</div>`;
    }

    if (result.meta) {
      updateToolBookingPaginationControls(result.meta);
    } else {
      renderToolBookingPagination(toolBookingState.currentPage, toolBookingState.lastPage);
    }
  } catch (error) {
    showError(error.message);
    if (tableBody) tableBody.innerHTML = `<div class="text-center text-danger py-3">Error: ${error.message}</div>`;
    renderToolBookingPagination(toolBookingState.currentPage, toolBookingState.lastPage);
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

// ==================== Pagination ====================

function updateToolBookingPaginationControls(meta) {
  if (!meta) return;

  toolBookingState.currentPage = meta.current_page || toolBookingState.currentPage;
  toolBookingState.lastPage = meta.last_page || 1;
  toolBookingState.total = meta.total || 0;

  renderToolBookingPagination(toolBookingState.currentPage, toolBookingState.lastPage);
}

function renderToolBookingPagination(current, last) {
  const container = document.getElementById('toolBookingPagination');
  if (!container) return;

  if (!last || last <= 1) {
    container.innerHTML = '';
    return;
  }

  let html = '';
  const prevDisabled = current <= 1 ? 'disabled' : '';
  html += `<li class="page-item ${prevDisabled}"><a class="page-link" href="#" data-page="${current - 1}">Previous</a></li>`;

  const maxButtons = 5;
  let start = Math.max(1, current - 2);
  let end = Math.min(last, start + maxButtons - 1);

  if (end - start < maxButtons) {
    start = Math.max(1, end - maxButtons + 1);
  }

  for (let page = start; page <= end; page++) {
    html += `<li class="page-item ${page === current ? 'active' : ''}"><a class="page-link" href="#" data-page="${page}">${page}</a></li>`;
  }

  const nextDisabled = current >= last ? 'disabled' : '';
  html += `<li class="page-item ${nextDisabled}"><a class="page-link" href="#" data-page="${current + 1}">Next</a></li>`;

  container.innerHTML = html;

  container.querySelectorAll('a.page-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const page = parseInt(e.currentTarget.dataset.page, 10);
      if (!page || page === current || page < 1 || page > last) return;

      getAllToolBookings({
        search: toolBookingState.search,
        sortBy: toolBookingState.sortBy,
        page,
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
    getAllToolBookings({
      search: toolBookingState.search,
      sortBy: toolBookingState.sortBy,
      page: toolBookingState.currentPage,
    });
  } catch (error) {
    hideLoading();
    showError(error.message || 'Failed to delete tool booking.');
  }
}

// ==================== CRUD: Create Modal & Logic ====================

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
    } else if (type === 'user-staff') { 
        hiddenInputId = 'create_user_id';
    } else if (type === 'update-tool') {
        hiddenInputId = 'update_tool_id';
    } else if (type === 'update-user-staff') {
        hiddenInputId = 'update_user_id';
    }
    
    if (hiddenInputId) {
        const hiddenInput = document.getElementById(hiddenInputId);
        if (hiddenInput) hiddenInput.value = selectedItem.id;
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
  try {
    await loadBookingReferenceData({ force: true });
  } catch (error) {
    showError(error.message || 'Failed to load reference data.');
    return;
  }

  // 2. Get Modal/Form Elements and Reset
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
  attachAutocomplete(toolInput, toolResults, ALL_TOOLS, 'tool_name', 'tool');
  attachAutocomplete(userInput, userResults, ALL_USERS_STAFF, 'name', 'user-staff');

  // Hide results when clicking outside the input/results area
  registerAutocompleteOutsideClick(createModalElement, [
    { input: toolInput, results: toolResults },
    { input: userInput, results: userResults },
  ]);

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
  const btn = document.getElementById("saveToolBookingBtn");

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

  btn.disabled = true;
  btn.textContent = "Creating..."
  try {
    await apiFetch(`/tool-bookings`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    btn.disabled = false;
    btn.textContent = "Save Booking";
    showSuccess('Booking Created!', `New tool booking has been successfully recorded.`);

    const createModalInstance = bootstrap.Modal.getInstance(document.getElementById('createToolBookingModal'));
    if (createModalInstance) {
      createModalInstance.hide();
    }

    getAllToolBookings({
      search: toolBookingState.search,
      sortBy: toolBookingState.sortBy,
      page: 1,
    });

  } catch (error) {
    btn.disabled = false;
    btn.textContent = "Save Booking";
    showError(error.message || 'Failed to create tool booking. Please check your inputs.');
  }
}

// ==================== CRUD: Update Modal & Logic ====================

function ensureUpdateToolBookingModalExists() {
  if (document.getElementById('updateToolBookingModal')) return;

  const template = `
    <div class="modal fade" id="updateToolBookingModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header bg-warning text-white">
            <h5 class="modal-title" id="updateToolBookingModalLabel">Update Tool Booking</h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>

          <form id="updateToolBookingForm">
            <div class="modal-body">
              <input type="hidden" id="update_tool_booking_id" name="update_tool_booking_id">
              <div class="mb-3 position-relative">
                <label for="updateToolSearchInput" class="form-label">Tool</label>
                <input type="hidden" id="update_tool_id" name="update_tool_id" required>
                <input type="text" class="form-control" id="updateToolSearchInput" placeholder="Start typing the tool name..." autocomplete="off">
                <ul 
                  id="updateToolSearchResults"
                  class="dropdown-menu w-100"
                  style="max-height: 200px; overflow-y: auto;"
                ></ul>
              </div>

              <div class="mb-3 position-relative">
                <label for="updateUserSearchInput" class="form-label">Assigned Person</label>
                <input type="hidden" id="update_user_id" name="update_user_id" required>
                <input type="text" class="form-control" id="updateUserSearchInput" placeholder="Start typing the person's name..." autocomplete="off">
                <ul 
                  id="updateUserSearchResults"
                  class="dropdown-menu w-100"
                  style="max-height: 200px; overflow-y: auto;"
                ></ul>
              </div>

              <div class="mb-3">
                <label for="update_datetime_booking" class="form-label">Booking Date/Time</label>
                <input type="datetime-local" class="form-control" id="update_datetime_booking" name="update_datetime_booking" required>
              </div>

              <div class="mb-3">
                <label for="update_datetime_return" class="form-label">Expected Return Date/Time</label>
                <input type="datetime-local" class="form-control" id="update_datetime_return" name="update_datetime_return">
              </div>
            </div>
          </form>

          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
            <button id="updateToolBookingBtn" type="submit" form="updateToolBookingForm" class="btn btn-warning">Update Booking</button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', template);
}

async function openUpdateToolBookingModal(toolbooking) {
  if (!toolbooking) return;

  try {
    await loadBookingReferenceData();
  } catch (error) {
    showError(error.message || 'Failed to load reference data for update.');
    return;
  }

  ensureUpdateToolBookingModalExists();

  const modalElement = document.getElementById('updateToolBookingModal');
  const form = document.getElementById('updateToolBookingForm');
  const modalInstance = new bootstrap.Modal(modalElement);
  if (!form) return showError("Form element 'updateToolBookingForm' not found.");

  form.reset();
  form.dataset.bookingId = toolbooking.id;
  const bookingIdInput = document.getElementById('update_tool_booking_id');
  if (bookingIdInput) bookingIdInput.value = toolbooking.id;

  const toolInput = document.getElementById('updateToolSearchInput');
  const toolResults = document.getElementById('updateToolSearchResults');
  const userInput = document.getElementById('updateUserSearchInput');
  const userResults = document.getElementById('updateUserSearchResults');

  const toolId = toolbooking.tool_id || toolbooking.tool?.id || toolbooking.tool?.tool_id;
  const toolName = toolbooking.tool?.tool_name || 'Unnamed Tool';
  const toolHiddenInput = document.getElementById('update_tool_id');
  if (toolHiddenInput && toolId) toolHiddenInput.value = toolId;
  if (toolInput) toolInput.value = toolName;

  let assignedType = '';
  let assignedId = '';
  let assignedName = '';
  if (toolbooking.user) {
    assignedType = 'user';
    assignedId = toolbooking.user.id || toolbooking.user.user_id;
    assignedName = toolbooking.user.user_fullname || toolbooking.user.fullname || '';
  } else if (toolbooking.staff) {
    assignedType = 'staff';
    assignedId = toolbooking.staff.id || toolbooking.staff.staff_id;
    assignedName = toolbooking.staff.staff_fullname || toolbooking.staff.fullname || '';
  }

  const userHiddenInput = document.getElementById('update_user_id');
  if (userHiddenInput) userHiddenInput.value = assignedType && assignedId ? `${assignedType}-${assignedId}` : '';
  if (userInput) userInput.value = assignedName;

  const bookingInput = document.getElementById('update_datetime_booking');
  const returnInput = document.getElementById('update_datetime_return');
  if (bookingInput) bookingInput.value = formatForDateTimeLocal(toolbooking.datetime_booking);
  if (returnInput) returnInput.value = formatForDateTimeLocal(toolbooking.datetime_return);

  attachAutocomplete(toolInput, toolResults, ALL_TOOLS, 'tool_name', 'update-tool');
  attachAutocomplete(userInput, userResults, ALL_USERS_STAFF, 'name', 'update-user-staff');
  registerAutocompleteOutsideClick(modalElement, [
    { input: toolInput, results: toolResults },
    { input: userInput, results: userResults },
  ]);

  form.onsubmit = handleUpdateToolBookingSubmit;

  modalInstance.show();
}

async function handleUpdateToolBookingSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const bookingId = form?.dataset?.bookingId;
  if (!bookingId) {
    showError('Missing booking identifier.');
    return;
  }

  const formData = new FormData(form);
  const data = Object.fromEntries(formData.entries());
  const btn = document.getElementById('updateToolBookingBtn');
  if (!btn) {
    showError("Update button not found.");
    return;
  }

  const combinedUserId = data.update_user_id;
  if (!combinedUserId) {
    showError('Please select a user or staff member.');
    return;
  }

  const [type, id] = combinedUserId.split('-');
  const payload = {
    tool_id: data.update_tool_id,
    datetime_booking: data.update_datetime_booking,
    datetime_return: data.update_datetime_return || null,
    ...(type === 'user' && { user_id: id }),
    ...(type === 'staff' && { staff_id: id }),
  };

  if (!payload.tool_id) {
    showError('Please select a tool.');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Updating...';

  try {
    await apiFetch(`/tool-bookings/${bookingId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });

    showSuccess('Booking Updated!', `Tool booking has been updated successfully.`);

    const updateModalInstance = bootstrap.Modal.getInstance(document.getElementById('updateToolBookingModal'));
    if (updateModalInstance) updateModalInstance.hide();

    getAllToolBookings({
      search: toolBookingState.search,
      sortBy: toolBookingState.sortBy,
      page: toolBookingState.currentPage,
    });
  } catch (error) {
    showError(error.message || 'Failed to update tool booking. Please check your inputs.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Update Booking';
  }
}

// ==================== Initializer ====================

document.addEventListener('DOMContentLoaded', () => {
  const addButton = document.getElementById('addNewToolBookingBtn');
  if (addButton) {
    addButton.addEventListener('click', openCreateToolBookingModal);
  }

  const bookingTab = document.querySelector('.tab-pane[data-name="booking"]');
  const searchInput = bookingTab ? bookingTab.querySelector('input.form-control[placeholder="Search tools..."]') : null;
  const sortSelect = bookingTab ? bookingTab.querySelector('select.form-select') : null;

  if (searchInput) {
    const handleSearchInput = debounce(() => {
      toolBookingState.search = searchInput.value.trim();
      getAllToolBookings({
        search: toolBookingState.search,
        sortBy: toolBookingState.sortBy,
        page: 1,
      });
    }, 400);
    searchInput.addEventListener('input', handleSearchInput);
  }

  if (sortSelect) {
    sortSelect.addEventListener('change', () => {
      const value = !sortSelect.value || sortSelect.value.toLowerCase().includes('sort by') ? '' : sortSelect.value;
      toolBookingState.sortBy = value;
      getAllToolBookings({
        search: toolBookingState.search,
        sortBy: toolBookingState.sortBy,
        page: 1,
      });
    });
  }

  // Load the initial table data when the page loads
  getAllToolBookings({
    search: toolBookingState.search,
    sortBy: toolBookingState.sortBy,
    page: toolBookingState.currentPage,
  });
});