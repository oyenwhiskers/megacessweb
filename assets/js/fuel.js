// ==================== Loading Overlay ====================
function showLoading() { document.getElementById('loadingOverlay')?.classList.remove('d-none'); }
function hideLoading() { document.getElementById('loadingOverlay')?.classList.add('d-none'); }

// ==================== Fetch Fuels ====================
async function getAllFuels({ search = '', fuel_filter = '', per_page = 15 } = {}) {
  const token = getToken();
  if (!token) return showErrorNoToken();

  const apiUrl = new URL('https://mwms.megacess.com/api/v1/fuels');
  if (search) apiUrl.searchParams.append('search', search);
  if (fuel_filter && fuel_filter !== 'default') apiUrl.searchParams.append('fuelFilter', fuel_filter);
  if (per_page) apiUrl.searchParams.append('per_page', per_page);

  const loading = document.getElementById('loading');
  const tableBody = document.getElementById('fuelsTableBody');

  loading.style.display = 'block';
  tableBody.innerHTML = '';

  console.log('API URL:', apiUrl.toString());
  console.log('Filter value:', fuel_filter);

  try {
    const res = await fetch(apiUrl, { method: 'GET', headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' } });
    const result = await res.json();
    loading.style.display = 'none';

    if (res.ok && result.success) {
      result.data.length ? populateFuelsTable(result.data) : tableBody.innerHTML = `<div class="text-center text-muted py-3">No fuels found</div>`;
    } else {
      tableBody.innerHTML = `<div class="text-center text-danger py-3">Error: ${result.message || 'Unknown error'}</div>`;
      showError(result.message);
    }
  } catch (err) {
    loading.style.display = 'none';
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

    let fuelClass = 'bg-warning text-black'; // customize based on fuel amount if needed

    row.innerHTML = `
      <div class="col">${fuel.supplier_name || 'Unnamed Fuel'}</div>
      <div class="col">${fuel.user.user_fullname || '-'}</div> 
      <div class="col">
        <span class="badge ${fuelClass} px-3 py-2 fs-6">${fuel.fuel_bought || 'Unknown'}</span>
      </div>
      <div class="col">
        ${fuel.date_bought ? new Date(fuel.date_bought).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
      </div>
      <div class="col text-center">
        <button class="btn btn-sm btn-warning me-2 update-fuel-btn"
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

// ==================== Create / Add Fuel ====================
async function createFuelRecord(payload) {
  const token = getToken(); if (!token) return showErrorNoToken();

  try {
    const res = await fetch('https://mwms.megacess.com/api/v1/fuels', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    result.success ? showSuccess("Fuel record added successfully!") : showError(result.message || "Failed to add fuel record.");
  } catch (err) {
    console.error(err);
    showError("Failed to add fuel record. Try again.");
  }
}

// ==================== Update Fuel ====================
async function updateFuelRecord(fuelId, payload) {
  const token = getToken(); if (!token) return showErrorNoToken();

  if (!fuelId) { console.error("Fuel ID is required"); return false; }

  try {
    const res = await fetch(`https://mwms.megacess.com/api/v1/fuels/${fuelId}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    if (res.ok && result.success) { getAllFuels(); return true; }
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
  e.preventDefault(); // <--- ADD THIS
  const token = getToken(); if (!token) return showErrorNoToken();
  const fuelId = e.currentTarget.dataset.id;

  showConfirm('You want to delete this fuel?', async () => {
    showLoading();
    console.log('showing loading');
    try {
      const res = await fetch(`https://mwms.megacess.com/api/v1/fuels/${fuelId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' } });
      const result = await res.json();
      if (res.ok && result.success) { showSuccess(result.message); getAllFuels(); }
      else showError(result.message);
    } catch (err) {
      console.error(err);
      showError('Failed to delete fuel. Please try again.');
    } finally { hideLoading(); }
  });
}

// ==================== Fetch Buyers ====================
async function getAllBuyers() {
  const token = getToken(); if (!token) return showErrorNoToken();

  try {
    const res = await fetch('https://mwms.megacess.com/api/v1/users', { headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' } });
    const data = await res.json();
    return data?.data?.map(u => ({ id: u.id, fullname: u.user_fullname, account_type: 'user' })) || [];
  } catch (err) {
    console.error(err); showError("Failed to load buyers."); return [];
  }
}

// ==================== Generic Buyer Dropdown ====================
function initBuyerDropdownGeneric(inputEl, dropdownEl, onSelect) {
  let allBuyers = [];
  let selectedBuyer = null;

  getAllBuyers().then(data => allBuyers = data);

  function showDropdown(list) {
    dropdownEl.innerHTML = '';
    if (!list.length) {
      const li = document.createElement('li'); li.classList.add('dropdown-item', 'text-muted'); li.textContent = "No results found"; dropdownEl.appendChild(li); dropdownEl.style.display = 'block'; return;
    }
    list.forEach(person => {
      const li = document.createElement('li'); li.classList.add('dropdown-item');
      li.innerHTML = `${person.fullname}<small class="text-muted d-block">(USER ID: ${person.id})</small>`;
      li.addEventListener('click', () => { inputEl.value = person.fullname; selectedBuyer = person; dropdownEl.style.display = 'none'; onSelect(selectedBuyer); });
      dropdownEl.appendChild(li);
    });
    dropdownEl.style.display = 'block';
  }

  inputEl.addEventListener('focus', () => showDropdown(allBuyers));
  inputEl.addEventListener('click', () => showDropdown(allBuyers));
  inputEl.addEventListener('input', () => { const search = inputEl.value.toLowerCase(); showDropdown(allBuyers.filter(p => p.fullname.toLowerCase().includes(search) || String(p.id).includes(search))); });
  document.addEventListener('click', e => { if (!inputEl.contains(e.target)) dropdownEl.style.display = 'none'; });

  return { getSelected: () => selectedBuyer };
}

// ==================== Initialize Buyer Dropdowns ====================
let selectedBuyer = null;
const buyerInput = document.getElementById('assignedPerson');
const buyerDropdownEl = document.getElementById('buyerDropdown');

if (buyerInput && buyerDropdownEl) {
  initBuyerDropdownGeneric(buyerInput, buyerDropdownEl, sel => selectedBuyer = sel);
}

const editBuyerInput = document.getElementById('editAssignedPerson');
const editBuyerDropdownEl = document.getElementById('editBuyerDropdown');
let editSelectedBuyer = null;

if (editBuyerInput && editBuyerDropdownEl) {
  initBuyerDropdownGeneric(editBuyerInput, editBuyerDropdownEl, sel => editSelectedBuyer = sel);
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

// ==================== Debounce Helper ====================
function debounce(func, delay) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => func.apply(this, args), delay);
  };
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
