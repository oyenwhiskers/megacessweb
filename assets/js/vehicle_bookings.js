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
    try {
        let allData = [];
        let page = 1;
        let lastPage = 1;

        const availabilityFilter = 'status=Available';

        do {
            const result = await apiFetch(`/vehicles?${availabilityFilter}&page=${page}`);
            if (result.success) {
                const pageData = Array.isArray(result.data) ? result.data : (result.data.data || []);
                allData = allData.concat(pageData);
                lastPage = result.meta ? result.meta.last_page : (result.data.last_page || 1);
                page++;
            } else {
                throw new Error(result.message);
            }
        } while (page <= lastPage);

        allVehicles = allData.map(v => ({
            ...v,
            name: `${v.vehicle_name} (${v.plate_number})`
        }));

        console.log("🔧 Available Vehicles loaded:", allVehicles.length);

    } catch (error) {
        console.error("Error fetching available vehicles:", error);
    }
}

async function fetchUserAndStaff() {
    try {
        const result = await apiFetch("/users-and-staff");
        if (result.success) {
            allUsersAndStaff = result.data.map(item => ({
                user_id: item.user_id || null,
                staff_id: item.staff_id || null,
                fullname: item.fullname,
                role: item.role,
                displayLabel: `${item.fullname} - ${item.role}`
            }));
            console.log("🔧 Users/Staff loaded:", allUsersAndStaff.length);
        } else {
            throw new Error(result.message);
        }

    } catch (error) {
        console.error("Error fetching users:", error);
    }
}

// ==================== MAIN TABLE LOGIC ====================

async function getAllVehicleBookings({ search = '', bookingFilter = '', page = 1, per_page = 10 } = {}) {
    const loading = document.getElementById('loadingBooking');
    const tableBody = document.getElementById('vehicleBookingTableBody');
    if (loading) loading.style.display = 'block';
    if (tableBody) tableBody.innerHTML = '';

    try {
        const params = new URLSearchParams();
        if (search) params.append('search', search);
        if (bookingFilter) params.append('bookingFilter', bookingFilter);
        params.append('page', page);
        params.append('per_page', per_page);

        const result = await apiFetch(`/vehicle-bookings?${params.toString()}`);

        if (loading) loading.style.display = 'none';

        if (result.success) {
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
        console.error(error);
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

// ==================== CRUD OPERATIONS ====================

// DELETE
async function deleteVehicleBooking(id) {
    showLoading();
    try {
        const result = await apiFetch(`/vehicle-bookings/${id}`, {
            method: 'DELETE'
        });

        if (result.success) {
            showSuccess("Success!", "Deleted!");
            if (typeof refreshVehicleSummary === 'function') refreshVehicleSummary();
            getAllVehicleBookings();
        } else {
            showError(result.message || "Delete failed");
        }
    } catch (err) {
        console.error(err);
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

// ==================== INITIALIZATION ====================

window.addEventListener('DOMContentLoaded', () => {
    // 1. Initial Data Fetch
    getAllVehicleBookings();
    fetchVehicle();
    fetchUserAndStaff();

    // 2. Setup Autocompletes (Create Modal)
    initSearchableDropdown(
        document.getElementById("bookingVehicleInput"),
        document.getElementById("vehicleDropdown"),
        async () => allVehicles,
        (v) => { document.getElementById("bookingVehicleInput").dataset.selectedId = v.id; },
        (v) => `${v.vehicle_name} (${v.plate_number})`,
        (v, text) => v.vehicle_name.toLowerCase().includes(text) || v.plate_number.toLowerCase().includes(text)
    );

    initSearchableDropdown(
        document.getElementById("usedBy"),
        document.getElementById("usedByDropdown"),
        async () => allUsersAndStaff,
        (p) => {
            const input = document.getElementById("usedBy");
            input.dataset.selectedUserId = p.user_id;
            input.dataset.selectedStaffId = p.staff_id;
        },
        (p) => p.displayLabel,
        (p, text) => p.fullname.toLowerCase().includes(text)
    );

    // 3. Setup Autocompletes (Update Modal)
    initSearchableDropdown(
        document.getElementById("updateBookingVehicleInput"),
        document.getElementById("updateVehicleDropdown"),
        async () => allVehicles,
        (v) => { document.getElementById("updateBookingVehicleInput").dataset.selectedId = v.id; },
        (v) => `${v.vehicle_name} (${v.plate_number})`,
        (v, text) => v.vehicle_name.toLowerCase().includes(text) || v.plate_number.toLowerCase().includes(text)
    );

    initSearchableDropdown(
        document.getElementById("updateUsedBy"),
        document.getElementById("updateUsedByDropdown"),
        async () => allUsersAndStaff,
        (p) => {
            const input = document.getElementById("updateUsedBy");
            input.dataset.selectedUserId = p.user_id;
            input.dataset.selectedStaffId = p.staff_id;
        },
        (p) => p.displayLabel,
        (p, text) => p.fullname.toLowerCase().includes(text)
    );

    // 4. Search Listeners
    const searchInput = document.getElementById('vehicleBookingSearch');
    const sortInput = document.getElementById('vehicleBookingSortBy');

    if (searchInput && sortInput) {
        const runSearch = debounce(() => {
            getAllVehicleBookings({ search: searchInput.value, bookingFilter: sortInput.value, page: 1 });
        }, 100);

        searchInput.addEventListener('input', runSearch);
        sortInput.addEventListener('change', runSearch);
    }

    // 5. Refresh Button Listener
    const refreshBtn = document.getElementById('refreshVehicleBookingBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            const sortInput = document.getElementById('vehicleBookingSortBy');
            if (sortInput) sortInput.value = "";

            getAllVehicleBookings({
                search: bookingPaginationState.search,
                bookingFilter: "",
                page: bookingPaginationState.currentPage,
                per_page: bookingPaginationState.perPage
            });
        });
    }

    // 6. Form Listeners
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
                const result = await apiFetch("/vehicle-bookings", {
                    method: "POST",
                    body: JSON.stringify(payload)
                });

                if (result.success) {
                    showSuccess("Success!", "Booking created!");
                    bootstrap.Modal.getInstance(document.getElementById("addVehicleBookingModal")).hide();
                    e.target.reset();
                    // Clear datasets
                    delete vInput.dataset.selectedId;
                    delete uInput.dataset.selectedUserId;
                    delete uInput.dataset.selectedStaffId;
                    getAllVehicleBookings();
                    if (typeof refreshVehicleSummary === 'function') refreshVehicleSummary();
                } else {
                    showError(result.message || "Failed.");
                }
            } catch (err) {
                console.error(err);
            } finally {
                btn.disabled = false;
                btn.textContent = "Create Booking";
            }
        });
    }

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
                const result = await apiFetch(`/vehicle-bookings/${bookingId}`, {
                    method: "PUT",
                    body: JSON.stringify(payload)
                });

                if (result.success) {
                    showSuccess("Success!", "Updated successfully!");
                    bootstrap.Modal.getInstance(document.getElementById('updateVehicleBookingModal')).hide();
                    if (typeof refreshVehicleSummary === 'function') refreshVehicleSummary();
                    getAllVehicleBookings();
                } else {
                    showError(result.message || "Update failed.");
                }
            } catch (err) {
                console.error(err);
            } finally {
                btn.disabled = false;
                btn.textContent = "Update";
            }
        });
    }

    const openModalBtn = document.getElementById("openModalBtn");
    if (openModalBtn) {
        openModalBtn.addEventListener("click", () => {
            new bootstrap.Modal(document.getElementById("addVehicleBookingModal")).show();
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
});