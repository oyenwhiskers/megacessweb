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

// ==================== Loading Overlay ====================
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

// ==================== GET /tools ====================
async function getAllTools({ search = '', status = '', per_page = 15 } = {}) {
  const token = getToken();
  if (!token) {
    showErrorNoToken("Missing authentication token. Please login first.");
    return;
  }

  const apiUrl = new URL('https://mwms.megacess.com/api/v1/tools');

  if (search) apiUrl.searchParams.append('search', search);
  if (status) apiUrl.searchParams.append('status', status);
  if (per_page) apiUrl.searchParams.append('per_page', per_page);

  const loading = document.getElementById('loading');
  const tableBody = document.getElementById('toolsTableBody');

  loading.style.display = 'block';
  tableBody.innerHTML = '';

  try {
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    const result = await response.json();
    loading.style.display = 'none';

    if (response.ok && result.success) {
      if (result.data.length > 0) populateToolsTable(result.data);
      else tableBody.innerHTML = `<div class="text-center text-muted py-3">No tools found</div>`;
    } else {
      tableBody.innerHTML = `<div class="text-center text-danger py-3">Error: ${result.message || 'Unknown error'}</div>`;
      if (typeof showError === 'function') showError(result.message);
    }
  } catch (error) {
    loading.style.display = 'none';
    tableBody.innerHTML = `<div class="text-center text-danger py-3">Failed to load tools</div>`;
    if (typeof showError === 'function') showError('Failed to load tools. Please try again.');
    console.error('Fetch error:', error);
  }
}

// ==================== Populate Table ====================
function populateToolsTable(tools) {
  const tableBody = document.getElementById('toolsTableBody');
  tableBody.innerHTML = '';

  tools.forEach(tool => {
    const row = document.createElement('div');
    row.className = 'content-row d-flex border-bottom py-2 align-items-center';

    const toolStatus = tool.status ? tool.status.toLowerCase() : 'unknown';
    let statusClass = 'bg-secondary';
    if (toolStatus === 'available') statusClass = 'bg-success';
    else if (toolStatus === 'in use') statusClass = 'bg-warning text-dark';
    else if (toolStatus === 'broken') statusClass = 'bg-danger';

    row.innerHTML = `
      <div class="col-4 ps-3">${tool.tool_name || 'Unnamed Tool'}</div>
      <div class="col-4">
        <span class="badge ${statusClass}">${tool.status || 'Unknown'}</span>
      </div>
      <div class="col-4 text-center">
        <button class="btn btn-sm btn-warning me-2 update-tool-btn" 
                data-id="${tool.id}" 
                data-name="${tool.tool_name || ''}" 
                data-status="${toolStatus}">
          <i class="bi bi-pencil"></i> Edit
        </button>
        <button class="btn btn-sm btn-danger delete-tool-btn" data-id="${tool.id}">
          <i class="bi bi-trash"></i> Delete
        </button>
      </div>
    `;
    tableBody.appendChild(row);
  });

  // ✅ Update stat cards
  updateToolStats(tools);

  // ✅ Safely reattach event listeners (if defined)
  if (typeof attachEditListeners === 'function') attachEditListeners();
  if (typeof attachDeleteListeners === 'function') attachDeleteListeners();
}

// Animate the counting with fade-in & scale effect
function animateCount(el, value, duration = 1500) {
  let start = 0;
  const startTime = performance.now();

  // Reset visual styles before animating
  el.style.opacity = 0;
  el.style.transform = "scale(0.9)";
  el.style.transition = "opacity 0.4s ease-out, transform 0.4s ease-out";

  // Trigger fade/scale animation
  requestAnimationFrame(() => {
    el.style.opacity = 1;
    el.style.transform = "scale(1)";
  });

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // Ease-out curve (smooth stop)
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.floor(start + (value - start) * eased);
    el.textContent = current;

    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      el.textContent = value;
    }
  }

  requestAnimationFrame(update);
}

// Update tool stats cards
function updateToolStats(tools) {
  const total = tools.length;
  const available = tools.filter(v => v.status.toLowerCase() === 'available').length;
  const inUse = tools.filter(v => v.status.toLowerCase() === 'in use').length;
  const broken = tools.filter(v => v.status.toLowerCase() === 'broken').length;

  animateCount(document.getElementById('totalTools'), total, 1800);
  animateCount(document.getElementById('availableTools'), available, 1800);
  animateCount(document.getElementById('inUseTools'), inUse, 1800);
  animateCount(document.getElementById('brokenTools'), broken, 1800);
}

// ==================== POST /tools ====================
document.getElementById('addToolBtn').addEventListener('click', async () => {
  const token = getToken();
  if (!token) {
    showErrorNoToken("Missing authentication token. Please login first.");
    return;
  }
  const toolName = document.getElementById('toolName').value.trim();
  const statusSelect = document.getElementById('toolStatus');
  const status = statusSelect.value;

  if (!toolName || !status || status === 'Choose status') {
    showError('Please fill in all fields.');
    return;
  }

  const addBtn = document.getElementById('addToolBtn');
  addBtn.disabled = true;
  const originalText = addBtn.textContent;
  addBtn.textContent = 'Adding...';

  try {
    const response = await fetch('https://mwms.megacess.com/api/v1/tools', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ tool_name : toolName, status })
    });
    const result = await response.json();

    if (response.ok && result.success) {
      bootstrap.Modal.getInstance(document.getElementById('addToolsModal')).hide();
      document.getElementById('toolName').value = '';
      statusSelect.value = 'Choose status';
      getAllTools();
      showSuccess('Tool added successfully!');
    } else {
      showError(result.message);
    }
  } catch (error) {
    console.error(error);
    showError('Failed to add tool. Please try again.');
  } finally {
    addBtn.disabled = false;
    addBtn.textContent = originalText;
  }
});

// ==================== UPDATE /tools ====================
let currentToolId = null;

function attachEditListeners() {
  const editBtns = document.querySelectorAll('.update-tool-btn');
  editBtns.forEach(btn => {
    btn.removeEventListener('click', handleEdit);
    btn.addEventListener('click', handleEdit);
  });
}

function handleEdit(e) {
  const btn = e.currentTarget;
  currentToolId = btn.dataset.id;
  document.getElementById('updateToolName').value = btn.dataset.name;
  document.getElementById('updateToolStatus').value = btn.dataset.status;
  bootstrap.Modal.getOrCreateInstance(document.getElementById('updateToolModal')).show();
}

document.getElementById('updateToolBtn').addEventListener('click', async () => {
  const token = getToken();
  if (!token) {
    showErrorNoToken("Missing authentication token. Please login first.");
    return;
  }

  if (!currentToolId) return;

  const name = document.getElementById('updateToolName').value.trim();
  const status = document.getElementById('updateToolStatus').value;

  if (!name && !status) {
    showError('Please fill at least one field to update.');
    return;
  }

  const updateBtn = document.getElementById('updateToolBtn');
  updateBtn.disabled = true;
  const originalText = updateBtn.textContent;
  updateBtn.textContent = 'Updating...';

  try {
    const response = await fetch(`https://mwms.megacess.com/api/v1/tools/${currentToolId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        tool_name: name || undefined,
        status: status || undefined
      })
    });
    const result = await response.json();

    if (response.ok && result.success) {
      bootstrap.Modal.getOrCreateInstance(document.getElementById('updateToolModal')).hide();
      getAllTools();
      showSuccess(result.message);
    } else {
      showError(result.message);
    }
  } catch (err) {
    console.error(err);
    showError('Failed to update tool.');
  } finally {
    updateBtn.disabled = false;
    updateBtn.textContent = originalText;
  }
});

// ==================== DELETE /tools ====================
function attachDeleteListeners() {
  const deleteButtons = document.querySelectorAll('.delete-tool-btn');
  deleteButtons.forEach(btn => {
    btn.removeEventListener('click', handleDelete);
    btn.addEventListener('click', handleDelete);
  });
}

async function handleDelete(e) {
  const token = getToken();
  if (!token) {
    showErrorNoToken("Missing authentication token. Please login first.");
    return;
  }

  const toolId = e.currentTarget.dataset.id;
  showConfirm('You want to delete this tool?', async () => {
    showLoading();
    try {
      const response = await fetch(`https://mwms.megacess.com/api/v1/tools/${toolId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      const result = await response.json();
      if (response.ok && result.success) {
        showSuccess(result.message);
        getAllTools();
      } else {
        showError(result.message);
      }
    } catch (err) {
      console.error(err);
      showError('Failed to delete tool. Please try again.');
    } finally {
      hideLoading();
    }
  });
}

// ==================== Initialize Fetch on Page Load ====================
document.addEventListener('DOMContentLoaded', () => {
  getAllTools(); // Fetch and render all tools
});

// ==================== Search Functions ====================
// Debounce helper to limit rapid API calls
function debounce(func, delay) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => func.apply(this, args), delay);
  };
}

// Triggered whenever search input or filter changes
function updateToolTable() {
  const searchValue = document.getElementById('toolSearch').value.trim() || undefined;
  const statusValue = document.getElementById('toolStatus').value || undefined; // 'All Status' can map to undefined
  getAllTools({ search: searchValue, status: statusValue });
}

// Debounce the search input to avoid flooding API requests
const handleToolSearch = debounce(updateToolTable, 150);

// Attach event listeners
document.getElementById('toolSearch').addEventListener('input', handleToolSearch);
document.getElementById('toolStatus').addEventListener('change', updateToolTable);

document.getElementById('refreshToolBtn').addEventListener('click', () => {
  // Reset search input
  document.getElementById('toolSearch').value = '';

  // Reset status filter
  document.getElementById('toolStatus').value = '';

  // Reload tools table
  getAllTools();
});

