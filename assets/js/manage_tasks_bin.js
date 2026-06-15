// Tasks Trash Bin Dashboard Controller
(function () {
  const token = localStorage.getItem('auth_token') || 
                sessionStorage.getItem('auth_token') || 
                localStorage.getItem('authToken') || 
                sessionStorage.getItem('authToken');

  if (!token) {
    window.location.href = 'log-in.html';
    return;
  }

  // API headers helper
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };

  // State
  let allLocations = [];
  let currentPage = 1;
  let selectedTaskIds = new Set(); // Multi-select bulk actions state

  // DOM Elements
  const searchTaskName = document.getElementById('searchTaskName');
  const filterDate = document.getElementById('filterDate');
  const filterLocation = document.getElementById('filterLocation');
  const filterType = document.getElementById('filterType');
  const btnClearFilters = document.getElementById('btnClearFilters');
  const tasksTableBody = document.getElementById('tasksTableBody');
  const paginationInfo = document.getElementById('paginationInfo');
  const paginationContainer = document.getElementById('paginationContainer');

  // Bulk Actions
  const checkAllTasks = document.getElementById('checkAllTasks');
  const bulkActionsPanel = document.getElementById('bulkActionsPanel');
  const bulkSelectedCount = document.getElementById('bulkSelectedCount');
  const btnBulkRestore = document.getElementById('btnBulkRestore');
  const btnBulkPermanentDelete = document.getElementById('btnBulkPermanentDelete');

  // Trigger loading
  document.addEventListener('DOMContentLoaded', initializePage);

  async function initializePage() {
    // Load locations
    await fetchLocations();

    // Load initial tasks table (page 1)
    fetchTasks(1);

    // Filters event listeners
    let searchTimeout;
    searchTaskName.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        fetchTasks(1);
      }, 300);
    });
    if (filterDate) filterDate.addEventListener('change', () => fetchTasks(1));
    filterLocation.addEventListener('change', () => fetchTasks(1));
    filterType.addEventListener('change', () => fetchTasks(1));
    btnClearFilters.addEventListener('click', clearFilters);

    // Bulk Actions Event Listeners
    if (checkAllTasks) {
      checkAllTasks.addEventListener('change', handleCheckAllChange);
    }
    if (btnBulkRestore) {
      btnBulkRestore.addEventListener('click', handleBulkRestoreClick);
    }
    if (btnBulkPermanentDelete) {
      btnBulkPermanentDelete.addEventListener('click', handleBulkPermanentDeleteClick);
    }
  }

  // Fetch data
  async function fetchLocations() {
    try {
      const res = await fetch(`${API_URL}/locations`, { headers });
      const data = await res.json();
      if (data.success) {
        allLocations = data.data;
        allLocations.forEach(loc => {
          const opt = document.createElement('option');
          opt.value = loc.id;
          opt.textContent = loc.name || loc.location_name;
          filterLocation.appendChild(opt);
        });
      }
    } catch (e) {
      console.error('Failed to load locations', e);
    }
  }

  async function fetchTasks(page = 1) {
    currentPage = page;
    
    // Clear selection state when loading a new page or new filters
    selectedTaskIds.clear();
    updateBulkActionsPanel();

    tasksTableBody.innerHTML = `
      <tr>
        <td colspan="9" class="text-center py-4">
          <div class="spinner-border text-danger" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
        </td>
      </tr>
    `;

    try {
      let url = `${API_URL}/tasks?page=${page}&show_deleted=true`;
      if (filterLocation.value) url += `&location_id=${filterLocation.value}`;
      if (filterType.value) url += `&task_type=${filterType.value}`;
      if (filterDate && filterDate.value) url += `&task_date=${filterDate.value}`;
      if (searchTaskName && searchTaskName.value.trim()) {
        url += `&task_name=${encodeURIComponent(searchTaskName.value.trim())}`;
      }

      const res = await fetch(url, { headers });
      const data = await res.json();

      if (data.success) {
        renderTasksTable(data.data);
        renderPagination(data.pagination);
      } else {
        tasksTableBody.innerHTML = `<tr><td colspan="9" class="text-center text-danger py-4">Failed to load deleted tasks: ${data.message}</td></tr>`;
      }
    } catch (e) {
      tasksTableBody.innerHTML = `<tr><td colspan="9" class="text-center text-danger py-4">Network error loading deleted tasks.</td></tr>`;
      console.error(e);
    }
  }

  function clearFilters() {
    if (searchTaskName) searchTaskName.value = '';
    if (filterDate) filterDate.value = '';
    filterLocation.value = '';
    filterType.value = '';
    fetchTasks(1);
  }

  // Render list of deleted tasks
  function renderTasksTable(tasks) {
    if (tasks.length === 0) {
      tasksTableBody.innerHTML = `<tr><td colspan="9" class="text-center py-4 text-muted">No deleted tasks found.</td></tr>`;
      return;
    }

    tasksTableBody.innerHTML = '';
    tasks.forEach(task => {
      const typeLabel = capitalizeFirstLetter(task.taskType);
      const formattedDate = task.taskDate ? new Date(task.taskDate).toLocaleDateString('en-GB') : '-';
      const formattedDeletedAt = task.deletedAt ? new Date(task.deletedAt).toLocaleString('en-GB') : '-';

      const createdByName = task.createdBy ? task.createdBy.name : '-';
      const assignedWorkers = task.workers && task.workers.length > 0 
        ? task.workers.map(w => w.fullName).join(', ') 
        : '-';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><input type="checkbox" class="form-check-input task-checkbox" data-id="${task.id}" ${selectedTaskIds.has(task.id) ? 'checked' : ''}></td>
        <td class="fw-semibold">${formattedDate}</td>
        <td><span class="badge bg-light text-dark border p-2">${task.location ? task.location.name : '-'}</span></td>
        <td class="fw-semibold text-danger">${task.taskName || '-'}</td>
        <td>${typeLabel}</td>
        <td>${createdByName}</td>
        <td><small class="text-muted">${assignedWorkers}</small></td>
        <td><small class="text-secondary">${formattedDeletedAt}</small></td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-success rounded-pill px-2 restore-task-btn me-1" data-id="${task.id}">
            <i class="bi bi-arrow-counterclockwise"></i> Restore
          </button>
          <button class="btn btn-sm btn-outline-danger rounded-pill px-2 delete-task-btn" data-id="${task.id}">
            <i class="bi bi-trash"></i> Delete
          </button>
        </td>
      `;

      tr.querySelector('.restore-task-btn').addEventListener('click', () => handleRestoreTask(task.id, task.taskName));
      tr.querySelector('.delete-task-btn').addEventListener('click', () => handleDeleteTask(task.id, task.taskName));

      tr.querySelector('.task-checkbox').addEventListener('change', (e) => {
        const taskId = parseInt(e.target.getAttribute('data-id'));
        if (e.target.checked) {
          selectedTaskIds.add(taskId);
        } else {
          selectedTaskIds.delete(taskId);
        }
        updateBulkActionsPanel();
      });

      tasksTableBody.appendChild(tr);
    });
  }

  // Handle restore task
  function handleRestoreTask(id, name) {
    Swal.fire({
      title: 'Restore Task?',
      text: `Are you sure you want to restore "${name}"?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#198754',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, restore it!'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          Swal.showLoading();
          const res = await fetch(`${API_URL}/tasks/${id}/restore`, {
            method: 'POST',
            headers
          });
          const data = await res.json();
          Swal.close();
          if (data.success) {
            Swal.fire('Restored!', 'Task has been restored successfully.', 'success');
            fetchTasks(currentPage);
          } else {
            Swal.fire('Failed', data.message || 'Failed to restore task', 'error');
          }
        } catch (e) {
          Swal.close();
          Swal.fire('Error', 'Network error occurred.', 'error');
        }
      }
    });
  }

  // Pagination helper
  function renderPagination(meta) {
    if (!meta) return;
    paginationInfo.textContent = `Showing ${meta.from || 0} to ${meta.to || 0} of ${meta.total} entries`;
    
    paginationContainer.innerHTML = '';
    const lastPage = meta.last_page;
    if (lastPage <= 1) return;

    // Previous Button
    const prevLi = document.createElement('li');
    prevLi.className = `page-item ${meta.current_page === 1 ? 'disabled' : ''}`;
    prevLi.innerHTML = `<a class="page-link" href="#"><i class="bi bi-chevron-left"></i></a>`;
    if (meta.current_page > 1) {
      prevLi.addEventListener('click', (e) => { e.preventDefault(); fetchTasks(meta.current_page - 1); });
    }
    paginationContainer.appendChild(prevLi);

    // Page numbers
    for (let i = 1; i <= lastPage; i++) {
      const li = document.createElement('li');
      li.className = `page-item ${meta.current_page === i ? 'active' : ''}`;
      li.innerHTML = `<a class="page-link" href="#">${i}</a>`;
      li.addEventListener('click', (e) => { e.preventDefault(); fetchTasks(i); });
      paginationContainer.appendChild(li);
    }

    // Next Button
    const nextLi = document.createElement('li');
    nextLi.className = `page-item ${meta.current_page === lastPage ? 'disabled' : ''}`;
    nextLi.innerHTML = `<a class="page-link" href="#"><i class="bi bi-chevron-right"></i></a>`;
    if (meta.current_page < lastPage) {
      nextLi.addEventListener('click', (e) => { e.preventDefault(); fetchTasks(meta.current_page + 1); });
    }
    paginationContainer.appendChild(nextLi);
  }

  // Handle permanent delete task (single)
  function handleDeleteTask(id, name) {
    Swal.fire({
      title: 'Permanently Delete?',
      text: `Are you sure you want to permanently delete "${name}"? This action cannot be undone and will erase all payroll associations!`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Yes, delete permanently'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          Swal.showLoading();
          const res = await fetch(`${API_URL}/tasks/${id}/force`, {
            method: 'DELETE',
            headers
          });
          const data = await res.json();
          Swal.close();
          if (data.success) {
            Swal.fire('Permanently Deleted!', 'Task has been deleted permanently.', 'success');
            fetchTasks(currentPage);
          } else {
            Swal.fire('Failed', data.message || 'Failed to delete task', 'error');
          }
        } catch (e) {
          Swal.close();
          Swal.fire('Error', 'Network error occurred.', 'error');
        }
      }
    });
  }

  // Bulk Actions Logic
  function updateBulkActionsPanel() {
    if (!bulkActionsPanel || !bulkSelectedCount) return;
    
    const count = selectedTaskIds.size;
    if (count > 0) {
      bulkSelectedCount.textContent = `${count} tasks selected`;
      bulkActionsPanel.classList.remove('d-none');
    } else {
      bulkActionsPanel.classList.add('d-none');
    }

    // Update checkAllTasks checkstate
    const rowCheckboxes = tasksTableBody.querySelectorAll('.task-checkbox');
    if (rowCheckboxes.length > 0) {
      const allChecked = Array.from(rowCheckboxes).every(cb => cb.checked);
      checkAllTasks.checked = allChecked;
    } else {
      checkAllTasks.checked = false;
    }
  }

  function handleCheckAllChange(e) {
    const isChecked = e.target.checked;
    const rowCheckboxes = tasksTableBody.querySelectorAll('.task-checkbox');
    
    rowCheckboxes.forEach(cb => {
      cb.checked = isChecked;
      const taskId = parseInt(cb.getAttribute('data-id'));
      if (isChecked) {
        selectedTaskIds.add(taskId);
      } else {
        selectedTaskIds.delete(taskId);
      }
    });

    updateBulkActionsPanel();
  }

  function handleBulkRestoreClick() {
    Swal.fire({
      title: 'Restore Selected?',
      text: `Are you sure you want to restore the ${selectedTaskIds.size} selected tasks?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#198754',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Yes, restore all'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          Swal.showLoading();
          const res = await fetch(`${API_URL}/tasks/bulk-restore`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              task_ids: Array.from(selectedTaskIds)
            })
          });
          const data = await res.json();
          Swal.close();

          if (data.success) {
            Swal.fire('Restored!', 'Tasks have been restored successfully.', 'success');
            fetchTasks(currentPage);
          } else {
            Swal.fire('Failed', data.message || 'Failed to restore tasks.', 'error');
          }
        } catch (err) {
          Swal.close();
          Swal.fire('Error', 'Network error occurred.', 'error');
        }
      }
    });
  }

  function handleBulkPermanentDeleteClick() {
    Swal.fire({
      title: 'Permanently Delete Selected?',
      text: `Are you sure you want to permanently delete the ${selectedTaskIds.size} selected tasks? This action cannot be undone!`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Yes, delete permanently'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          Swal.showLoading();
          const res = await fetch(`${API_URL}/tasks/bulk-delete`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              task_ids: Array.from(selectedTaskIds),
              permanent: true
            })
          });
          const data = await res.json();
          Swal.close();

          if (data.success) {
            Swal.fire('Permanently Deleted!', 'Selected tasks have been deleted permanently.', 'success');
            fetchTasks(currentPage);
          } else {
            Swal.fire('Failed', data.message || 'Failed to permanently delete tasks.', 'error');
          }
        } catch (err) {
          Swal.close();
          Swal.fire('Error', 'Network error occurred.', 'error');
        }
      }
    });
  }

  // Utilities
  function capitalizeFirstLetter(string) {
    if (!string) return '';
    return string.charAt(0).toUpperCase() + string.slice(1);
  }
})();
