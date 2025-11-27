// GLOBAL DECLARATION
let ALL_TOOLS = [];
let ALL_USERS_STAFF = [];

const toolBookingState = {
  search: '',
  sortBy: '',
  currentPage: 1,
  lastPage: 1,
  perPage: 10,
  total: 0,
};

// ==================== Data Fetching ====================

async function loadBookingReferenceData({ force = false } = {}) {
  if (!force && ALL_TOOLS.length && ALL_USERS_STAFF.length) return;

  try {
    const [usersStaffData, toolsData] = await Promise.all([
      fetchUsersStaff(),
      fetchTools(),
    ]);

    ALL_TOOLS = toolsData.map(t => ({
      id: t.id,
      tool_name: t.tool_name,
      name: t.tool_name, // Added for dropdown compatibility
    }));

    ALL_USERS_STAFF = usersStaffData.map(entity => {
      const isUser = entity.role === 'user';
      const type = isUser ? 'user' : 'staff';
      const idKey = isUser ? 'user_id' : 'staff_id';
      const typeLabel = isUser ? '(User)' : '(Staff)';
      const fullname = entity.fullname || entity.user_fullname || entity.staff_fullname || '';

      return {
        id: `${type}-${entity[idKey]}`, // Combined ID
        user_id: isUser ? entity[idKey] : null,
        staff_id: !isUser ? entity[idKey] : null,
        name: `${fullname} ${typeLabel}`.trim(),
        fullname: fullname, // For display
        typeLabel: typeLabel
      };
    }).filter(item => item.id);

    console.log("🔧 Tools loaded:", ALL_TOOLS.length);
    console.log("🔧 Tools:", ALL_TOOLS);
    console.log("🔧 Users/Staff loaded:", ALL_USERS_STAFF.length);
    console.log("🔧 Users/Staff:", ALL_USERS_STAFF);

  } catch (error) {
    console.error("Error loading reference data:", error);
  }
}

async function fetchUsersStaff() {
  const path = `/users-and-staff`;
  try {
    const result = await apiFetch(path, { method: 'GET' });
    return result.data || [];
  } catch (error) {
    console.error('Fetch Users/Staff Error:', error);
    return [];
  }
}

async function fetchTools() {
  const path = `/tools?status=available`;
  try {
    const result = await apiFetch(path, { method: 'GET' });
    return result.data || [];
  } catch (error) {
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
    bookingFilter: sortBy,
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
        <button class="btn btn-sm btn-warning me-2 update-tool-booking-btn" data-obj='${JSON.stringify(toolbooking).replace(/'/g, "&apos;")}'>
          <i class="bi bi-pencil"></i> Edit
        </button>
        <button class="btn btn-sm btn-danger delete-tool-booking-btn" data-id="${toolbooking.id}">
          <i class="bi bi-trash"></i> Delete
        </button>
      </div>
    `;
    tableBody.appendChild(row);
  });

  // Attach event listeners for the new rows
  tableBody.querySelectorAll('.update-tool-booking-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const booking = JSON.parse(e.currentTarget.dataset.obj);
      openUpdateToolBookingModal(booking);
    });
  });

  tableBody.querySelectorAll('.delete-tool-booking-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const toolBookingId = e.currentTarget.dataset.id;
      const message = `You are about to delete this booking. This action cannot be undone.`;
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

  if (!last) last = 1;

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

    if (window.refreshToolSummary) window.refreshToolSummary();
  } catch (error) {
    hideLoading();
    showError(error.message || 'Failed to delete tool booking.');
  }
}

// ==================== CRUD: Create Modal & Logic ====================

async function openCreateToolBookingModal() {
  console.log('Opening create modal for new Tool Booking');

  // Ensure data is loaded
  await loadBookingReferenceData();

  const createModalElement = document.getElementById('createToolBookingModal');
  if (!createModalElement) return showError("Modal element 'createToolBookingModal' not found.");

  const createModal = new bootstrap.Modal(createModalElement);
  const form = document.getElementById('createToolBookingForm');
  if (form) form.reset();

  // Reset datasets
  const toolInput = document.getElementById('bookingToolInput');
  const userInput = document.getElementById('bookingUserInput');
  if (toolInput) delete toolInput.dataset.selectedId;
  if (userInput) {
    delete userInput.dataset.selectedUserId;
    delete userInput.dataset.selectedStaffId;
  }

  // Set default date
  const now = new Date();
  const dateInput = document.getElementById('bookingDateInput');
  if (dateInput) dateInput.value = formatForDateTimeLocal(now.toISOString());

  createModal.show();
}

async function handleCreateToolBookingSubmit(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const btn = document.getElementById("createBookingBtn");

  const toolInput = document.getElementById('bookingToolInput');
  const userInput = document.getElementById('bookingUserInput');
  const bookingDateInput = document.getElementById('bookingDateInput');
  const returnDateInput = document.getElementById('returnDateInput');

  const toolId = toolInput.dataset.selectedId;
  const userId = userInput.dataset.selectedUserId;
  const staffId = userInput.dataset.selectedStaffId;

  if (!toolId) {
    showError('Please select a tool.');
    return;
  }
  if ((!userId || userId === 'null' || userId === 'undefined') && (!staffId || staffId === 'null' || staffId === 'undefined')) {
    showError('Please select a user or staff member.');
    return;
  }

  const payload = {
    tool_id: toolId,
    datetime_booking: bookingDateInput.value,
    datetime_return: returnDateInput.value || null,
  };

  if (userId && userId !== 'null' && userId !== 'undefined') {
    payload.user_id = parseInt(userId, 10);
  }
  if (staffId && staffId !== 'null' && staffId !== 'undefined') {
    payload.staff_id = parseInt(staffId, 10);
  }

  btn.disabled = true;
  btn.textContent = "Creating..."
  try {
    await apiFetch(`/tool-bookings`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    btn.disabled = false;
    btn.textContent = "Create Booking";
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

    if (window.refreshToolSummary) window.refreshToolSummary();

  } catch (error) {
    btn.disabled = false;
    btn.textContent = "Create Booking";
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
          <div class="modal-header bg-warning text-dark">
            <h5 class="modal-title">Update Tool Booking</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>

          <form id="updateToolBookingForm">
            <div class="modal-body">
              <!-- Tool -->
              <div class="mb-3 position-relative">
                <label class="form-label fw-semibold">Tool</label>
                <input type="text" class="form-control" id="updateToolInput" placeholder="Enter or select a tool" required autocomplete="off">
                <ul class="dropdown-menu w-100" id="updateToolDropdown" style="max-height: 200px; overflow-y: auto;"></ul>
              </div>

              <!-- Assigned Person -->
              <div class="mb-3 position-relative">
                <label class="form-label fw-semibold">Assigned Person</label>
                <input type="text" class="form-control" id="updateUserInput" placeholder="Enter or search user/staff" required autocomplete="off">
                <ul class="dropdown-menu w-100" id="updateUserDropdown" style="max-height: 200px; overflow-y: auto;"></ul>
              </div>

              <!-- Dates -->
              <div class="mb-3">
                <label class="form-label fw-semibold">Booking Date</label>
                <input type="datetime-local" class="form-control" id="updateBookingDateInput" required>
              </div>

              <div class="mb-3">
                <label class="form-label fw-semibold">Return Date</label>
                <input type="datetime-local" class="form-control" id="updateReturnDateInput">
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
              <button id="updateToolBookingBtn" type="submit" class="btn btn-warning">Update Booking</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', template);

  // Initialize dropdowns for the update modal immediately after creation
  initSearchableDropdown(
    document.getElementById("updateToolInput"),
    document.getElementById("updateToolDropdown"),
    async () => ALL_TOOLS,
    (t) => { document.getElementById("updateToolInput").dataset.selectedId = t.id; },
    (t) => t.tool_name,
    (t, text) => t.tool_name.toLowerCase().includes(text)
  );

  initSearchableDropdown(
    document.getElementById("updateUserInput"),
    document.getElementById("updateUserDropdown"),
    async () => ALL_USERS_STAFF,
    (p) => {
      const input = document.getElementById("updateUserInput");
      input.dataset.selectedUserId = p.user_id;
      input.dataset.selectedStaffId = p.staff_id;
    },
    (p) => p.name,
    (p, text) => p.name.toLowerCase().includes(text)
  );

  // Attach submit listener
  const form = document.getElementById('updateToolBookingForm');
  if (form) form.addEventListener('submit', handleUpdateToolBookingSubmit);
}

async function openUpdateToolBookingModal(toolbooking) {
  if (!toolbooking) return;

  await loadBookingReferenceData();
  ensureUpdateToolBookingModalExists();

  const modalElement = document.getElementById('updateToolBookingModal');
  const modalInstance = new bootstrap.Modal(modalElement);
  const form = document.getElementById('updateToolBookingForm');

  form.reset();
  form.dataset.bookingId = toolbooking.id;

  // Populate Fields
  const toolInput = document.getElementById('updateToolInput');
  const userInput = document.getElementById('updateUserInput');
  const dateInput = document.getElementById('updateBookingDateInput');
  const returnInput = document.getElementById('updateReturnDateInput');

  // Tool
  const toolName = toolbooking.tool ? toolbooking.tool.tool_name : 'Unnamed Tool';
  const toolId = toolbooking.tool_id || (toolbooking.tool ? toolbooking.tool.id : null);
  toolInput.value = toolName;
  toolInput.dataset.selectedId = toolId;

  // User/Staff
  let assignedName = '';
  let userId = null;
  let staffId = null;

  if (toolbooking.user) {
    assignedName = `${toolbooking.user.user_fullname} (User)`;
    userId = toolbooking.user.id || toolbooking.user.user_id;
  } else if (toolbooking.staff) {
    assignedName = `${toolbooking.staff.staff_fullname} (Staff)`;
    staffId = toolbooking.staff.id || toolbooking.staff.staff_id;
  }

  userInput.value = assignedName;
  userInput.dataset.selectedUserId = userId;
  userInput.dataset.selectedStaffId = staffId;

  // Dates
  dateInput.value = formatForDateTimeLocal(toolbooking.datetime_booking);
  returnInput.value = formatForDateTimeLocal(toolbooking.datetime_return);

  modalInstance.show();
}

async function handleUpdateToolBookingSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const bookingId = form.dataset.bookingId;

  const toolInput = document.getElementById('updateToolInput');
  const userInput = document.getElementById('updateUserInput');
  const dateInput = document.getElementById('updateBookingDateInput');
  const returnInput = document.getElementById('updateReturnDateInput');
  const btn = document.getElementById('updateToolBookingBtn');

  const toolId = toolInput.dataset.selectedId;
  const userId = userInput.dataset.selectedUserId;
  const staffId = userInput.dataset.selectedStaffId;

  if (!toolId) {
    showError('Please select a tool.');
    return;
  }
  if ((!userId || userId === 'null' || userId === 'undefined') && (!staffId || staffId === 'null' || staffId === 'undefined')) {
    showError('Please select a user or staff member.');
    return;
  }

  const payload = {
    tool_id: toolId,
    datetime_booking: dateInput.value,
    datetime_return: returnInput.value || null,
  };

  if (userId && userId !== 'null' && userId !== 'undefined') {
    payload.user_id = parseInt(userId, 10);
  }
  if (staffId && staffId !== 'null' && staffId !== 'undefined') {
    payload.staff_id = parseInt(staffId, 10);
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

    if (window.refreshToolSummary) window.refreshToolSummary();
  } catch (error) {
    showError(error.message || 'Failed to update tool booking. Please check your inputs.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Update Booking';
  }
}

// ==================== Initializer ====================

document.addEventListener('DOMContentLoaded', () => {
  // 1. Load Data
  loadBookingReferenceData();
  getAllToolBookings();

  // 2. Setup Add Modal Dropdowns
  initSearchableDropdown(
    document.getElementById("bookingToolInput"),
    document.getElementById("toolDropdown"),
    async () => ALL_TOOLS,
    (t) => { document.getElementById("bookingToolInput").dataset.selectedId = t.id; },
    (t) => t.tool_name,
    (t, text) => t.tool_name.toLowerCase().includes(text)
  );

  initSearchableDropdown(
    document.getElementById("bookingUserInput"),
    document.getElementById("userDropdown"),
    async () => ALL_USERS_STAFF,
    (p) => {
      const input = document.getElementById("bookingUserInput");
      input.dataset.selectedUserId = p.user_id;
      input.dataset.selectedStaffId = p.staff_id;
    },
    (p) => p.name,
    (p, text) => p.name.toLowerCase().includes(text)
  );

  // 3. Event Listeners
  const addBtn = document.getElementById('addNewToolBookingBtn'); // Button on the page
  if (addBtn) {
    addBtn.addEventListener('click', openCreateToolBookingModal);
  }

  // Note: The "Add Tools" button in the Tools tab (not booking tab) is handled by tools.js probably, 
  // but here we are concerned with "Add Booking" button.
  // In HTML: <button id="addNewToolBookingBtn" ...>

  const createForm = document.getElementById('createToolBookingForm');
  if (createForm) {
    createForm.addEventListener('submit', handleCreateToolBookingSubmit);
  }

  // Search & Sort
  const searchInput = document.getElementById('toolBookingSearch');
  const sortSelect = document.getElementById('toolBookingSort');

  if (searchInput) {
    const handleSearchInput = debounce(() => {
      toolBookingState.search = searchInput.value.trim();
      getAllToolBookings({
        search: toolBookingState.search,
        sortBy: toolBookingState.sortBy,
        page: 1,
      });
    }, 100);
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
});

document.getElementById('refreshToolBookingBtn').addEventListener('click', () => {
  document.getElementById('toolBookingSearch').value = '';
  document.getElementById('toolBookingSort').value = '';
  getAllToolBookings({ search: '', sortBy: '', page: 1 });
});