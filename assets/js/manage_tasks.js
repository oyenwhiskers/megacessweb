// Manage Tasks Dashboard Controller
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
  let allWorkers = [];
  let allLocations = [];
  let currentTaskCategories = []; // Categories for the selected task type
  let assignedWorkerRows = [];   // Array of { staff_id, staff_name } currently added to form
  let currentPage = 1;
  let selectedTaskIds = new Set(); // Multi-select bulk actions state

  // DOM Elements
  const taskListView = document.getElementById('taskListView');
  const logTaskFormView = document.getElementById('logTaskFormView');
  const pageTitleText = document.getElementById('pageTitleText');
  const directTaskForm = document.getElementById('directTaskForm');

  // Table & Filter elements
  const searchTaskName = document.getElementById('searchTaskName');
  const filterDate = document.getElementById('filterDate');
  const filterLocation = document.getElementById('filterLocation');
  const filterType = document.getElementById('filterType');
  const filterStatus = document.getElementById('filterStatus');
  const btnClearFilters = document.getElementById('btnClearFilters');
  const tasksTableBody = document.getElementById('tasksTableBody');
  const paginationInfo = document.getElementById('paginationInfo');
  const paginationContainer = document.getElementById('paginationContainer');

  // Bulk Actions
  const checkAllTasks = document.getElementById('checkAllTasks');
  const bulkActionsPanel = document.getElementById('bulkActionsPanel');
  const bulkSelectedCount = document.getElementById('bulkSelectedCount');
  const bulkStatusSelect = document.getElementById('bulkStatusSelect');
  const btnBulkDelete = document.getElementById('btnBulkDelete');

  // Form elements
  const taskDate = document.getElementById('taskDate');
  const taskLocation = document.getElementById('taskLocation');
  const taskType = document.getElementById('taskType');
  const taskName = document.getElementById('taskName');
  const workerSelectInput = document.getElementById('workerSelectInput');
  const workerDatalist = document.getElementById('workerDatalist');
  const btnAddWorkerRow = document.getElementById('btnAddWorkerRow');
  const workerRowsContainer = document.getElementById('workerRowsContainer');
  const emptyWorkersPlaceholder = document.getElementById('emptyWorkersPlaceholder');

  // Trigger loading
  document.addEventListener('DOMContentLoaded', initializePage);

  async function initializePage() {
    // Set default date to today
    taskDate.value = new Date().toISOString().split('T')[0];

    // Load locations, staff, and task types dynamically
    await Promise.all([
      fetchLocations(),
      fetchStaff(),
      fetchTaskTypes()
    ]);

    // Load initial tasks table
    fetchTasks(1);

    // Event listeners
    document.getElementById('btnShowCreateForm').addEventListener('click', showCreateForm);
    document.getElementById('btnBackToTasks').addEventListener('click', hideCreateForm);
    document.getElementById('btnCancelForm').addEventListener('click', hideCreateForm);
    
    // Filters
    let searchTimeout;
    searchTaskName.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        fetchTasks(1);
      }, 300);
    });
    filterDate.addEventListener('change', () => fetchTasks(1));
    filterLocation.addEventListener('change', () => fetchTasks(1));
    filterType.addEventListener('change', () => fetchTasks(1));
    filterStatus.addEventListener('change', () => fetchTasks(1));
    btnClearFilters.addEventListener('click', clearFilters);

    // Bulk Actions Event Listeners
    if (checkAllTasks) {
      checkAllTasks.addEventListener('change', handleCheckAllChange);
    }
    if (bulkStatusSelect) {
      bulkStatusSelect.addEventListener('change', handleBulkStatusChange);
    }
    if (btnBulkDelete) {
      btnBulkDelete.addEventListener('click', handleBulkDeleteClick);
    }

    // Form Events
    taskLocation.addEventListener('change', generateTaskNameSuggestion);
    taskType.addEventListener('change', handleTaskTypeChange);
    btnAddWorkerRow.addEventListener('click', addWorkerRow);
    directTaskForm.addEventListener('submit', handleTaskSubmission);
  }

  // Fetch Task Types dynamically from payment-rates
  async function fetchTaskTypes() {
    try {
      const res = await fetch(`${API_URL}/payment-rates?_=${Date.now()}`, { headers });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        // Clear existing options (except the first placeholder)
        filterType.innerHTML = '<option value="">All Types</option>';
        taskType.innerHTML = '<option value="" disabled selected>Select type...</option>';

        data.data.forEach(rate => {
          const opt1 = document.createElement('option');
          opt1.value = rate.task_type;
          opt1.textContent = rate.task_name;
          filterType.appendChild(opt1);

          const opt2 = document.createElement('option');
          opt2.value = rate.task_type;
          opt2.textContent = rate.task_name;
          taskType.appendChild(opt2);
        });
      }
    } catch (e) {
      console.error('Failed to load dynamic task types from payment-rates API', e);
    }
  }

  // Show/Hide views
  function showCreateForm() {
    taskListView.style.display = 'none';
    logTaskFormView.style.display = 'block';
    pageTitleText.textContent = 'Log Completed Task';
    resetForm();
  }

  function hideCreateForm() {
    taskListView.style.display = 'block';
    logTaskFormView.style.display = 'none';
    pageTitleText.textContent = 'Manage Tasks';
    fetchTasks(currentPage);
  }

  function resetForm() {
    directTaskForm.reset();
    taskDate.value = new Date().toISOString().split('T')[0];
    workerRowsContainer.innerHTML = '';
    workerRowsContainer.appendChild(emptyWorkersPlaceholder);
    assignedWorkerRows = [];
    currentTaskCategories = [];
    if (workerSelectInput) workerSelectInput.value = '';
    if (workerDatalist) workerDatalist.innerHTML = '';
    populateWorkerDropdown();
  }

  // Populate options
  function populateWorkerDropdown() {
    if (!workerDatalist) return;
    workerDatalist.innerHTML = '';
    allWorkers.forEach(w => {
      // Don't show already added workers
      if (!assignedWorkerRows.some(row => row.staff_id === w.id)) {
        const opt = document.createElement('option');
        opt.value = w.staff_fullname || w.staff_name;
        workerDatalist.appendChild(opt);
      }
    });
  }

  // Fetch data
  async function fetchLocations() {
    try {
      const res = await fetch(`${API_URL}/locations`, { headers });
      const data = await res.json();
      if (data.success) {
        allLocations = data.data;
        // Populate filters and form selectors
        allLocations.forEach(loc => {
          const opt1 = document.createElement('option');
          opt1.value = loc.id;
          opt1.textContent = loc.name || loc.location_name;
          filterLocation.appendChild(opt1);

          const opt2 = document.createElement('option');
          opt2.value = loc.id;
          opt2.textContent = loc.name || loc.location_name;
          taskLocation.appendChild(opt2);
        });
      }
    } catch (e) {
      console.error('Failed to load locations', e);
    }
  }

  async function fetchStaff() {
    try {
      const res = await fetch(`${API_URL}/staff?per_page=1000&status=active`, { headers });
      const data = await res.json();
      if (data.success) {
        // Flatten staff data (it might be in paginated format or array)
        allWorkers = Array.isArray(data.data) ? data.data : (data.data.data || []);
        populateWorkerDropdown();
      }
    } catch (e) {
      console.error('Failed to load workers', e);
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
          <div class="spinner-border text-success" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
        </td>
      </tr>
    `;

    try {
      let url = `${API_URL}/tasks?page=${page}`;
      if (filterLocation.value) url += `&location_id=${filterLocation.value}`;
      if (filterType.value) url += `&task_type=${filterType.value}`;
      if (filterStatus.value) url += `&task_status=${filterStatus.value}`;
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
        tasksTableBody.innerHTML = `<tr><td colspan="9" class="text-center text-danger py-4">Failed to load tasks: ${data.message}</td></tr>`;
      }
    } catch (e) {
      tasksTableBody.innerHTML = `<tr><td colspan="9" class="text-center text-danger py-4">Network error loading tasks history.</td></tr>`;
      console.error(e);
    }
  }

  function clearFilters() {
    if (searchTaskName) searchTaskName.value = '';
    if (filterDate) filterDate.value = '';
    filterLocation.value = '';
    filterType.value = '';
    filterStatus.value = '';
    fetchTasks(1);
  }

  // Suggestions helper
  function generateTaskNameSuggestion() {
    if (!taskType.value || !taskLocation.value) return;
    const selectedLoc = allLocations.find(l => l.id == taskLocation.value);
    const locName = selectedLoc ? (selectedLoc.name || selectedLoc.location_name) : '';
    const typeLabel = taskType.options[taskType.selectedIndex].text.split(' ')[0];
    const blockPrefix = locName.toLowerCase().startsWith('block') ? '' : 'Block ';
    taskName.value = `${typeLabel} at ${blockPrefix}${locName} (${taskDate.value})`;
  }

  // Handle task type change (fetch corresponding rate categories)
  async function handleTaskTypeChange() {
    generateTaskNameSuggestion();

    const selectedType = taskType.value;
    if (!selectedType) return;

    // Load payment rate categories for this task type
    try {
      const res = await fetch(`${API_URL}/tasks/audits/categories?task_type=${selectedType}&_=${Date.now()}`, { headers });
      const data = await res.json();
      if (data.success) {
        currentTaskCategories = data.data;
        // Re-generate headers/rows for added workers
        rebuildWorkerRows();
      }
    } catch (e) {
      console.error('Failed to load categories', e);
      Swal.fire('Error', 'Failed to load task rate categories', 'error');
    }
  }

  // Render list of tasks
  function renderTasksTable(tasks) {
    if (tasks.length === 0) {
      tasksTableBody.innerHTML = `<tr><td colspan="9" class="text-center py-4 text-muted">No tasks found.</td></tr>`;
      return;
    }

    tasksTableBody.innerHTML = '';
    tasks.forEach(task => {
      const typeLabel = capitalizeFirstLetter(task.taskType);
      const statusClass = (task.taskStatus || 'in_progress').toLowerCase();
      const statusLabel = capitalizeFirstLetter(statusClass.replace('_', ' '));
      const formattedDate = task.taskDate ? new Date(task.taskDate).toLocaleDateString('en-GB') : '-';

      const createdByName = task.createdBy ? task.createdBy.name : '-';
      const assignedWorkers = task.workers && task.workers.length > 0 
        ? task.workers.map(w => w.fullName).join(', ') 
        : '-';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><input type="checkbox" class="form-check-input task-checkbox" data-id="${task.id}" ${selectedTaskIds.has(task.id) ? 'checked' : ''}></td>
        <td class="fw-semibold">${formattedDate}</td>
        <td><span class="badge bg-light text-dark border p-2">${task.location ? task.location.name : '-'}</span></td>
        <td class="fw-semibold text-success">${task.taskName || '-'}</td>
        <td>${typeLabel}</td>
        <td>${createdByName}</td>
        <td><small class="text-muted">${assignedWorkers}</small></td>
        <td>
          <select class="form-select form-select-sm rounded-pill status-select" data-id="${task.id}" style="width: 140px; font-size: 0.8rem; font-weight: 550; cursor: pointer;">
            <option value="in_progress" ${statusClass === 'in_progress' ? 'selected' : ''}>In Progress</option>
            <option value="pending" ${statusClass === 'pending' ? 'selected' : ''}>Pending Audit</option>
            <option value="completed" ${statusClass === 'completed' ? 'selected' : ''}>Completed</option>
            <option value="rejected" ${statusClass === 'rejected' ? 'selected' : ''}>Rejected</option>
          </select>
        </td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-danger rounded-pill px-3 delete-task-btn" data-id="${task.id}">
            <i class="bi bi-trash me-1"></i>Delete
          </button>
        </td>
      `;

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

      tr.querySelector('.status-select').addEventListener('change', async (e) => {
        const newStatus = e.target.value;
        try {
          Swal.showLoading();
          const res = await fetch(`${API_URL}/tasks/${task.id}/status`, {
            method: 'PUT',
            headers,
            body: JSON.stringify({ task_status: newStatus })
          });
          const data = await res.json();
          Swal.close();
          if (data.success) {
            Swal.fire({
              title: 'Success!',
              text: 'Task status updated successfully.',
              icon: 'success',
              timer: 1500,
              showConfirmButton: false
            });
            fetchTasks(currentPage);
          } else {
            Swal.fire('Error', data.message || 'Failed to update task status.', 'error');
            e.target.value = task.taskStatus;
          }
        } catch (err) {
          Swal.close();
          console.error(err);
          Swal.fire('Error', 'Network error occurred.', 'error');
          e.target.value = task.taskStatus;
        }
      });

      tasksTableBody.appendChild(tr);
    });
  }

  // Handle delete task
  function handleDeleteTask(id, name) {
    Swal.fire({
      title: 'Delete Task?',
      text: `How would you like to delete "${name}"?`,
      icon: 'warning',
      showCancelButton: true,
      showDenyButton: true,
      confirmButtonText: 'Move to Trash Bin',
      denyButtonText: 'Delete Permanently',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#198754',
      denyButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          Swal.showLoading();
          const res = await fetch(`${API_URL}/tasks/${id}`, {
            method: 'DELETE',
            headers
          });
          const data = await res.json();
          Swal.close();
          if (data.success) {
            Swal.fire('Soft Deleted!', 'Task has been moved to Trash Bin.', 'success');
            fetchTasks(currentPage);
          } else {
            Swal.fire('Failed', data.message || 'Failed to delete task', 'error');
          }
        } catch (e) {
          Swal.close();
          Swal.fire('Error', 'Network error occurred.', 'error');
        }
      } else if (result.isDenied) {
        try {
          Swal.showLoading();
          const res = await fetch(`${API_URL}/tasks/${id}?permanent=true`, {
            method: 'DELETE',
            headers
          });
          const data = await res.json();
          Swal.close();
          if (data.success) {
            Swal.fire('Permanently Deleted!', 'Task has been deleted permanently.', 'success');
            fetchTasks(currentPage);
          } else {
            Swal.fire('Failed', data.message || 'Failed to permanently delete task', 'error');
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

  // Dynamic worker management
  function addWorkerRow() {
    const selectedName = workerSelectInput ? workerSelectInput.value.trim() : '';
    if (!selectedName) {
      Swal.fire('Alert', 'Please type or select a worker first', 'warning');
      return;
    }

    if (!taskType.value) {
      Swal.fire('Alert', 'Please select a task type first', 'warning');
      return;
    }

    const selectedStaff = allWorkers.find(w => {
      const name = w.staff_fullname || w.staff_name;
      return name && name.toLowerCase() === selectedName.toLowerCase();
    });

    if (!selectedStaff) {
      Swal.fire('Alert', 'Worker not found. Please select a valid worker from the suggestions.', 'warning');
      return;
    }

    // Check if worker is already added
    if (assignedWorkerRows.some(row => row.staff_id === selectedStaff.id)) {
      Swal.fire('Alert', 'Worker is already added.', 'warning');
      return;
    }

    // Add to state
    assignedWorkerRows.push({
      staff_id: selectedStaff.id,
      staff_name: selectedStaff.staff_fullname || selectedStaff.staff_name
    });

    // Clear the input field
    if (workerSelectInput) workerSelectInput.value = '';

    // Refresh display
    rebuildWorkerRows();
    populateWorkerDropdown();
  }

  function removeWorkerRow(staffId) {
    assignedWorkerRows = assignedWorkerRows.filter(r => r.staff_id !== staffId);
    rebuildWorkerRows();
    populateWorkerDropdown();
  }

  // Render rows based on added workers and current categories
  function rebuildWorkerRows() {
    if (assignedWorkerRows.length === 0) {
      workerRowsContainer.innerHTML = '';
      workerRowsContainer.appendChild(emptyWorkersPlaceholder);
      return;
    }

    // Clear placeholder
    workerRowsContainer.innerHTML = '';

    assignedWorkerRows.forEach(row => {
      const rowDiv = document.createElement('div');
      rowDiv.className = 'worker-entry-row';
      rowDiv.setAttribute('data-staff-id', row.staff_id);

      // Create head row (Worker Name & Remove button)
      let rowHtml = `
        <div class="d-flex justify-content-between align-items-center mb-3">
          <span class="fw-bold text-dark"><i class="bi bi-person-fill me-2 text-success"></i>${row.staff_name}</span>
          <button type="button" class="btn btn-sm btn-outline-danger rounded-pill px-3 btn-remove-row" data-id="${row.staff_id}">
            <i class="bi bi-x-circle me-1"></i>Remove
          </button>
        </div>
      `;

      // Create columns for rate category inputs
      if (currentTaskCategories.length === 0) {
        rowHtml += `<p class="text-muted small mb-0">No specific rate categories defined for this task type. Quantity will count as standard 1 unit.</p>`;
      } else {
        rowHtml += `<div class="row g-2">`;
        currentTaskCategories.forEach(cat => {
          rowHtml += `
            <div class="col-md-3 col-sm-6 mb-2">
              <label class="form-label small fw-semibold text-muted mb-1">${cat.category_name} (${cat.unit || 'unit'})</label>
              <input type="number" step="any" min="0" class="form-control form-control-sm rounded-3 category-input" 
                     data-category-id="${cat.id}" placeholder="0">
            </div>
          `;
        });
        rowHtml += `</div>`;
      }

      rowDiv.innerHTML = rowHtml;
      rowDiv.querySelector('.btn-remove-row').addEventListener('click', () => removeWorkerRow(row.staff_id));
      workerRowsContainer.appendChild(rowDiv);
    });
  }

  // Handle Form Submission
  async function handleTaskSubmission(e) {
    e.preventDefault();

    if (!directTaskForm.checkValidity()) {
      e.stopPropagation();
      directTaskForm.classList.add('was-validated');
      return;
    }

    if (assignedWorkerRows.length === 0) {
      Swal.fire('Alert', 'Please assign at least one worker to this task.', 'warning');
      return;
    }

    // Build the payload
    const workersPayload = [];
    let hasValidQuantities = false;

    for (let i = 0; i < assignedWorkerRows.length; i++) {
      const worker = assignedWorkerRows[i];
      const workerRowEl = workerRowsContainer.querySelector(`.worker-entry-row[data-staff-id="${worker.staff_id}"]`);
      
      const meta = {};
      const inputs = workerRowEl.querySelectorAll('.category-input');

      inputs.forEach(input => {
        const catId = input.getAttribute('data-category-id');
        const val = parseFloat(input.value);
        if (!isNaN(val) && val > 0) {
          meta[catId] = val;
          hasValidQuantities = true;
        }
      });

      // For tasks without categories or if none specified, default to 1 standard unit
      if (Object.keys(meta).length === 0) {
        // Look for the first category ID if available
        if (currentTaskCategories.length > 0) {
          meta[currentTaskCategories[0].id] = 1.0;
          hasValidQuantities = true;
        } else {
          // If no categories exist, we pass standard empty object (handles planting/custom defaults)
          hasValidQuantities = true; 
        }
      }

      workersPayload.push({
        staff_id: worker.staff_id,
        meta: meta
      });
    }

    if (!hasValidQuantities) {
      Swal.fire('Alert', 'Please enter at least one quantity for the assigned workers.', 'warning');
      return;
    }

    const payload = {
      location_id: parseInt(taskLocation.value),
      task_name: taskName.value,
      task_type: taskType.value,
      task_date: taskDate.value,
      workers: workersPayload
    };

    // Send payload
    try {
      Swal.showLoading();
      const res = await fetch(`${API_URL}/tasks/admin-create-completed`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      Swal.close();

      if (data.success) {
        Swal.fire({
          title: 'Success!',
          text: 'Completed task logged successfully.',
          icon: 'success',
          confirmButtonColor: '#0f6b4f'
        }).then(() => {
          hideCreateForm();
        });
      } else {
        Swal.fire('Submission Failed', data.message || 'Could not save completed task.', 'error');
      }
    } catch (err) {
      Swal.close();
      console.error(err);
      Swal.fire('Error', 'Network error occurred while submitting task.', 'error');
    }
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

  async function handleBulkStatusChange(e) {
    const newStatus = e.target.value;
    if (!newStatus) return;

    Swal.fire({
      title: 'Update Status?',
      text: `Update status of ${selectedTaskIds.size} selected tasks to "${capitalizeFirstLetter(newStatus.replace('_', ' '))}"?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#0f6b4f',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Yes, update all'
    }).then(async (result) => {
      // Reset dropdown value
      bulkStatusSelect.value = '';

      if (result.isConfirmed) {
        try {
          Swal.showLoading();
          const res = await fetch(`${API_URL}/tasks/bulk-status`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              task_ids: Array.from(selectedTaskIds),
              task_status: newStatus
            })
          });
          const data = await res.json();
          Swal.close();

          if (data.success) {
            Swal.fire('Success', 'Selected tasks updated successfully.', 'success');
            fetchTasks(currentPage);
          } else {
            Swal.fire('Failed', data.message || 'Failed to update tasks status.', 'error');
          }
        } catch (err) {
          Swal.close();
          console.error(err);
          Swal.fire('Error', 'Network error occurred.', 'error');
        }
      }
    });
  }

  function handleBulkDeleteClick() {
    Swal.fire({
      title: 'Delete Selected Tasks?',
      text: `How would you like to delete the ${selectedTaskIds.size} selected tasks?`,
      icon: 'warning',
      showCancelButton: true,
      showDenyButton: true,
      confirmButtonText: 'Move to Trash Bin',
      denyButtonText: 'Delete Permanently',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#198754',
      denyButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d'
    }).then(async (result) => {
      if (result.isConfirmed) {
        // Soft delete bulk
        try {
          Swal.showLoading();
          const res = await fetch(`${API_URL}/tasks/bulk-delete`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              task_ids: Array.from(selectedTaskIds),
              permanent: false
            })
          });
          const data = await res.json();
          Swal.close();

          if (data.success) {
            Swal.fire('Deleted!', 'Tasks have been moved to Trash Bin.', 'success');
            fetchTasks(currentPage);
          } else {
            Swal.fire('Failed', data.message || 'Failed to delete tasks.', 'error');
          }
        } catch (err) {
          Swal.close();
          Swal.fire('Error', 'Network error occurred.', 'error');
        }
      } else if (result.isDenied) {
        // Permanent delete bulk
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
