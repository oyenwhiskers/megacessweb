// ==================== Fuel Usage Logic ====================

// Global State
let currentUsageSearch = '';
let currentUsageFilter = 'default';
let allUsageUsers = [];
let selectedUsageUser = null;     // For Add Modal
let editSelectedUsageUser = null; // For Edit Modal

// ==================== Fetch Fuel Usages ====================
async function getAllFuelUsages({ search = '', usageFilter = '', per_page = 15 } = {}) {
    const token = getToken();
    if (!token) return showErrorNoToken();

    // Build URL
    const apiUrl = new URL('https://mwms.megacess.com/api/v1/fuel-usages');
    if (search) apiUrl.searchParams.append('search', search);
    if (usageFilter && usageFilter !== 'default') apiUrl.searchParams.append('usageFilter', usageFilter);
    if (per_page) apiUrl.searchParams.append('per_page', per_page);

    const loading = document.getElementById('usageLoading');
    const tableBody = document.getElementById('fuelUsageTableBody');

    if (loading) loading.style.display = 'block';
    if (tableBody) tableBody.innerHTML = '';

    try {
        const res = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            }
        });
        const result = await res.json();

        if (loading) loading.style.display = 'none';

        if (res.ok && result.success) {
            if (result.data && result.data.length > 0) {
                populateFuelUsageTable(result.data);
            } else {
                if (tableBody) tableBody.innerHTML = `<div class="text-center text-muted py-3">No fuel usage records found</div>`;
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
        let badgeClass = 'bg-primary text-white';

        // Handle Long Description
        const fullDesc = usage.usage_description || '-';
        let descHtml = fullDesc;
        if (fullDesc.length > 30) {
            descHtml = `
                ${fullDesc.substring(0, 30)}...
                <a href="javascript:void(0)" class="text-decoration-none small view-desc-btn" data-desc="${encodeURIComponent(fullDesc)}">Read More</a>
            `;
        }

        row.innerHTML = `
            <div class="col">
                <span class="badge ${badgeClass} px-3 py-2 fs-6">${usage.usage_quantity || 0} Liters</span>
            </div>
            <div class="col">${usage.user ? usage.user.user_fullname : (usage.used_by_name || '-')}</div>
            <div class="col">
                ${usage.usage_date ? new Date(usage.usage_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
            </div>
            <div class="col">
                ${descHtml}
            </div>
            <div class="col text-center">
                <button class="btn btn-sm btn-outline-primary me-2 update-usage-btn"
                data-id="${usage.id}"
                data-quantity="${usage.usage_quantity || ''}"
                data-user-id="${usage.user ? usage.user.id : ''}"
                data-user-name="${usage.user ? usage.user.user_fullname : ''}"
                data-date="${usage.usage_date ? new Date(usage.usage_date).toISOString().split('T')[0] : ''}"
                data-description="${usage.usage_description || ''}"
                >
                <i class="bi bi-pencil me-1"></i> Edit
                </button>
                <button class="btn btn-sm btn-outline-danger delete-usage-btn" data-id="${usage.id}">
                <i class="bi bi-trash me-1"></i> Delete
                </button>
            </div>
        `;

        tableBody.appendChild(row);
    });

    attachUsageEditListeners();
    attachUsageDeleteListeners();
    attachDescriptionViewListeners();
}

// ==================== Create Usage ====================
async function createFuelUsage(payload) {
    const token = getToken();
    if (!token) return showErrorNoToken();

    try {
        const res = await fetch('https://mwms.megacess.com/api/v1/fuel-usages', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        const result = await res.json();

        if (res.ok && result.success) {
            showSuccess("Success!", "Fuel usage recorded successfully!");
            return true;
        } else {
            showError(result.message || "Failed to add fuel usage.");
            return false;
        }
    } catch (err) {
        console.error(err);
        showError("Failed to add fuel usage. Try again.");
        return false;
    }
}

// ==================== Update Usage ====================
async function updateFuelUsage(id, payload) {
    const token = getToken();
    if (!token) return showErrorNoToken();

    try {
        const res = await fetch(`https://mwms.megacess.com/api/v1/fuel-usages/${id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        const result = await res.json();

        if (res.ok && result.success) {
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
    const token = getToken();
    if (!token) return showErrorNoToken();

    showConfirm('Are you sure you want to delete this usage record?', async () => {
        showLoading();
        try {
            const res = await fetch(`https://mwms.megacess.com/api/v1/fuel-usages/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });
            const result = await res.json();

            if (res.ok && result.success) {
                showSuccess("Success!", result.message || "Deleted successfully");
                getAllFuelUsages({ search: currentUsageSearch, usageFilter: currentUsageFilter });
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
        if (!selectedUsageUser) return showError("Please select a user.");
        if (!date) return showError("Please select a date.");

        const payload = {
            usage_quantity: quantity,
            user_id: selectedUsageUser.id,
            usage_date: date,
            usage_description: description
        };

        const saveBtn = addUsageForm.querySelector('button[type="submit"]');
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
        if (!editSelectedUsageUser) return showError("Please select a user.");
        if (!date) return showError("Please select a date.");

        const payload = {
            usage_quantity: quantity,
            user_id: editSelectedUsageUser.id,
            usage_date: date,
            usage_description: description
        };

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
            const userName = btn.dataset.userName;
            const date = btn.dataset.date;
            const description = btn.dataset.description;

            document.getElementById('editUsageId').value = id;
            document.getElementById('editUsageQuantity').value = quantity;
            document.getElementById('editUsageDate').value = date;
            document.getElementById('editUsageDescription').value = description;

            // Set User
            const userInput = document.getElementById('editUsedBy');
            if (userId && userName) {
                editSelectedUsageUser = { id: userId, fullname: userName };
                userInput.value = userName;
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

// ==================== User Dropdown Logic ====================
async function fetchAllUsers() {
    const token = getToken();
    if (!token) return [];
    try {
        const res = await fetch('https://mwms.megacess.com/api/v1/users', {
            headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
        });
        const data = await res.json();
        return data?.data?.map(u => ({ id: u.id, fullname: u.user_fullname })) || [];
    } catch (err) {
        console.error(err);
        return [];
    }
}

function initUserDropdown(inputEl, dropdownEl, onSelect) {
    if (!inputEl || !dropdownEl) return;

    function showDropdown(list) {
        dropdownEl.innerHTML = '';
        if (!list.length) {
            const li = document.createElement('li');
            li.classList.add('dropdown-item', 'text-muted');
            li.textContent = "No results found";
            dropdownEl.appendChild(li);
            dropdownEl.style.display = 'block';
            return;
        }
        list.forEach(user => {
            const li = document.createElement('li');
            li.classList.add('dropdown-item');
            li.style.cursor = 'pointer';
            li.innerHTML = `${user.fullname} <small class="text-muted">(${user.id})</small>`;
            li.addEventListener('click', () => {
                inputEl.value = user.fullname;
                dropdownEl.style.display = 'none';
                onSelect(user);
            });
            dropdownEl.appendChild(li);
        });
        dropdownEl.style.display = 'block';
    }

    inputEl.addEventListener('focus', async () => {
        if (allUsageUsers.length === 0) allUsageUsers = await fetchAllUsers();
        showDropdown(allUsageUsers);
    });

    inputEl.addEventListener('input', () => {
        const search = inputEl.value.toLowerCase();
        const filtered = allUsageUsers.filter(u => u.fullname.toLowerCase().includes(search));
        showDropdown(filtered);
    });

    document.addEventListener('click', (e) => {
        if (!inputEl.contains(e.target) && !dropdownEl.contains(e.target)) {
            dropdownEl.style.display = 'none';
        }
    });
}

// ==================== Initialize Page ====================
document.addEventListener('DOMContentLoaded', () => {
    // Add Modal Dropdown
    const addInput = document.getElementById('usedBy');
    const addDropdown = document.getElementById('addUsageUserDropdown');
    initUserDropdown(addInput, addDropdown, (user) => { selectedUsageUser = user; });

    // Edit Modal Dropdown
    const editInput = document.getElementById('editUsedBy');
    const editDropdown = document.getElementById('editUsageUserDropdown');
    initUserDropdown(editInput, editDropdown, (user) => { editSelectedUsageUser = user; });

    // Tab Listener
    $('.tab-btn[data-target="usage"]').on('click', () => {
        getAllFuelUsages();
    });
});
