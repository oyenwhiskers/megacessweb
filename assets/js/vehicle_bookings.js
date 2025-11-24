// ==================== GLOBAL STATE ====================
let allVehicles = [];
let allUsersAndStaff = [];
let bookingPaginationState = {
    currentPage: 1,
    lastPage: 1,
    perPage: 10,
    total: 0,
    search: '',
    bookingFilter: ''
};

// ==================== DATA FETCHING ====================

async function fetchVehicle() {
    const token = getToken();
    if (!token) return;

    try {
        let allData = [];
        let page = 1;
        let lastPage = 1;

        // Fetch all pages to build complete list for autocomplete
        do {
            const response = await fetch(`https://mwms.megacess.com/api/v1/vehicles?page=${page}`, {
                method: "GET",
                headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);

            allData = allData.concat(result.data);
            lastPage = result.meta.last_page;
            page++;
        } while (page <= lastPage);

        allVehicles = allData;
        console.log("🔧 Vehicles loaded:", allVehicles.length);

    } catch (error) {
        console.error("Error fetching vehicles:", error);
        showError("Failed to load vehicle list.");
    }
}

async function fetchUserAndStaff() {
    const token = getToken();
    if (!token) return;

    try {
        const response = await fetch("https://mwms.megacess.com/api/v1/users-and-staff", {
            method: "GET",
            headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message);

        allUsersAndStaff = result.data.map(item => ({
            user_id: item.user_id || null,
            staff_id: item.staff_id || null,
            fullname: item.fullname,
            role: item.role,
            displayLabel: `${item.fullname} (${item.user_id || item.staff_id}) - ${item.role}`
        }));
        console.log("🔧 Users/Staff loaded:", allUsersAndStaff.length);

    } catch (error) {
        console.error("Error fetching users:", error);
        showError("Failed to load user list.");
    }
}

// ==================== MAIN TABLE LOGIC ====================

async function getAllVehicleBookings({ search = '', bookingFilter = '', page = 1, per_page = 10 } = {}) {
    const token = getToken();
    if (!token) {
        showErrorNoToken("Please login first.");
        return;
    }

    const apiUrl = new URL('https://mwms.megacess.com/api/v1/vehicle-bookings');
    if (search) apiUrl.searchParams.append('search', search);
    if (bookingFilter) apiUrl.searchParams.append('bookingFilter', bookingFilter);
    apiUrl.searchParams.append('page', page);
    apiUrl.searchParams.append('per_page', per_page);

    const loading = document.getElementById('loadingBooking');
    const tableBody = document.getElementById('vehicleBookingTableBody');
    if (loading) loading.style.display = 'block';
    if (tableBody) tableBody.innerHTML = '';

    try {
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        });
        const result = await response.json();
        if (loading) loading.style.display = 'none';

        if (response.ok && result.success) {
            let data = [];
            let meta = {};

            // Option A: Root Meta
            if (result.meta) {
                data = result.data;
                meta = result.meta;
            }
            // Option B: Nested Meta
            else if (result.data && Array.isArray(result.data.data) && result.data.current_page) {
                data = result.data.data;
                meta = result.data;
            }
            // Fallback: Client-side pagination
            else if (Array.isArray(result.data)) {
                const allData = result.data;
                const total = allData.length;
                const lastPage = Math.ceil(total / per_page) || 1;

                const start = (page - 1) * per_page;
                const end = start + per_page;
                data = allData.slice(start, end);

                meta = {
                    current_page: parseInt(page),
                    last_page: lastPage,
                    total: total,
                    per_page: per_page
                };
            }

            if (data && data.length > 0) {
                populateVehicleBookingTable(data);
                updateBookingPaginationControls(meta);
            } else {
                if (tableBody) tableBody.innerHTML = `<div class="text-center text-muted py-3">No bookings found</div>`;
                // Clear pagination
                const container = document.getElementById('vehicleBookingPagination');
                if (container) container.innerHTML = '';
            }
        } else {
            showError(result.message || 'Failed to load bookings.');
        }
    } catch (error) {
        if (loading) loading.style.display = 'none';
        showError('Network error while loading bookings.');
    }
}

function populateVehicleBookingTable(bookings) {
    const tableBody = document.getElementById('vehicleBookingTableBody');
    if (!tableBody) return;
    tableBody.innerHTML = '';

    bookings.forEach(booking => {
        const row = document.createElement('div');
        row.className = 'content-row d-flex border-bottom py-2 align-items-center';

        const userName = booking.user ? booking.user.user_fullname : (booking.staff ? booking.staff.staff_fullname : '-');
        const dateBook = booking.datetime_booking ? new Date(booking.datetime_booking).toLocaleString('en-GB') : '-';
        const dateRet = booking.datetime_return ? new Date(booking.datetime_return).toLocaleString('en-GB') : '-';

        row.innerHTML = `
            <div class="col ps-3">${booking.vehicle.vehicle_name}<br><small>(${booking.vehicle.plate_number})</small></div>
            <div class="col">${userName}</div>
            <div class="col">${dateBook}</div>
            <div class="col">${dateRet}</div>
            <div class="col text-center">
                <button class="btn btn-sm btn-warning me-2 edit-btn" data-obj='${JSON.stringify(booking).replace(/'/g, "&apos;")}'>
                    <i class="bi bi-pencil"></i> Edit
                </button>
                <button class="btn btn-sm btn-danger delete-btn" data-id="${booking.id}">
                    <i class="bi bi-trash"></i> Delete
                </button>
            </div>
        `;
        tableBody.appendChild(row);
    });
}

// Event Delegation for Table Actions (Edit/Delete)
const tableBody = document.getElementById('vehicleBookingTableBody');
if (tableBody) {
    tableBody.addEventListener('click', (e) => {
        // Handle Delete
        const deleteBtn = e.target.closest('.delete-btn');
        if (deleteBtn) {
            const id = deleteBtn.dataset.id;
            showConfirm("Permanently delete this booking?", () => deleteVehicleBooking(id));
        }

        // Handle Edit
        const editBtn = e.target.closest('.edit-btn');
        if (editBtn) {
            const booking = JSON.parse(editBtn.dataset.obj);
            openUpdateVehicleBookingModal(booking);
        }
    });
}

// ==================== PAGINATION ====================

function updateBookingPaginationControls(meta) {
    bookingPaginationState = { ...bookingPaginationState, currentPage: meta.current_page, lastPage: meta.last_page };
    renderBookingPagination(meta.current_page, meta.last_page);
}

function renderBookingPagination(current, last) {
    const container = document.getElementById('vehicleBookingPagination');
    if (!container) return;

    let html = '';
    const prevDisabled = current <= 1 ? 'disabled' : '';
    html += `<li class="page-item ${prevDisabled}"><a class="page-link" href="#" data-page="${current - 1}">Previous</a></li>`;

    // Simple pagination logic (show all or limited range logic here)
    for (let i = 1; i <= last; i++) {
        if (i === 1 || i === last || (i >= current - 2 && i <= current + 2)) {
            html += `<li class="page-item ${i === current ? 'active' : ''}"><a class="page-link" href="#" data-page="${i}">${i}</a></li>`;
        } else if (html.slice(-4) !== '... ') {
            // Add ellipsis
        }
    }

    const nextDisabled = current >= last ? 'disabled' : '';
    html += `<li class="page-item ${nextDisabled}"><a class="page-link" href="#" data-page="${current + 1}">Next</a></li>`;

    container.innerHTML = html;

    container.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = parseInt(e.target.dataset.page);
            if (page && page !== current && page > 0 && page <= last) {
                getAllVehicleBookings({ ...bookingPaginationState, page });
            }
        });
    });
}

// ==================== GENERIC AUTOCOMPLETE HANDLER ====================

/**
 * Sets up autocomplete for any input/dropdown pair.
 * @param {string} inputId - ID of the input field
 * @param {string} dropdownId - ID of the UL dropdown
 * @param {Function} getData - Function returning array of data to filter
 * @param {Function} filterFn - (item, text) => boolean
 * @param {Function} displayFn - (item) => string (text to show in list)
 * @param {Function} onSelect - (item, inputElement) => void (action on click)
 */
function setupAutocomplete(inputId, dropdownId, getData, filterFn, displayFn, onSelect) {
    const input = document.getElementById(inputId);
    const dropdown = document.getElementById(dropdownId);

    if (!input || !dropdown) return;

    // Avoid attaching listeners multiple times
    if (input.dataset.autocompleteInitialized) return;
    input.dataset.autocompleteInitialized = "true";

    const renderList = () => {
        const filterText = input.value.toLowerCase();
        const data = getData();
        dropdown.innerHTML = "";

        const filtered = data.filter(item => filterFn(item, filterText));

        if (filtered.length === 0) {
            dropdown.innerHTML = `<li class="dropdown-item text-muted">No matches found</li>`;
        } else {
            filtered.forEach(item => {
                const li = document.createElement("li");
                li.classList.add("dropdown-item");
                li.textContent = displayFn(item);
                li.addEventListener("click", () => {
                    input.value = displayFn(item);
                    onSelect(item, input);
                    dropdown.classList.remove("show");
                });
                dropdown.appendChild(li);
            });
        }
        dropdown.classList.add("show");
    };

    input.addEventListener("focus", renderList);
    input.addEventListener("input", renderList);

    document.addEventListener("click", (e) => {
        if (!input.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.classList.remove("show");
        }
    });
}

// ==================== INITIALIZATION ====================

window.addEventListener('DOMContentLoaded', () => {
    // 1. Initial Data Fetch
    getAllVehicleBookings();
    fetchVehicle();
    fetchUserAndStaff();

    // 2. Setup Autocompletes (Create Modal)
    setupAutocomplete(
        "bookingVehicleInput", "vehicleDropdown",
        () => allVehicles,
        (v, text) => v.vehicle_name.toLowerCase().includes(text) || v.plate_number.toLowerCase().includes(text),
        (v) => `${v.vehicle_name} (${v.plate_number})`,
        (v, input) => { input.dataset.selectedId = v.id; }
    );

    setupAutocomplete(
        "usedBy", "usedByDropdown",
        () => allUsersAndStaff,
        (p, text) => p.fullname.toLowerCase().includes(text),
        (p) => p.displayLabel,
        (p, input) => {
            input.dataset.selectedUserId = p.user_id;
            input.dataset.selectedStaffId = p.staff_id;
        }
    );

    // 3. Setup Autocompletes (Update Modal)
    setupAutocomplete(
        "updateBookingVehicleInput", "updateVehicleDropdown",
        () => allVehicles,
        (v, text) => v.vehicle_name.toLowerCase().includes(text) || v.plate_number.toLowerCase().includes(text),
        (v) => `${v.vehicle_name} (${v.plate_number})`,
        (v, input) => { input.dataset.selectedId = v.id; }
    );

    setupAutocomplete(
        "updateUsedBy", "updateUsedByDropdown",
        () => allUsersAndStaff,
        (p, text) => p.fullname.toLowerCase().includes(text),
        (p) => p.displayLabel,
        (p, input) => {
            input.dataset.selectedUserId = p.user_id;
            input.dataset.selectedStaffId = p.staff_id;
        }
    );

    // 4. Search Listeners
    const searchInput = document.getElementById('vehicleBookingSearch');
    const sortInput = document.getElementById('vehicleBookingSortBy');

    if (searchInput && sortInput) {
        const runSearch = debounce(() => {
            getAllVehicleBookings({ search: searchInput.value, bookingFilter: sortInput.value, page: 1 });
        }, 300);

        searchInput.addEventListener('input', runSearch);
        sortInput.addEventListener('change', runSearch);
    }
});

// ==================== CRUD OPERATIONS ====================

// CREATE
const addBookingForm = document.getElementById("addVehicleBookingForm");
if (addBookingForm) {
    addBookingForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const btn = document.getElementById("createBookingBtn");
        const vInput = document.getElementById("bookingVehicleInput");
        const uInput = document.getElementById("usedBy");

        const payload = {
            vehicle_id: vInput.dataset.selectedId,
            user_id: uInput.dataset.selectedUserId !== "null" ? uInput.dataset.selectedUserId : null,
            staff_id: uInput.dataset.selectedStaffId !== "null" ? uInput.dataset.selectedStaffId : null,
            datetime_booking: document.getElementById("bookingDateInput").value,
            datetime_return: document.getElementById("returnDateInput").value || null
        };

        if (!payload.vehicle_id || (!payload.user_id && !payload.staff_id)) {
            showError("Select vehicle and user/staff.");
            return;
        }

        btn.disabled = true; btn.textContent = "Creating...";

        try {
            const res = await fetch("https://mwms.megacess.com/api/v1/vehicle-bookings", {
                method: "POST",
                headers: { "Authorization": `Bearer ${getToken()}`, "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            const result = await res.json();

            if (res.ok && result.success) {
                showSuccess("Success!", "Booking created!");
                bootstrap.Modal.getInstance(document.getElementById("addVehicleBookingModal")).hide();
                e.target.reset();
                // Clear datasets
                delete vInput.dataset.selectedId;
                delete uInput.dataset.selectedUserId;
                delete uInput.dataset.selectedStaffId;
                getAllVehicleBookings();
            } else {
                showError(result.message || "Failed.");
            }
        } catch (err) {
            console.error(err);
            showError("Error creating booking");
        } finally {
            btn.disabled = false;
            btn.textContent = "Create Booking";
        }
    });
}

// DELETE
async function deleteVehicleBooking(id) {
    showLoading();
    try {
        const res = await fetch(`https://mwms.megacess.com/api/v1/vehicle-bookings/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' }
        });
        const result = await res.json();

        if (res.ok && result.success) {
            showSuccess("Success!", "Deleted!");
            getAllVehicleBookings();
        } else {
            showError(result.message || "Delete failed");
        }
    } catch (err) {
        console.error(err);
        showError("Error deleting.");
    } finally {
        hideLoading();
    }
}

// UPDATE PREPARATION
function openUpdateVehicleBookingModal(booking) {
    const modal = new bootstrap.Modal(document.getElementById('updateVehicleBookingModal'));
    const vInput = document.getElementById('updateBookingVehicleInput');
    const uInput = document.getElementById('updateUsedBy');

    vInput.value = `${booking.vehicle.vehicle_name} (${booking.vehicle.plate_number})`;
    vInput.dataset.selectedId = booking.vehicle.id;

    if (booking.user) {
        uInput.value = `${booking.user.user_fullname} (${booking.user.id}) - user`;
        uInput.dataset.selectedUserId = booking.user.id;
        uInput.dataset.selectedStaffId = null;
    } else if (booking.staff) {
        uInput.value = `${booking.staff.staff_fullname} (${booking.staff.id}) - staff`;
        uInput.dataset.selectedStaffId = booking.staff.id;
        uInput.dataset.selectedUserId = null;
    }

    document.getElementById('updateBookingDateInput').value = formatForDateTimeLocal(booking.datetime_booking);
    document.getElementById('updateReturnDateInput').value = formatForDateTimeLocal(booking.datetime_return);
    document.getElementById('updateVehicleBookingForm').dataset.bookingId = booking.id;

    modal.show();
}

// UPDATE SUBMIT
const updateBookingForm = document.getElementById("updateVehicleBookingForm");
if (updateBookingForm) {
    updateBookingForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const bookingId = e.target.dataset.bookingId;
        const btn = document.getElementById("updateBookingBtn");
        const vInput = document.getElementById("updateBookingVehicleInput");
        const uInput = document.getElementById("updateUsedBy");

        const payload = {
            vehicle_id: vInput.dataset.selectedId,
            user_id: uInput.dataset.selectedUserId !== "null" ? uInput.dataset.selectedUserId : null,
            staff_id: uInput.dataset.selectedStaffId !== "null" ? uInput.dataset.selectedStaffId : null,
            datetime_booking: document.getElementById("updateBookingDateInput").value,
            datetime_return: document.getElementById("updateReturnDateInput").value || null
        };

        btn.disabled = true; btn.textContent = "Updating...";

        try {
            const res = await fetch(`https://mwms.megacess.com/api/v1/vehicle-bookings/${bookingId}`, {
                method: "PUT",
                headers: { "Authorization": `Bearer ${getToken()}`, "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            const result = await res.json();

            if (res.ok && result.success) {
                showSuccess("Success!", "Updated successfully!");
                bootstrap.Modal.getInstance(document.getElementById('updateVehicleBookingModal')).hide();
                getAllVehicleBookings();
            } else {
                showError(result.message || "Update failed.");
            }
        } catch (err) {
            console.error(err);
            showError("Error updating.");
        } finally {
            btn.disabled = false;
            btn.textContent = "Update";
        }
    });
}

// OPEN CREATE MODAL BTN
const openModalBtn = document.getElementById("openModalBtn");
if (openModalBtn) {
    openModalBtn.addEventListener("click", () => {
        new bootstrap.Modal(document.getElementById("addVehicleBookingModal")).show();
    });
}