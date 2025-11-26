// ==================== Fetch Fuels ====================
async function getAllFuels({ search = '', fuel_filter = '', page = 1, per_page = 10 } = {}) {
  const loading = document.getElementById('loading');
  const tableBody = document.getElementById('fuelsTableBody');
  const paginationEl = document.getElementById('fuelsPagination');

  if (loading) loading.style.display = 'block';
  if (tableBody) tableBody.innerHTML = '';

  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (fuel_filter && fuel_filter !== 'default') params.append('fuelFilter', fuel_filter);
  params.append('page', page);
  params.append('per_page', per_page);

  try {
    const result = await apiFetch(`/fuels?${params.toString()}`, { method: 'GET' });

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
        populateFuelsTable(data);
        renderFuelPagination(meta, search, fuel_filter);
      } else {
        tableBody.innerHTML = `<div class="text-center text-muted py-3">No fuels found</div>`;
        if (paginationEl) paginationEl.innerHTML = '';
      }
    } else {
      tableBody.innerHTML = `<div class="text-center text-danger py-3">Error: ${result.message || 'Unknown error'}</div>`;
      showError(result.message);
    }
  } catch (err) {
    if (loading) loading.style.display = 'none';
    tableBody.innerHTML = `<div class="text-center text-danger py-3">Failed to load fuels</div>`;
    showError('Failed to load fuels. Please try again.');
    console.error(err);
  }
}

// ==================== Populate Fuels Table ====================
function populateFuelsTable(fuels) {
  const tableBody = document.getElementById('fuelsTableBody');
  tableBody.innerHTML = '';

  fuels.forEach(fuel => {
    const row = document.createElement('div');
    row.className = 'content-row d-flex border-bottom py-2 align-items-center';

    let fuelClass = 'bg-primary text-white'; // customize based on fuel amount if needed

    row.innerHTML = `
      <div class="col">${fuel.supplier_name || 'Unnamed Fuel'}</div>
      <div class="col">${fuel.user.user_fullname || '-'}</div> 
      <div class="col">
        <span class="badge ${fuelClass} px-3 py-2 fs-6">${fuel.fuel_bought || 'Unknown'}</span>
      </div>
      <div class="col">
        ${formatDateDisplay(fuel.date_bought)}
      </div>
      <div class="col text-center">
        <button class="btn btn-sm btn-primary me-2 update-fuel-btn"
          data-id="${fuel.id}"
          data-supplier-name="${fuel.supplier_name || ''}"
          data-buyer-id="${fuel.user?.id || ''}"
          data-buyer-name="${fuel.user?.user_fullname || ''}"
          data-fuel-bought="${fuel.fuel_bought || ''}"
          data-date-bought="${fuel.date_bought ? new Date(fuel.date_bought).toISOString().split('T')[0] : ''}"
          data-bs-toggle="modal" 
          data-bs-target="#editFuelModal">
          <i class="bi bi-pencil"></i> Edit
        </button>
        <button class="btn btn-sm btn-danger delete-fuel-btn" data-id="${fuel.id}">
          <i class="bi bi-trash"></i> Delete
        </button>
      </div>
    `;

    tableBody.appendChild(row);
  });

  attachDeleteListeners();
}

// ==================== Render Pagination ====================
function renderFuelPagination(meta, search, filter) {
  const container = document.getElementById('fuelsPagination');
  if (!container) return;
  container.innerHTML = '';

  if (!meta || !meta.last_page || meta.last_page <= 1) return;

  const current = meta.current_page;
  const last = meta.last_page;

  const createPageItem = (page, text, isActive = false, isDisabled = false) => {
    const li = document.createElement('li');
    li.className = `page-item ${isActive ? 'active' : ''} ${isDisabled ? 'disabled' : ''}`;
    li.innerHTML = `<a class="page-link" href="#">${text}</a>`;
    if (!isDisabled && !isActive) {
      li.addEventListener('click', (e) => {
        e.preventDefault();
        getAllFuels({ search, fuel_filter: filter, page: page });
      });
    }
    return li;
  };

  // Previous
  container.appendChild(createPageItem(current - 1, 'Previous', false, current === 1));

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
  container.appendChild(createPageItem(current + 1, 'Next', false, current === last));
}

// ==================== Create / Add Fuel ====================
async function createFuelRecord(payload) {
  try {
    const result = await apiFetch('/fuels', { method: 'POST', body: JSON.stringify(payload) });
    result.success ? showSuccess("Fuel record added successfully!") : showError(result.message || "Failed to add fuel record.");
  } catch (err) {
    console.error(err);
    showError("Failed to add fuel record. Try again.");
  }
}

// ==================== Update Fuel ====================
async function updateFuelRecord(fuelId, payload) {
  if (!fuelId) { console.error("Fuel ID is required"); return false; }

  try {
    const result = await apiFetch(`/fuels/${fuelId}`, { method: 'PUT', body: JSON.stringify(payload) });
    if (result.success) { getAllFuels(); return true; }
    showError(result.message || 'Failed to update fuel');
    return false;
  } catch (err) {
    console.error(err);
    showError('Failed to update fuel. Please try again.');
    return false;
  }
}

// ==================== Delete Fuel ====================
function attachDeleteListeners() {
  document.querySelectorAll('.delete-fuel-btn').forEach(btn => {
    btn.removeEventListener('click', handleDelete);
    btn.addEventListener('click', handleDelete);
  });
}

async function handleDelete(e) {
  e.preventDefault();
  const fuelId = e.currentTarget.dataset.id;

  showConfirm('You want to delete this fuel?', async () => {
    showLoading();
    try {
      const result = await apiFetch(`/fuels/${fuelId}`, { method: 'DELETE' });
      if (result.success) { showSuccess(result.message); getAllFuels(); }
      else showError(result.message);
    } catch (err) {
      console.error(err);
      showError('Failed to delete fuel. Please try again.');
    } finally { hideLoading(); }
  });
}

// ==================== Fetch Buyers ====================
async function getAllBuyers() {
  try {
    const result = await apiFetch('/users', { method: 'GET' });
    return result?.data?.map(u => ({ id: u.id, fullname: u.user_fullname, role: u.user_role, account_type: 'user' })) || [];
  } catch (err) {
    console.error(err); showError("Failed to load buyers."); return [];
  }
}

// ==================== Generic Buyer Dropdown ====================
let selectedBuyer = null;
const buyerInput = document.getElementById('assignedPerson');
const buyerDropdownEl = document.getElementById('buyerDropdown');

const renderBuyer = (p) => `${p.fullname}<small class="text-muted d-inline"> - (${p.role})</small>`;
const filterBuyer = (p, s) => p.fullname.toLowerCase().includes(s) || String(p.id).includes(s);

if (buyerInput && buyerDropdownEl) {
  initSearchableDropdown(buyerInput, buyerDropdownEl, getAllBuyers, (sel) => selectedBuyer = sel, renderBuyer, filterBuyer);
}

const editBuyerInput = document.getElementById('editAssignedPerson');
const editBuyerDropdownEl = document.getElementById('editBuyerDropdown');
let editSelectedBuyer = null;

if (editBuyerInput && editBuyerDropdownEl) {
  initSearchableDropdown(editBuyerInput, editBuyerDropdownEl, getAllBuyers, (sel) => editSelectedBuyer = sel, renderBuyer, filterBuyer);
}

// ==================== Form Handlers ====================
document.getElementById('addFuelForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  // Validation: Check all fields are filled
  const supplierName = document.getElementById('supplierName').value.trim();
  const fuelBought = document.getElementById('fuelBought').value.trim();
  const dateBought = document.getElementById('dateBought').value.trim();

  if (!supplierName) return showError("Please enter supplier name.");
  if (!selectedBuyer) return showError("Please select a buyer.");
  if (!fuelBought) return showError("Please enter fuel amount.");
  if (!dateBought) return showError("Please select date bought.");

  const payload = {
    supplier_name: supplierName,
    fuel_bought: fuelBought,
    date_bought: dateBought,
    user_id: selectedBuyer.id
  };
  const saveBtn = document.getElementById('saveFuelBtn'); saveBtn.disabled = true; saveBtn.textContent = "Adding...";
  try { await createFuelRecord(payload); bootstrap.Modal.getInstance(document.getElementById('addFuelModal')).hide(); getAllFuels(); } finally { saveBtn.disabled = false; saveBtn.textContent = "Save Fuel"; }
});

document.getElementById('editFuelForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const fuelId = document.getElementById('editFuelId').value;

  // Validation: Check all fields are filled
  const editSupplierName = document.getElementById('editSupplierName').value.trim();
  const editFuelBought = document.getElementById('editFuelBought').value.trim();
  const editDateBought = document.getElementById('editDateBought').value.trim();

  if (!editSupplierName) return showError("Please enter supplier name.");
  if (!editSelectedBuyer) return showError("Please select a buyer.");
  if (!editFuelBought) return showError("Please enter fuel amount.");
  if (!editDateBought) return showError("Please select date bought.");

  const payload = {
    supplier_name: editSupplierName,
    fuel_bought: editFuelBought,
    date_bought: editDateBought,
    user_id: editSelectedBuyer.id
  };
  const saveBtn = document.getElementById('saveEditFuelBtn'); saveBtn.disabled = true; saveBtn.textContent = "Updating...";
  const success = await updateFuelRecord(fuelId, payload);
  if (success) { bootstrap.Modal.getInstance(document.getElementById('editFuelModal')).hide(); showSuccess('Fuel updated successfully'); }
  saveBtn.disabled = false; saveBtn.textContent = "Update Fuel";
});

// ==================== Attach Edit Listeners (FIXED METHOD) ====================
const editModalEl = document.getElementById('editFuelModal');
if (!editModalEl) console.error('CRITICAL: Edit Fuel Modal not found in DOM');


if (editModalEl) {
  // 1. Listen for the moment Bootstrap starts to show the modal
  editModalEl.addEventListener('show.bs.modal', (event) => {
    console.log('Edit Modal Opening...');


    // 2. Determine which button triggered the modal
    const btn = event.relatedTarget;

    // 3. Extract data from the button's data-attributes
    const fuelId = btn.dataset.id;
    const supplierName = btn.dataset.supplierName || '';
    const buyerId = btn.dataset.buyerId || '';
    const buyerName = btn.dataset.buyerName || '';
    const fuelBought = btn.dataset.fuelBought || '';
    const dateBought = btn.dataset.dateBought || '';

    // 4. Data Population (Mapping to your Modal's IDs)
    document.getElementById('editFuelId').value = fuelId;
    document.getElementById('editSupplierName').value = supplierName;
    document.getElementById('editFuelBought').value = fuelBought;
    document.getElementById('editDateBought').value = dateBought;

    // 5. Prefill Buyer/User Dropdown
    if (buyerName) {
      // Note: editBuyerInput is the global variable set from initBuyerDropdownGeneric
      editBuyerInput.value = buyerName;
      editSelectedBuyer = buyerId ? { id: parseInt(buyerId, 10), fullname: buyerName } : null;
    } else {
      editBuyerInput.value = '';
      editSelectedBuyer = null;
    }

    // Ensure the dropdown is hidden if it was open from a previous action
    document.getElementById('editBuyerDropdown').style.display = 'none';
  });
}

// ==================== Search & Filter State ====================
let currentSearch = '';
let currentFilter = 'default';

// ==================== Update Fuels Table ====================
function updateFuelTable() {
  const searchValue = document.getElementById('fuelSearch')?.value.trim() || '';
  const sortValue = document.getElementById('fuelFilter')?.value || 'default';

  getAllFuels({ search: searchValue, fuel_filter: sortValue });
}



// ==================== Debounced Search Input ====================
const handleFuelSearch = debounce(updateFuelTable, 300);

// ==================== Initialize Page ====================
document.addEventListener('DOMContentLoaded', () => {
  // Load initial data
  getAllFuels();

  // Attach search listener
  const fuelSearchInput = document.getElementById('fuelSearch');
  if (fuelSearchInput) {
    fuelSearchInput.addEventListener('input', handleFuelSearch);
  }

  // Attach filter listener
  const fuelFilterSelect = document.getElementById('fuelFilter');
  if (fuelFilterSelect) {
    fuelFilterSelect.addEventListener('change', updateFuelTable);
  }

  // Attach refresh button
  const refreshBtn = document.getElementById('refreshFuelBtn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      document.getElementById('fuelSearch').value = '';
      document.getElementById('fuelFilter').value = 'default';
      getAllFuels();
    });
  }


});
