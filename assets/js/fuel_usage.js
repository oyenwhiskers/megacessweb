// ==================== Fuel Usage Logic ====================

// Global State
let currentUsageSearch = '';
let currentUsageFilter = 'default';
let selectedUsageUser = null;     // For Add Modal
let editSelectedUsageUser = null; // For Edit Modal

// ==================== Fetch Fuel Usages ====================
async function getAllFuelUsages({ search = '', usageFilter = '', page = 1, per_page = 10 } = {}) {
    const loading = document.getElementById('usageLoading');
    const tableBody = document.getElementById('fuelUsageTableBody');
    const paginationEl = document.getElementById('fuelUsagePagination');

    if (loading) loading.style.display = 'block';
    if (tableBody) tableBody.innerHTML = '';

    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (usageFilter && usageFilter !== 'default') params.append('usageFilter', usageFilter);
    params.append('page', page);
    params.append('per_page', per_page);

    try {
        const result = await apiFetch(`/fuel-usages?${params.toString()}`, { method: 'GET' });

        if (loading) loading.style.display = 'none';

        if (result.success) {
            let data = [];
            let meta = {};

            // Option A: Root Meta (User's confirmed structure)
            if (result.meta) {
                data = result.data;
                meta = result.meta;
            }
            // Option C: Laravel Default (Nested in data)
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
                    total: total
                };
            }

            if (data && data.length > 0) {
                populateFuelUsageTable(data);
                renderFuelUsagePagination(meta, search, usageFilter);
            } else {
                if (tableBody) tableBody.innerHTML = `<div class="text-center text-muted py-3">No fuel usage records found</div>`;
                if (paginationEl) paginationEl.innerHTML = '';
            }
        } else {
            if (tableBody) tableBody.innerHTML = `<div class="text-center text-danger py-3">Error: ${result.message || 'Unknown error'}</div>`;
            showError(result.message);
        }
    } catch (err) {
        if (loading) loading.style.display = 'none';
        if (tableBody) tableBody.innerHTML = `<div class="text-center text-danger py-3">Failed to load fuel usages</div>`;
        console.error(err);
        showError('Failed to load fuel usages. Please try again.');
    }
}

// ==================== Populate Usage Table ====================
function populateFuelUsageTable(usages) {
    const tableBody = document.getElementById('fuelUsageTableBody');
    if (!tableBody) return;
    tableBody.innerHTML = '';

    usages.forEach(usage => {
        const row = document.createElement('div');
        row.className = 'content-row d-flex border-bottom py-2 align-items-center';

        // Usage Quantity Badge Color
        let badgeClass = 'bg-warning text-black';

        // Handle Long Description
        const fullDesc = usage.usage_description || '-';
        let descHtml = fullDesc;
        if (fullDesc.length > 30) {
            descHtml = `
                ${fullDesc.substring(0, 30)}...
                <a href="javascript:void(0)" class="text-decoration-none small view-desc-btn" data-desc="${encodeURIComponent(fullDesc)}">Read More</a>
            `;
        }

        // Determine Assigned Person Name and IDs
        let assignedName = usage.used_by_name || '-';
        let userId = '';
        let staffId = '';
        let rawName = '';

        if (usage.user) {
            rawName = usage.user.user_fullname;
            assignedName = `${rawName} (User)`;
            userId = usage.user.id || usage.user.user_id;
        } else if (usage.staff) {
            rawName = usage.staff.staff_fullname;
            assignedName = `${rawName} (Staff)`;
            staffId = usage.staff.id || usage.staff.staff_id;
        }

        row.innerHTML = `
            <div class="col">
                <span class="badge ${badgeClass} px-3 py-2 fs-6">${usage.usage_quantity || 0} Liters</span>
            </div>
            <div class="col">${assignedName}</div>
            <div class="col">
                ${formatDateDisplay(usage.usage_date)}
            </div>
            <div class="col">
                ${descHtml}
            </div>
            <div class="col text-center">
                <button class="btn btn-sm btn-warning me-2 update-usage-btn"
                data-id="${usage.id}"
                data-quantity="${usage.usage_quantity || ''}"
                data-user-id="${userId}"
                data-staff-id="${staffId}"
                data-name="${rawName}"
                data-date="${usage.usage_date ? new Date(usage.usage_date).toISOString().split('T')[0] : ''}"
                data-description="${usage.usage_description || ''}"
                >
                <i class="bi bi-pencil"></i> Edit
                </button>
                <button class="btn btn-sm btn-danger delete-usage-btn" data-id="${usage.id}">
                <i class="bi bi-trash"></i> Delete
                </button>
            </div>
        `;

        tableBody.appendChild(row);
    });

    attachUsageEditListeners();
    attachUsageDeleteListeners();
    attachDescriptionViewListeners();
}

// ==================== Render Pagination ====================
function renderFuelUsagePagination(meta, search, filter) {
    const container = document.getElementById('fuelUsagePagination');
    if (!container) return;
    container.innerHTML = '';

    if (!meta || !meta.last_page) return; // Allow single page to show if needed, but usually we hide if 0 pages

    const current = meta.current_page || 1;
    const last = meta.last_page || 1;

    // Always show pagination even if 1 page (as per user preference in other modules)

    const createPageItem = (page, text, isActive = false, isDisabled = false) => {
        const li = document.createElement('li');
        li.className = `page-item ${isActive ? 'active' : ''} ${isDisabled ? 'disabled' : ''}`;
        li.innerHTML = `<a class="page-link" href="#">${text}</a>`;
        if (!isDisabled && !isActive) {
            li.addEventListener('click', (e) => {
                e.preventDefault();
                getAllFuelUsages({ search, usageFilter: filter, page: page });
            });
        }
        return li;
    };

    // Previous
    container.appendChild(createPageItem(current - 1, 'Previous', false, current <= 1));

    // Page Numbers
    let pages = [];
    if (last <= 7) {
        pages = Array.from({ length: last }, (_, i) => i + 1);
    } else {
        if (current <= 4) {
            pages = [1, 2, 3, 4, 5, '...', last];
        } else if (current >= last - 3) {
            pages = [1, '...', last - 4, last - 3, last - 2, last - 1, last];
        } else {
            pages = [1, '...', current - 1, current, current + 1, '...', last];
        }
    }

    pages.forEach(p => {
        if (p === '...') {
            container.appendChild(createPageItem(null, '...', false, true));
        } else {
            container.appendChild(createPageItem(p, p, p === current));
        }
    });

    // Next
    container.appendChild(createPageItem(current + 1, 'Next', false, current >= last));
}

// ==================== Create Usage ====================
async function createFuelUsage(payload) {
    try {
        const result = await apiFetch('/fuel-usages', { method: 'POST', body: JSON.stringify(payload) });

        if (result.success) {
            showSuccess("Success!", "Fuel usage recorded successfully!");
            return true;
        } else {
            showError(result.message || "Failed to add fuel usage.");
            return false;
        }
    } catch (err) {
        console.error(err);
        showError(err.message || "Failed to add fuel usage.");
        return false;
    }
}

// ==================== Update Usage ====================
async function updateFuelUsage(id, payload) {
    try {
        const result = await apiFetch(`/fuel-usages/${id}`, { method: 'PUT', body: JSON.stringify(payload) });

        if (result.success) {
            showSuccess("Success!", "Fuel usage updated successfully!");
            return true;
        } else {
            showError(result.message || "Failed to update fuel usage.");
            return false;
        }
    } catch (err) {
        console.error(err);
        showError("Failed to update fuel usage. Try again.");
        return false;
    }
}

// ==================== Delete Usage ====================
async function deleteFuelUsage(id) {
    showConfirm('Are you sure you want to delete this usage record?', async () => {
        showLoading();
        try {
            const result = await apiFetch(`/fuel-usages/${id}`, { method: 'DELETE' });

            if (result.success) {
                showSuccess("Success!", result.message || "Deleted successfully");
                getAllFuelUsages({ search: currentUsageSearch, usageFilter: currentUsageFilter });
                if (window.refreshFuelSummary) window.refreshFuelSummary();
            } else {
                showError(result.message || "Failed to delete usage.");
            }
        } catch (err) {
            console.error(err);
            showError("Failed to delete usage. Try again.");
        } finally {
            hideLoading();
        }
    });
}

// ==================== Form Handlers ====================

// Add Usage Form
const addUsageForm = document.getElementById('addUsageForm');
if (addUsageForm) {
    addUsageForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const quantity = document.getElementById('usageQuantity').value.trim();
        const date = document.getElementById('usageDate').value;
        const description = document.getElementById('usageDescription').value.trim();

        // Validate
        if (!quantity) return showError("Please enter usage quantity.");
        if (!selectedUsageUser) return showError("Please select a user or staff.");
        if (!date) return showError("Please select a date.");

        const payload = {
            usage_quantity: quantity,
            usage_date: date,
            usage_description: description
        };

        if (selectedUsageUser.user_id) {
            payload.user_id = selectedUsageUser.user_id;
        } else if (selectedUsageUser.staff_id) {
            payload.staff_id = selectedUsageUser.staff_id;
        }

        const saveBtn = document.getElementById('saveUsageBtn');
        const originalText = saveBtn.textContent;
        saveBtn.disabled = true;
        saveBtn.textContent = "Saving...";

        const success = await createFuelUsage(payload);

        saveBtn.disabled = false;
        saveBtn.textContent = originalText;

        if (success) {
            bootstrap.Modal.getInstance(document.getElementById('addUsageModal')).hide();
            addUsageForm.reset();
            selectedUsageUser = null;
            document.getElementById('usedBy').value = '';
            getAllFuelUsages();
            if (window.refreshFuelSummary) window.refreshFuelSummary();
        }
    });
}

// Edit Usage Form
const editUsageForm = document.getElementById('editUsageForm');
if (editUsageForm) {
    editUsageForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const id = document.getElementById('editUsageId').value;
        const quantity = document.getElementById('editUsageQuantity').value.trim();
        const date = document.getElementById('editUsageDate').value;
        const description = document.getElementById('editUsageDescription').value.trim();

        if (!id) return showError("Invalid usage ID.");
        if (!quantity) return showError("Please enter usage quantity.");
        if (!editSelectedUsageUser) return showError("Please select a user or staff.");
        if (!date) return showError("Please select a date.");

        const payload = {
            usage_quantity: quantity,
            usage_date: date,
            usage_description: description
        };

        if (editSelectedUsageUser.user_id) {
            payload.user_id = editSelectedUsageUser.user_id;
        } else if (editSelectedUsageUser.staff_id) {
            payload.staff_id = editSelectedUsageUser.staff_id;
        }

        const saveBtn = document.getElementById('saveEditUsageBtn');
        const originalText = saveBtn.textContent;
        saveBtn.disabled = true;
        saveBtn.textContent = "Updating...";

        const success = await updateFuelUsage(id, payload);

        saveBtn.disabled = false;
        saveBtn.textContent = originalText;

        if (success) {
            bootstrap.Modal.getInstance(document.getElementById('editUsageModal')).hide();
            getAllFuelUsages({ search: currentUsageSearch, usageFilter: currentUsageFilter });
            if (window.refreshFuelSummary) window.refreshFuelSummary();
        }
    });
}

// ==================== Attach Listeners ====================
function attachUsageEditListeners() {
    document.querySelectorAll('.update-usage-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.dataset.id;
            const quantity = btn.dataset.quantity;
            const userId = btn.dataset.userId;
            const staffId = btn.dataset.staffId;
            const name = btn.dataset.name;
            const date = btn.dataset.date;
            const description = btn.dataset.description;

            document.getElementById('editUsageId').value = id;
            document.getElementById('editUsageQuantity').value = quantity;
            document.getElementById('editUsageDate').value = date;
            document.getElementById('editUsageDescription').value = description;

            // Set User/Staff
            const userInput = document.getElementById('editUsedBy');
            if (userId || staffId) {
                editSelectedUsageUser = {
                    user_id: userId || null,
                    staff_id: staffId || null,
                    fullname: name,
                    role: userId ? 'user' : 'staff'
                };
                userInput.value = name;
            } else {
                editSelectedUsageUser = null;
                userInput.value = '';
            }

            bootstrap.Modal.getOrCreateInstance(document.getElementById('editUsageModal')).show();
        });
    });
}

function attachUsageDeleteListeners() {
    document.querySelectorAll('.delete-usage-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            deleteFuelUsage(id);
        });
    });
}

function attachDescriptionViewListeners() {
    document.querySelectorAll('.view-desc-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const desc = decodeURIComponent(btn.dataset.desc);
            Swal.fire({
                title: 'Usage Description',
                text: desc,
                icon: 'info',
                confirmButtonText: 'Close',
                customClass: {
                    confirmButton: 'btn btn-primary'
                }
            });
        });
    });
}

// ==================== Search & Filter ====================
const usageSearchInput = document.getElementById('usageSearch');
const usageFilterSelect = document.getElementById('usageFilter');

if (usageSearchInput) {
    usageSearchInput.addEventListener('input', debounce(() => {
        currentUsageSearch = usageSearchInput.value.trim();
        getAllFuelUsages({ search: currentUsageSearch, usageFilter: currentUsageFilter });
    }, 300));
}

if (usageFilterSelect) {
    usageFilterSelect.addEventListener('change', () => {
        currentUsageFilter = usageFilterSelect.value;
        getAllFuelUsages({ search: currentUsageSearch, usageFilter: currentUsageFilter });
    });
}

const refreshUsageBtn = document.getElementById('refreshUsageBtn');
if (refreshUsageBtn) {
    refreshUsageBtn.addEventListener('click', () => {
        if (usageSearchInput) usageSearchInput.value = '';
        if (usageFilterSelect) usageFilterSelect.value = 'default';
        currentUsageSearch = '';
        currentUsageFilter = 'default';
        getAllFuelUsages();
    });
}

// ==================== User and Staff Dropdown Logic ====================
async function fetchAllUsersAndStaff() {
    try {
        const result = await apiFetch('/users-and-staff', { method: 'GET' });
        return result?.data?.map(u => ({
            id: u.role === 'user' ? `user-${u.user_id}` : `staff-${u.staff_id}`, // Unique ID for keying
            user_id: u.role === 'user' ? u.user_id : null,
            staff_id: u.role === 'staff' ? u.staff_id : null,
            fullname: u.fullname,
            role: u.role
        })) || [];
    } catch (err) {
        console.error(err);
        return [];
    }
}

// ==================== Initialize Page ====================
document.addEventListener('DOMContentLoaded', () => {
    const renderUsageUser = (u) => `${u.fullname} <small class="text-muted">(${u.role})</small>`;
    const filterUsageUser = (u, s) => u.fullname.toLowerCase().includes(s);

    // Add Modal Dropdown
    const addInput = document.getElementById('usedBy');
    const addDropdown = document.getElementById('addUsageUserDropdown');
    initSearchableDropdown(addInput, addDropdown, fetchAllUsersAndStaff, (user) => { selectedUsageUser = user; }, renderUsageUser, filterUsageUser);

    // Edit Modal Dropdown
    const editInput = document.getElementById('editUsedBy');
    const editDropdown = document.getElementById('editUsageUserDropdown');
    initSearchableDropdown(editInput, editDropdown, fetchAllUsersAndStaff, (user) => { editSelectedUsageUser = user; }, renderUsageUser, filterUsageUser);

    // Tab Listener
    $('.tab-btn[data-target="usage"]').on('click', () => {
        getAllFuelUsages();
    });
});
