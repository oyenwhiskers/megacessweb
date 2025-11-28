let toolState = {
    currentPage: 1,
    lastPage: 1,
    perPage: 10,
    total: 0,
    search: '',
    status: ''
};

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

// Animate the counting with fade-in & scale effect
function animateCount(el, value, duration = 1500) {
    if (!el) return;
    let start = 0;
    const startTime = performance.now();

    el.style.opacity = 0;
    el.style.transform = "scale(0.9)";
    el.style.transition = "opacity 0.4s ease-out, transform 0.4s ease-out";

    requestAnimationFrame(() => {
        el.style.opacity = 1;
        el.style.transform = "scale(1)";
    });

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
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

// Helpers to show/hide spinner indicators for analytics cards
function setStatsLoading(isLoading) {
    const mapping = [
        ['totalToolsSpinner', 'totalToolsValue'],
        ['availableToolsSpinner', 'availableToolsValue'],
        ['inUseToolsSpinner', 'inUseToolsValue'],
        ['brokenToolsSpinner', 'brokenToolsValue']
    ];

    mapping.forEach(([spinnerId, valueId]) => {
        const spinner = document.getElementById(spinnerId);
        const valueEl = document.getElementById(valueId);
        if (!spinner || !valueEl) return;

        if (isLoading) {
            spinner.classList.remove('d-none');
            valueEl.classList.add('opacity-50');
        } else {
            spinner.classList.add('d-none');
            valueEl.classList.remove('opacity-50');
        }
    });
}

async function refreshToolSummary() {
    setStatsLoading(true);
    try {
        // Simple direct fetch to ensure we get global stats, not just per-page
        const result = await apiFetch('/analytics/resources-usage');

        if (result.data && result.data.tools_analytics) {
            const stats = result.data.tools_analytics;
            animateCount(document.getElementById('totalToolsValue'), Number(stats.total_tools) || 0, 1200);
            animateCount(document.getElementById('availableToolsValue'), Number(stats.available) || 0, 1200);
            animateCount(document.getElementById('inUseToolsValue'), Number(stats.in_use) || 0, 1200);
            animateCount(document.getElementById('brokenToolsValue'), Number(stats.broken) || 0, 1200);
        }
    } catch (err) {
        console.warn("Analytics fetch failed:", err);
    } finally {
        setStatsLoading(false);
    }
}
window.refreshToolSummary = refreshToolSummary;

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
        bootstrap.Modal.getOrCreateInstance(document.getElementById('addToolsModal')).hide();
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
        bootstrap.Modal.getOrCreateInstance(document.getElementById('updateToolModal')).hide();

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
}, 100);

document.getElementById('toolSearch').addEventListener('input', handleSearch);
document.getElementById('toolStatus').addEventListener('change', handleSearch);

document.getElementById('refreshToolBtn').addEventListener('click', () => {
    document.getElementById('toolSearch').value = '';
    document.getElementById('toolStatus').value = '';
    getAllTools({ page: 1, search: '', status: '' });
    refreshToolSummary();
});