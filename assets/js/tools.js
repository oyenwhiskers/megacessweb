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

// ==================== GET /tools ====================
async function getAllTools({ search = '', status = '', per_page = 15 } = {}) {
  const token = '69|Pqml1FrUSJP2y2LbluqZH826kI3hb8RtwOajuPos9e9fd0f0';
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
    else if (toolStatus === 'under maintenance') statusClass = 'bg-danger';

    row.innerHTML = `
      <div class="col-4 ps-3">${tool.tool_name || 'Unnamed Tool'}</div>
      <div class="col-4">
        <span class="badge ${statusClass}">${tool.status || 'Unknown'}</span>
      </div>
      <div class="col-4 text-center">
        <button class="btn btn-sm btn-warning me-2 edit-tool-btn" 
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

  // ✅ Safely reattach event listeners (if defined)
  if (typeof attachEditListeners === 'function') attachEditListeners();
  if (typeof attachDeleteListeners === 'function') attachDeleteListeners();
}

// ==================== Initialize Fetch on Page Load ====================
document.addEventListener('DOMContentLoaded', () => {
  getAllTools(); // Fetch and render all tools
});
