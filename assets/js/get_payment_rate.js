const API_URL = "https://mwms.megacess.com/api/v1/payment-rates";

/* -------------------- Token Helper -------------------- */
function getToken() {
  const keys = ['authToken', 'auth_token', 'token', 'access_token'];
  for (const k of keys) {
    const v = localStorage.getItem(k) || sessionStorage.getItem(k);
    if (v) return v;
  }
  console.warn(" No token found in storage");
  return null;
}

/* -------------------- Fetch Payment Rates -------------------- */
async function getPaymentRates() {
  const token = getToken();
  if (!token) {
    console.error("Token not found. Please ensure user is authenticated.");
    Swal.fire({
      icon: "error",
      title: "Authentication Required!",
      text: "Please login first before proceeding.",
      confirmButtonText: "Log in now."
    }).then((result) => {
      if (result.isConfirmed){
        window.location.href = "/megacessweb/assets/pages/log-in.html"
      }
    });
    return;
  }

  // Show skeleton loaders
  const $list = $('#taskList');
  const skeletonHtml = Array(5).fill(0).map(() => `
    <li class="list-group-item d-flex justify-content-between align-items-center">
      <div class="skeleton skeleton-text" style="width: 60%; height: 18px;"></div>
      <div class="skeleton skeleton-badge" style="width: 80px; height: 24px; border-radius: 12px;"></div>
    </li>
  `).join('');
  $list.html(skeletonHtml);
  $('#workSection .task-editor .card-body').html('<div class="text-center py-5"><div class="skeleton skeleton-text mx-auto" style="width: 80%; height: 200px;"></div></div>');

  try {
    const res = await fetch(API_URL, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/json",
        "Content-Type": "application/json"
      }
    });

    if (!res.ok) throw new Error(`Failed to fetch (${res.status})`);

    const json = await res.json();
    console.log(" Payment rates response:", json);

    if (json.success && Array.isArray(json.data)) {
      renderTaskList(json.data);
    } else {
      console.warn(" Invalid data format from API");
    }
  } catch (err) {
    console.error(" Error fetching payment rates:", err);
  }
}

/* -------------------- Render Left Panel (Task List) -------------------- */
function renderTaskList(tasks) {
  const $list = $('#taskList');
  if ($list.length === 0) {
    console.error(" Missing #taskList container in HTML");
    return;
  }

  $list.empty();

  if (!tasks || tasks.length === 0) {
    $list.append('<li class="list-group-item text-center text-muted">No tasks found</li>');
    return;
  }

  tasks.forEach((task, index) => {
    const activeClass = index === 0 ? 'active' : '';
    const firstCategory = task.categories?.[0];
    const categoryCount = task.categories?.length || 0;

    const item = `
      <li class="list-group-item d-flex justify-content-between align-items-center ${activeClass}" 
          data-id="${task.id}">
        <div>
          <span>${task.task_name}</span>
        </div>
        <span class="badge bg-secondary ms-2" style="font-size: 0.75rem;">${categoryCount} ${categoryCount === 1 ? 'category' : 'categories'}</span>
      </li>
    `;

    $list.append(item);
  });

  // Load first task details
  renderTaskEditor(tasks[0]);

  // Handle click
  $list.off('click', 'li').on('click', 'li', function () {
    $list.find('li').removeClass('active');
    $(this).addClass('active');
    const id = $(this).data('id');
    const selected = tasks.find(t => t.id === id);
    if (selected) renderTaskEditor(selected);
  });
}

/* -------------------- Render Right Panel (Task Editor/Preview + Edit Mode) -------------------- */
function renderTaskEditor(task) {
  const $editor = $('#workSection .task-editor .card-body');
  if (!$editor.length || !task) return;

  let categoryHtml = '';
  if (Array.isArray(task.categories)) {
    categoryHtml = task.categories.map((c, i) => {
      // --- FIX: extract condition values from c.conditions (backend format) ---
      const cond = c.conditions || {};
      // detect first min_/max_ key to derive type suffix, Option A: map to suffix
      let condType = '';
      for (const key of Object.keys(cond)) {
        if (key.startsWith('min_')) { condType = key.replace(/^min_/, ''); break; }
        if (key.startsWith('max_')) { condType = key.replace(/^max_/, ''); break; }
      }
      const minVal = condType ? (cond[`min_${condType}`] ?? '') : '';
      const maxVal = condType ? (cond[`max_${condType}`] ?? '') : '';
      const condUnit = (cond && cond.unit) ? cond.unit : (c.unit || '');

      // keep the same HTML structure and classes as your original UI
      return `
      <div class="border rounded p-3 mb-3 category-block" 
           data-index="${i}" 
           data-category='${JSON.stringify(c)}'>

        <!-- Category Header -->
        <div class="d-flex justify-content-between align-items-center mb-2">
          <strong>${c.category_name || 'Unnamed Category'}</strong>
          <div class="d-flex align-items-center gap-2">
            <span class="fw-semibold">${c.rate ?? 0} ${c.unit || ''}</span>
            <button class="btn btn-sm btn-danger remove-category-btn" type="button" title="Remove category">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </div>

        <div class="mb-2 small text-muted">
          <strong>Category ID:</strong> ${c.id || 'N/A'}
        </div>

        <!-- Row 1: Rate and Unit -->
        <div class="row">
          <div class="col-md-6 mb-2">
            <label class="form-label" data-bs-toggle="tooltip" data-bs-placement="top" title="The payment amount for this category">
              Rate <i class="bi bi-info-circle text-muted ms-1"></i>
            </label>
            <input type="number" class="form-control category-rate" value="${c.rate ?? ''}" disabled>
          </div>
          <div class="col-md-6 mb-2">
            <label class="form-label" data-bs-toggle="tooltip" data-bs-placement="top" title="Unit of measurement (e.g., per kg, per hour, per tree)">
              Unit <i class="bi bi-info-circle text-muted ms-1"></i>
            </label>
            <input type="text" class="form-control category-unit" value="${c.unit ?? ''}" disabled>
          </div>
        </div>

        <!-- Row 2: Condition Fields (Type, Min, Max, Condition Unit) -->
        <div class="row">
          <div class="col-md-3 mb-2">
            <label class="form-label" data-bs-toggle="tooltip" data-bs-placement="top" title="Type of condition (e.g., weight, quantity, area, fruit)">
              Type <i class="bi bi-info-circle text-muted ms-1"></i>
            </label>
            <!-- keep as a text input (you requested free-text type) -->
            <input type="text" class="form-control category-type" value="${condType || ''}" disabled>
          </div>
          <div class="col-md-3 mb-2">
            <label class="form-label" data-bs-toggle="tooltip" data-bs-placement="top" title="Minimum value for this condition range">
              Min Value <i class="bi bi-info-circle text-muted ms-1"></i>
            </label>
            <input type="number" class="form-control category-min" value="${minVal}" disabled>
          </div>
          <div class="col-md-3 mb-2">
            <label class="form-label" data-bs-toggle="tooltip" data-bs-placement="top" title="Maximum value for this condition range">
              Max Value <i class="bi bi-info-circle text-muted ms-1"></i>
            </label>
            <input type="number" class="form-control category-max" value="${maxVal}" disabled>
          </div>
          <div class="col-md-3 mb-2">
            <label class="form-label" data-bs-toggle="tooltip" data-bs-placement="top" title="Unit for the condition values (e.g., kg, pcs, m²)">
              Condition Unit <i class="bi bi-info-circle text-muted ms-1"></i>
            </label>
            <input type="text" class="form-control category-condition-unit" value="${condUnit}" disabled>
          </div>
        </div>

        <!-- Row 3: Display Order -->
        <div class="row">
          <div class="col-md-12 mb-2">
            <label class="form-label" data-bs-toggle="tooltip" data-bs-placement="top" title="Order in which this category appears in the list (starts with 0,1,2...)">
              Display Order <i class="bi bi-info-circle text-muted ms-1"></i>
            </label>
            <input type="number" class="form-control category-order" value="${c.display_order ?? ''}" disabled>
          </div>
        </div>
      </div>
    `}).join('');
  }

  const html = `
    <div>
      <div class="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h5 class="mb-1">Edit Payment Rate</h5>
          <div class="small text-muted">Payment Rate ID: <strong>${task.id || 'N/A'}</strong></div>
        </div>
        <div class="d-flex gap-2">
          <button class="btn btn-sm btn-danger py-1 px-3" id="deleteBtn">
            <i class="bi bi-trash-fill"></i> Delete
            </button>
          <button class="btn btn-sm btn-success py-1 px-3" id="editToggleBtn"> 
            <i class="bi bi-pencil-square"></i> Edit
            </button>
        </div>

      </div>

      <div class="mb-3">
        <label class="form-label fw-semibold" data-bs-toggle="tooltip" data-bs-placement="top" title="Name of the work task or job type">
          Task Name <i class="bi bi-info-circle text-muted ms-1"></i>
        </label>
        <input type="text" class="form-control" id="taskName" value="${task.task_name || ''}" readonly>
      </div>

      <!-- <div class="form-check form-switch mb-3">
        <input class="form-check-input" type="checkbox" id="isActive" ${task.is_active ? 'checked' : ''} disabled>
        <label class="form-check-label" for="isActive">Active</label>
      </div> -->

      <div class="mb-3">
        <label class="form-label fw-semibold" data-bs-toggle="tooltip" data-bs-placement="top" title="Additional details about this payment rate">
          Description <i class="bi bi-info-circle text-muted ms-1"></i>
        </label>
        <textarea class="form-control" id="description" rows="3" readonly>${task.description || ''}</textarea>
      </div>

      <div class="mb-3">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <label class="form-label fw-bold mb-0">Categories & Rates</label>
          <button class="btn btn-sm btn-success py-1 px-3" id="addCategoryBtn" type="button">
            <i class="bi bi-plus-circle me-1"></i> Add Category
          </button>
        </div>
        ${categoryHtml || '<p class="text-muted">No categories defined</p>'}
      </div>

      <div class="text-end">
        <button class="btn btn-success d-none" id="saveChangesBtn">Save Changes</button>
      </div>
    </div>
  `;

  $editor.html(html);

  // Delete button
  $('#deleteBtn').off('click').on('click', function () {
    deletePaymentRate(task.id);
  });

  // Toggle edit mode (keep your original behavior exactly)
  $('#editToggleBtn').off('click').on('click', function () {
    const isEditing = $(this).data('editing') || false;

    if (!isEditing) {
      $(this).text('Cancel').data('editing', true);
      $('#saveChangesBtn').removeClass('d-none');
      $editor.find('input, textarea').removeAttr('readonly').removeAttr('disabled');
    } else {
      $(this).text('Edit').data('editing', false);
      $('#saveChangesBtn').addClass('d-none');
      $editor.find('input, textarea').attr('readonly', true);
      $editor.find('input[type="checkbox"], input[type="number"], input[type="text"]').attr('disabled', true);
      renderTaskEditor(task);
    }
  });

  // Save button wiring (unchanged)
  $('#saveChangesBtn').off('click').on('click', async function () {
    const updatedData = collectFormData(task.id);
    console.log("Updating payment rate:", updatedData);
    await updatePaymentRate(task.id, updatedData);
  });

  // Initialize Bootstrap tooltips after DOM is updated
  setTimeout(() => {
    // Dispose of any existing tooltips first
    $editor.find('[data-bs-toggle="tooltip"]').each(function() {
      const existingTooltip = bootstrap.Tooltip.getInstance(this);
      if (existingTooltip) {
        existingTooltip.dispose();
      }
    });
    
    // Initialize new tooltips
    $editor.find('[data-bs-toggle="tooltip"]').each(function() {
      new bootstrap.Tooltip(this, {
        trigger: 'hover'
      });
    });
  }, 100);

  // Add Category trigger
  $('#addCategoryBtn').off('click').on('click', function () {
    openAddCategoryModal((newCat) => {
      appendNewCategoryBlock(newCat);
    });
  });

  // Remove Category button handler (using event delegation for dynamically added elements)
  $editor.off('click', '.remove-category-btn').on('click', '.remove-category-btn', function () {
    const $block = $(this).closest('.category-block');
    const categoryData = JSON.parse($block.attr('data-category') || '{}');
    const categoryName = categoryData.category_name || 'this category';
    const categoryId = categoryData.id;

    // If category has an ID, it exists in backend - call API to delete
    if (categoryId) {
      if (typeof deletePaymentRateCategory === 'function') {
        deletePaymentRateCategory(task.id, categoryId);
      } else {
        console.error('deletePaymentRateCategory function not found');
      }
    } else {
      // If no ID, it's a newly added category not yet saved - just remove from UI
      Swal.fire({
        title: 'Remove Category?',
        text: `Are you sure you want to remove "${categoryName}"? This action cannot be undone.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Yes, remove it',
        cancelButtonText: 'Cancel'
      }).then((result) => {
        if (result.isConfirmed) {
          $block.remove();
          Swal.fire({
            icon: 'success',
            title: 'Removed!',
            text: 'Category has been removed from the form.',
            timer: 1500,
            showConfirmButton: false
          });
        }
      });
    }
  });
}

/* -------------------- Collect Form Data -------------------- */
function collectFormData(taskId) {
  const data = {
    task_name: $('#taskName').val(),
    description: $('#description').val(),
    is_active: true,
    categories: []
  };

  $('.category-block').each(function () {
    // original category object (if present)
    let original = {};
    try {
      original = JSON.parse($(this).attr('data-category') || '{}');
    } catch (e) {
      original = {};
    }

    // read UI fields (keep names/classes exactly as your UI)
    const rateVal = $(this).find('.category-rate').val();
    const unitVal = $(this).find('.category-unit').val();
    const orderVal = parseInt($(this).find('.category-order').val()) || 0;
    const catName = $(this).find('strong').first().text().trim() || original.category_name || '';
    const catKey = original.category_key || '';

    // IMPORTANT: read the free-text type exactly as the UI provides it
    const type = $(this).find('.category-type').val()?.trim() || '';
    const minRaw = $(this).find('.category-min').val();
    const maxRaw = $(this).find('.category-max').val();
    const condUnit = $(this).find('.category-condition-unit').val()?.trim() || '';

    // To build conditions according to:
    // if type === 'weight' -> min_weight, max_weight
    // if type === 'quantity' -> min_quantity, max_quantity
    // if type === 'area' -> min_area, max_area

    let conditions = null;
    if (type) {
      const c = {};
      if (minRaw !== "" && minRaw !== null && typeof minRaw !== 'undefined') {
        const parsed = parseFloat(minRaw);
        if (!Number.isNaN(parsed)) c[`min_${type}`] = parsed;
      }
      if (maxRaw !== "" && maxRaw !== null && typeof maxRaw !== 'undefined') {
        const parsed2 = parseFloat(maxRaw);
        if (!Number.isNaN(parsed2)) c[`max_${type}`] = parsed2;
      }
      if (condUnit) c['unit'] = condUnit;
      if (Object.keys(c).length > 0) conditions = c;
      else conditions = null;
    } else {
      conditions = null;
    }

    const category = {
      id: original.id ?? null,
      payment_rate_id: taskId,
      category_name: catName,
      category_key: catKey,
      rate: rateVal,
      unit: unitVal,
      display_order: orderVal,
      conditions: conditions
    };

    data.categories.push(category);
  });

  return data;
}

/* -------------------- PUT Request (Update Payment Rate) -------------------- */
async function updatePaymentRate(id, bodyData) {
  const token = getToken();
  if (!token) {
    console.error("Token not found. Please ensure user is authenticated.");
    Swal.fire({
      icon: "error",
      title: "Authentication Required!",
      text: "Please login first before proceeding.",
      confirmButtonText: "Log in now."
    }).then((result) => {
      if (result.isConfirmed){
        window.location.href = "/megacessweb/assets/pages/log-in.html"
      }
    });
    return;
  }

  try {
    const res = await fetch(`${API_URL}/${id}`, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(bodyData)
    });

    const json = await res.json();
    console.log("Update response:", json);

    if (json.success) {
      console.log("Payment rate updated successfully!");
      Swal.fire({
        icon: "success",
        title: "Payment rate updated successfully!",
        timer: 2500,
        timerProgressBar: true
      });
      getPaymentRates(); // reload list
    } else {
      console.log("Failed to update: " + json.message);
      console.warn("Update validation errors:", json.errors);
      Swal.fire({
        icon: "warning",
        title: "Failed to update",
        text: `${json.message}\n\n ${json.errors}`
      });
    }
  } catch (err) {
    console.error("Error updating payment rate:", err);
  }
}

/* -------------------- Add Category Modal -------------------- */
function ensureAddCategoryModalExists() {
  if ($('#addCategoryModal').length) return;

  const modalHtml = `
  <div class="modal fade" id="addCategoryModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-lg">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Add Category</h5>
          <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          <form id="addCategoryForm">
            <div class="row">
              <div class="col-12 mb-3">
                <label class="form-label" data-bs-toggle="tooltip" data-bs-placement="top" title="Name to identify this payment category">
                  Category Name <i class="bi bi-info-circle text-muted ms-1"></i>
                </label>
                <input type="text" id="new_category_name" class="form-control">
              </div>
            </div>

            <div class="row">
              <div class="col-md-4 mb-2">
                <label class="form-label" data-bs-toggle="tooltip" data-bs-placement="top" title="The payment amount for this category">
                  Rate <i class="bi bi-info-circle text-muted ms-1"></i>
                </label>
                <input type="number" step="any" id="new_category_rate" class="form-control">
              </div>
              <div class="col-md-4 mb-2">
                <label class="form-label" data-bs-toggle="tooltip" data-bs-placement="top" title="Unit of measurement (e.g., per kg, per hour, per tree)">
                  Unit <i class="bi bi-info-circle text-muted ms-1"></i>
                </label>
                <input type="text" id="new_category_unit" class="form-control">
              </div>
              <div class="col-md-4 mb-2">
                <label class="form-label" data-bs-toggle="tooltip" data-bs-placement="top" title="Order in which this category appears in the list">
                  Display Order <i class="bi bi-info-circle text-muted ms-1"></i>
                </label>
                <input type="number" id="new_category_order" class="form-control" value="0">
              </div>
            </div>
            <hr>

            <div class="row mb-2">
              <h6 class="mb-3">Condition (optional)</h6>
              <div class="col-md-4 mb-2">
                <label class="form-label" data-bs-toggle="tooltip" data-bs-placement="top" title="Type of condition (e.g., weight, quantity, area, fruit)">
                  Condition Type <i class="bi bi-info-circle text-muted ms-1"></i>
                </label>
                <!-- free-text per your request -->
                <input type="text" id="new_category_type" class="form-control" placeholder="e.g. weight, quantity, area">
              </div>
              <div class="col-md-4 mb-2">
                <label class="form-label" data-bs-toggle="tooltip" data-bs-placement="top" title="Minimum value for this condition range">
                  Min Value <i class="bi bi-info-circle text-muted ms-1"></i>
                </label>
                <input type="number" step="any" id="new_category_min" class="form-control">
              </div>
              <div class="col-md-4 mb-2">
                <label class="form-label" data-bs-toggle="tooltip" data-bs-placement="top" title="Maximum value for this condition range">
                  Max Value <i class="bi bi-info-circle text-muted ms-1"></i>
                </label>
                <input type="number" step="any" id="new_category_max" class="form-control">
              </div>
            </div>

            <div class="row mb-2">
              <div class="col-md-12 mb-2">
                <label class="form-label" data-bs-toggle="tooltip" data-bs-placement="top" title="Unit for the condition values (e.g., kg, pcs, m²)">
                  Condition Unit <i class="bi bi-info-circle text-muted ms-1""></i>
                </label>
                <input type="text" id="new_category_cond_unit" class="form-control">
              </div>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button type="button" id="saveNewCategoryBtn" class="btn btn-success">Save Category</button>
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
        </div>
      </div>
    </div>
  </div>
  `;
  $('body').append(modalHtml);

  $('#saveNewCategoryBtn').on('click', function () {
    const name = $('#new_category_name').val().trim();
    const key = $('#new_category_key').val().trim() || generateCategoryKey(name);
    const rate = $('#new_category_rate').val();
    const unit = $('#new_category_unit').val().trim();
    const order = parseInt($('#new_category_order').val()) || 0;
    const type = $('#new_category_type').val().trim();
    const min = $('#new_category_min').val();
    const max = $('#new_category_max').val();
    const condUnit = $('#new_category_cond_unit').val().trim();

    let conditions = null;
    if (type) {
      const c = {};
      if (min !== "") {
        const p = parseFloat(min);
        if (!Number.isNaN(p)) c[`min_${type}`] = p;
      }
      if (max !== "") {
        const p2 = parseFloat(max);
        if (!Number.isNaN(p2)) c[`max_${type}`] = p2;
      }
      if (condUnit) c.unit = condUnit;
      if (Object.keys(c).length > 0) conditions = c;
    }

    const newCat = {
      id: null,
      category_name: name,
      category_key: key,
      rate: rate,
      unit: unit,
      display_order: order,
      conditions: conditions
    };

    // callback stored on modal element
    const cb = $('#addCategoryModal').data('callback');
    if (typeof cb === 'function') cb(newCat);

    // reset & hide
    $('#addCategoryForm')[0].reset();
    const modalEl = document.getElementById('addCategoryModal');
    const modal = bootstrap.Modal.getInstance(modalEl);
    if (modal) modal.hide();

    // Show success message
    Swal.fire({
      icon: 'success',
      title: 'Category Added!',
      text: `"${name}" has been added successfully.`,
      timer: 2000,
      showConfirmButton: false
    });
  });
}

/* Helper: open modal and provide callback */
function openAddCategoryModal(callback) {
  ensureAddCategoryModalExists();
  $('#addCategoryModal').data('callback', callback);
  const modal = new bootstrap.Modal(document.getElementById('addCategoryModal'));
  modal.show();
  
  // Initialize tooltips in the modal after it's shown
  $('#addCategoryModal').on('shown.bs.modal', function() {
    $(this).find('[data-bs-toggle="tooltip"]').each(function() {
      new bootstrap.Tooltip(this, {
        trigger: 'hover'
      });
    });
  });
}

/* Helper: append new category block to DOM using the exact same structure as renderTaskEditor */
function appendNewCategoryBlock(c) {
  // create a category-block HTML that matches the original structure and classes
  const cond = c.conditions || {};
  let condType = '';
  for (const k of Object.keys(cond)) {
    if (k.startsWith('min_')) { condType = k.replace(/^min_/, ''); break; }
    if (k.startsWith('max_')) { condType = k.replace(/^max_/, ''); break; }
  }
  const minVal = condType ? (cond[`min_${condType}`] ?? '') : '';
  const maxVal = condType ? (cond[`max_${condType}`] ?? '') : '';
  const condUnit = cond.unit ?? (c.unit || '');

  const idx = $('#workSection .task-editor .card-body .category-block').length;
  const block = `
    <div class="border rounded p-3 mb-3 category-block" data-index="${idx}" data-category='${JSON.stringify(c)}'>
      <div class="d-flex justify-content-between align-items-center mb-2">
        <strong>${c.category_name || 'Unnamed Category'}</strong>
        <div class="d-flex align-items-center gap-2">
          <span class="text-success">${c.rate ?? 0} ${c.unit || ''}</span>
          <button class="btn btn-sm btn-danger remove-category-btn" type="button" title="Remove category">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      </div>

      <div class="mb-2 small text-muted">
        <strong>Category ID:</strong> ${c.id || 'N/A'}
      </div>

      <div class="row">
        <div class="col-md-6 mb-2">
          <label class="form-label">Rate</label>
          <input type="number" class="form-control category-rate" value="${c.rate ?? ''}">
        </div>
        <div class="col-md-6 mb-2">
          <label class="form-label">Unit</label>
          <input type="text" class="form-control category-unit" value="${c.unit ?? ''}">
        </div>
      </div>

      <div class="row">
        <div class="col-md-3 mb-2">
          <label class="form-label">Type</label>
          <input type="text" class="form-control category-type" value="${condType || ''}">
        </div>
        <div class="col-md-3 mb-2">
          <label class="form-label">Min Value</label>
          <input type="number" class="form-control category-min" value="${minVal}">
        </div>
        <div class="col-md-3 mb-2">
          <label class="form-label">Max Value</label>
          <input type="number" class="form-control category-max" value="${maxVal}">
        </div>
        <div class="col-md-3 mb-2">
          <label class="form-label">Condition Unit</label>
          <input type="text" class="form-control category-condition-unit" value="${condUnit}">
        </div>
      </div>

      <div class="row">
        <div class="col-md-4 mb-2">
          <label class="form-label">Display Order</label>
          <input type="number" class="form-control category-order" value="${c.display_order ?? 0}">
        </div>
      </div>
    </div>
  `;
  // append to the categories container used in renderTaskEditor
  $('#workSection .task-editor .card-body').find('.mb-3').last().after(block);
}
