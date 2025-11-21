// ==================== GLOBAL STATE & CONSTANTS ====================
const BASE_URL = 'https://mwms.megacess.com/api/v1';

let toolState = {
    currentPage: 1,
    lastPage: 1,
    perPage: 15,
    total: 0,
    search: '',
    status: ''
};

// ==================== HELPER FUNCTIONS ====================
function getToken() {
    return localStorage.getItem('authToken') || sessionStorage.getItem('authToken') || null;
}

function showSuccess(msg) {
    Swal.fire({ icon: 'success', title: 'Success!', text: msg, timer: 2000, showConfirmButton: false });
}

function showError(msg) {
    Swal.fire({ icon: 'error', title: 'Error', text: msg, timer: 3000, showConfirmButton: true });
}

function showErrorNoToken(msg) {
    Swal.fire({ icon: 'error', title: 'Authentication Error', text: msg }).then(() => {
        window.location.replace('../log-in.html');
    });
}

function showConfirm(message, callbackYes) {
    Swal.fire({
        title: 'Are you sure?', text: message, icon: 'warning', showCancelButton: true,
        confirmButtonColor: '#3085d6', cancelButtonColor: '#d33', confirmButtonText: 'Yes, do it!'
    }).then((result) => {
        if (result.isConfirmed) callbackYes();
    });
}

function showLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.classList.remove('d-none');
}

function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.classList.add('d-none');
}

function debounce(func, delay) {
    let timer;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => func.apply(this, args), delay);
    };
}

/**
 * Generic API Fetch Wrapper
 */
async function apiFetch(endpoint, options = {}) {
    const token = getToken();
    if (!token) {
        showErrorNoToken("Please login first.");
        throw new Error("No token");
    }

    const defaultHeaders = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    };

    try {
        const response = await fetch(`${BASE_URL}${endpoint}`, {
            ...options,
            headers: { ...defaultHeaders, ...options.headers }
        });

        const result = await response.json();

        if (!response.ok || (result && result.success === false)) {
            throw new Error(result.message || `API Error: ${response.status}`);
        }

        return result;
    } catch (error) {
        console.error(`API Error (${endpoint}):`, error);
        throw error;
    }
}

// ==================== MAIN TABLE LOGIC ====================

async function getAllTools({ search = '', status = '', page = 1 } = {}) {
    const loading = document.getElementById('loading');
    const tableBody = document.getElementById('toolsTableBody');
    
    // Update Global State
    toolState.search = search;
    toolState.status = status;
    toolState.currentPage = page;

    loading.style.display = 'block';
    tableBody.innerHTML = '';

    try {
        const queryParams = new URLSearchParams({
            search: search,
            status: status,
            page: page,
            per_page: toolState.perPage
        });

        const result = await apiFetch(`/tools?${queryParams.toString()}`);
        loading.style.display = 'none';

        if (result.data && result.data.length > 0) {
            populateToolsTable(result.data);
            if (result.meta) updateToolPaginationControls(result.meta);
        } else {
            tableBody.innerHTML = `<div class="text-center text-muted py-3">No tools found</div>`;
        }
    } catch (error) {
        loading.style.display = 'none';
        tableBody.innerHTML = `<div class="text-center text-danger py-3">Failed to load tools</div>`;
        showError(error.message);
    }
}

function populateToolsTable(tools) {
    const tableBody = document.getElementById('toolsTableBody');
    tableBody.innerHTML = '';

    tools.forEach(tool => {
        const row = document.createElement('div');
        row.className = 'content-row d-flex border-bottom py-2 align-items-center';

        const statusRaw = tool.status ? tool.status.toLowerCase() : 'unknown';
        let statusClass = 'bg-secondary';
        if (statusRaw === 'available') statusClass = 'bg-success';
        else if (statusRaw === 'in use') statusClass = 'bg-warning text-dark';
        else if (statusRaw === 'broken') statusClass = 'bg-danger';

        // Escape quotes for the data-json attribute
        const safeJson = JSON.stringify(tool).replace(/'/g, "&apos;");

        row.innerHTML = `
            <div class="col-4 ps-3">${tool.tool_name || 'Unnamed Tool'}</div>
            <div class="col-4"><span class="badge ${statusClass}">${tool.status || 'Unknown'}</span></div>
            <div class="col-4 text-center">
                <button class="btn btn-sm btn-warning me-2 edit-btn" data-json='${safeJson}'>
                    <i class="bi bi-pencil"></i> Edit
                </button>
                <button class="btn btn-sm btn-danger delete-btn" data-id="${tool.id}">
                    <i class="bi bi-trash"></i> Delete
                </button>
            </div>
        `;
        tableBody.appendChild(row);
    });
}

// EVENT DELEGATION: Handle Table Clicks (Edit/Delete)
document.getElementById('toolsTableBody').addEventListener('click', (e) => {
    const deleteBtn = e.target.closest('.delete-btn');
    const editBtn = e.target.closest('.edit-btn');

    if (deleteBtn) {
        const toolId = deleteBtn.dataset.id;
        handleDelete(toolId);
    } else if (editBtn) {
        const toolData = JSON.parse(editBtn.dataset.json);
        openUpdateModal(toolData);
    }
});

// ==================== PAGINATION ====================

function updateToolPaginationControls(meta) {
    toolState.lastPage = meta.last_page;
    toolState.total = meta.total;
    renderToolPagination(meta.current_page, meta.last_page);
}

function renderToolPagination(current, last) {
    const container = document.getElementById('toolPagination');
    if (!container) return;

    let html = '';
    const prevDisabled = current <= 1 ? 'disabled' : '';
    html += `<li class="page-item ${prevDisabled}"><a class="page-link" href="#" data-page="${current - 1}">Previous</a></li>`;

    const maxButtons = 5;
    let start = Math.max(1, current - 2);
    let end = Math.min(last, start + maxButtons - 1);

    if (end - start < maxButtons) start = Math.max(1, end - maxButtons + 1);

    for (let i = start; i <= end; i++) {
        html += `<li class="page-item ${i === current ? 'active' : ''}"><a class="page-link" href="#" data-page="${i}">${i}</a></li>`;
    }

    const nextDisabled = current >= last ? 'disabled' : '';
    html += `<li class="page-item ${nextDisabled}"><a class="page-link" href="#" data-page="${current + 1}">Next</a></li>`;

    container.innerHTML = html;

    container.querySelectorAll('a.page-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = parseInt(e.target.dataset.page);
            if (page && page !== current && page > 0 && page <= last) {
                getAllTools({ ...toolState, page });
                window.scrollTo(0, 0);
            }
        });
    });
}

// ==================== ANALYTICS ====================

function animateCount(el, value, duration = 1000) {
    if (!el) return;
    let start = 0;
    const startTime = performance.now();
    
    requestAnimationFrame(() => { el.style.opacity = 1; });

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        
        el.textContent = Math.floor(start + (value - start) * eased);
        
        if (progress < 1) requestAnimationFrame(update);
        else el.textContent = value;
    }
    requestAnimationFrame(update);
}

async function refreshToolSummary() {
    try {
        // Simple direct fetch to ensure we get global stats, not just per-page
        const result = await apiFetch('/analytics/resources-usage');
        
        if (result.data && result.data.tools_analytics) {
            const stats = result.data.tools_analytics;
            animateCount(document.getElementById('totalToolsValue'), Number(stats.total_tools) || 0);
            animateCount(document.getElementById('availableToolsValue'), Number(stats.available) || 0);
            animateCount(document.getElementById('inUseToolsValue'), Number(stats.in_use) || 0);
            animateCount(document.getElementById('brokenToolsValue'), Number(stats.broken) || 0);
        }
    } catch (err) {
        console.warn("Analytics fetch failed:", err);
    }
}

// ==================== CRUD OPERATIONS ====================

// CREATE TOOL
document.getElementById('addToolBtn').addEventListener('click', async () => {
    const nameInput = document.getElementById('toolName');
    const statusInput = document.getElementById('toolStatusModal');
    const btn = document.getElementById('addToolBtn');

    const payload = {
        tool_name: nameInput.value.trim(),
        status: statusInput.value
    };

    if (!payload.tool_name || !payload.status || payload.status === 'Choose status') {
        return showError('Please fill in all fields.');
    }

    btn.disabled = true; btn.textContent = 'Adding...';

    try {
        const result = await apiFetch('/tools', {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        showSuccess('Tool added successfully!');
        bootstrap.Modal.getInstance(document.getElementById('addToolsModal')).hide();
        nameInput.value = '';
        statusInput.value = '';
        
        getAllTools({ page: 1 }); // Reset to first page
        refreshToolSummary();

    } catch (error) {
        showError(error.message);
    } finally {
        btn.disabled = false; btn.textContent = 'Add Tool';
    }
});

// DELETE TOOL
async function handleDelete(toolId) {
    showConfirm('Are you sure you want to delete this tool?', async () => {
        showLoading();
        try {
            const result = await apiFetch(`/tools/${toolId}`, { method: 'DELETE' });
            showSuccess(result.message || 'Tool deleted');
            
            getAllTools({ ...toolState }); // Refresh current page
            refreshToolSummary();
        } catch (error) {
            showError(error.message);
        } finally {
            hideLoading();
        }
    });
}

// UPDATE TOOL PREPARATION
function openUpdateModal(tool) {
    const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('updateToolModal'));
    
    document.getElementById('updateToolName').value = tool.tool_name;
    document.getElementById('updateToolStatus').value = tool.status;
    
    // Store ID on the update button for reference
    document.getElementById('updateToolBtn').dataset.id = tool.id;
    
    modal.show();
}

// UPDATE TOOL SUBMIT
document.getElementById('updateToolBtn').addEventListener('click', async (e) => {
    const toolId = e.target.dataset.id;
    const name = document.getElementById('updateToolName').value.trim();
    const status = document.getElementById('updateToolStatus').value;
    const btn = e.target;

    if (!toolId) return;
    if (!name && !status) return showError('Nothing to update.');

    btn.disabled = true; btn.textContent = 'Updating...';

    try {
        const result = await apiFetch(`/tools/${toolId}`, {
            method: 'PUT',
            body: JSON.stringify({ tool_name: name, status: status })
        });

        showSuccess(result.message || 'Tool updated');
        bootstrap.Modal.getInstance(document.getElementById('updateToolModal')).hide();
        
        getAllTools({ ...toolState });
        refreshToolSummary();

    } catch (error) {
        showError(error.message);
    } finally {
        btn.disabled = false; btn.textContent = 'Update Tool';
    }
});

// ==================== INITIALIZATION & SEARCH ====================

document.addEventListener('DOMContentLoaded', () => {
    getAllTools();
    refreshToolSummary();
});

// Search & Filter Handlers
const handleSearch = debounce(() => {
    const search = document.getElementById('toolSearch').value.trim();
    const status = document.getElementById('toolStatus').value;
    getAllTools({ search, status, page: 1 });
}, 300);

document.getElementById('toolSearch').addEventListener('input', handleSearch);
document.getElementById('toolStatus').addEventListener('change', handleSearch);

document.getElementById('refreshToolBtn').addEventListener('click', () => {
    document.getElementById('toolSearch').value = '';
    document.getElementById('toolStatus').value = '';
    getAllTools({ page: 1, search: '', status: '' });
});