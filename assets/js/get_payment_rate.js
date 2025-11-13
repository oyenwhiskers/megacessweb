/* get_payment_rate.js is consist of two different features - to view all existing payment rate 
and to update the existing payment rate */


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
    alert("Missing authentication token. Please login first.");
    return;
  }

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
  const $list = $('#workSection .task-list .list-group');
  if ($list.length === 0) {
    console.error(" Missing .task-list .list-group container in HTML");
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
    const badgeText = firstCategory ? `${firstCategory.rate} ${firstCategory.unit}` : '';

    const item = `
      <li class="list-group-item d-flex justify-content-between align-items-center ${activeClass}" 
          data-id="${task.id}">
        <span>${task.task_name}</span>
        <span class="badge bg-success">${badgeText}</span>
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
    categoryHtml = task.categories.map((c, i) => `
      <div class="border rounded p-3 mb-3 category-block" 
           data-index="${i}" 
           data-category='${JSON.stringify(c)}'>

        <!-- Category Header -->
        <div class="d-flex justify-content-between align-items-center mb-2">
          <strong>${c.category_name || 'Unnamed Category'}</strong>
          <span class="text-success">${c.rate ?? 0} ${c.unit || ''}</span>
        </div>

        <div class="mb-2 small text-muted">
          <strong>Category ID:</strong> ${c.id || 'N/A'}
        </div>

        <!-- Row 1: Rate and Unit -->
        <div class="row">
          <div class="col-md-6 mb-2">
            <label class="form-label">Rate</label>
            <input type="number" class="form-control category-rate" value="${c.rate ?? ''}" disabled>
          </div>
          <div class="col-md-6 mb-2">
            <label class="form-label">Unit</label>
            <input type="text" class="form-control category-unit" value="${c.unit ?? ''}" disabled>
          </div>
        </div>

        <!-- Row 2: Condition Fields (Type, Min, Max, Condition Unit) -->
        <div class="row">
          <div class="col-md-3 mb-2">
            <label class="form-label">Type</label>
            <input type="text" class="form-control category-type" value="${c.type || ''}" disabled>
          </div>
          <div class="col-md-3 mb-2">
            <label class="form-label">Min Value</label>
            <input type="number" class="form-control category-min" value="${c.min_value ?? ''}" disabled>
          </div>
          <div class="col-md-3 mb-2">
            <label class="form-label">Max Value</label>
            <input type="number" class="form-control category-max" value="${c.max_value ?? ''}" disabled>
          </div>
          <div class="col-md-3 mb-2">
            <label class="form-label">Condition Unit</label>
            <input type="text" class="form-control category-condition-unit" value="${c.condition_unit || c.unit || ''}" disabled>
          </div>
        </div>

        <!-- Row 3: Display Order -->
        <div class="row">
          <div class="col-md-4 mb-2">
            <label class="form-label">Display Order</label>
            <input type="number" class="form-control category-order" value="${c.display_order ?? ''}" disabled>
          </div>
        </div>
      </div>
    `).join('');
  }

  const html = `
    <div>
      <div class="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h5 class="mb-1">Edit Payment Rate</h5>
          <div class="small text-muted">Payment Rate ID: <strong>${task.id || 'N/A'}</strong></div>
        </div>
        <div class="d-flex gap-2">
          <button class="btn btn-sm btn-outline-danger" id="deleteBtn">🗑️ Delete</button>
          <button class="btn btn-sm btn-outline-primary" id="editToggleBtn">✏️ Edit</button>
        </div>

      </div>

      <div class="mb-3">
        <label class="form-label fw-semibold">Task Name</label>
        <input type="text" class="form-control" id="taskName" value="${task.task_name || ''}" readonly>
      </div>

      <div class="form-check form-switch mb-3">
        <input class="form-check-input" type="checkbox" id="isActive" ${task.is_active ? 'checked' : ''} disabled>
        <label class="form-check-label" for="isActive">Active</label>
      </div>

      <div class="mb-3">
        <label class="form-label fw-semibold">Description</label>
        <textarea class="form-control" id="description" rows="3" readonly>${task.description || ''}</textarea>
      </div>

      <div class="mb-3">
        <label class="form-label fw-semibold">Categories & Rates</label>
        ${categoryHtml || '<p class="text-muted">No categories defined</p>'}
      </div>

      <div class="text-end">
        <button class="btn btn-success d-none" id="saveChangesBtn">Save Changes</button>
      </div>
    </div>
  `;

  $editor.html(html);

  // Delete button
  $('#deleteBtn').off('click').on('click', async function () {
    console.log("Delete button clicked for ID:", task.id);

    if (!confirm("Are you sure you want to delete this payment rate?")) return;

    await deletePaymentRate(task.id);
  });

  // Toggle edit mode
  $('#editToggleBtn').off('click').on('click', function () {
    const isEditing = $(this).data('editing') || false;

    if (!isEditing) {
      $(this).text('🔒 Cancel').data('editing', true);
      $('#saveChangesBtn').removeClass('d-none');
      $editor.find('input, textarea').removeAttr('readonly').removeAttr('disabled');
    } else {
      $(this).text('✏️ Edit').data('editing', false);
      $('#saveChangesBtn').addClass('d-none');
      $editor.find('input, textarea').attr('readonly', true);
      $editor.find('input[type="checkbox"], input[type="number"], input[type="text"]').attr('disabled', true);
      renderTaskEditor(task);
    }
  });

  // Save button
  $('#saveChangesBtn').off('click').on('click', async function () {
    const updatedData = collectFormData(task.id);
    console.log("Updating payment rate:", updatedData);
    await updatePaymentRate(task.id, updatedData);
  });
}

/* -------------------- Collect Form Data -------------------- */
function collectFormData(taskId) {
  const data = {
    task_name: $('#taskName').val(),
    description: $('#description').val(),
    is_active: $('#isActive').is(':checked'),
    categories: []
  };

  $('.category-block').each(function () {
    const cat = $(this).data('category');
    const min = parseFloat($(this).find('.category-min').val());
    const max = parseFloat($(this).find('.category-max').val());

    const category = {
      id: cat.id,
      payment_rate_id: taskId,
      category_name: cat.category_name,
      category_key: cat.category_key,
      rate: $(this).find('.category-rate').val(),
      unit: $(this).find('.category-unit').val(),
      display_order: parseInt($(this).find('.category-order').val()) || 0,
      conditions: (min || max) ? { min_weight: min || null, max_weight: max || null } : null
    };

    data.categories.push(category);
  });

  return data;
}


/* -------------------- PUT Request (Update Payment Rate) -------------------- */
async function updatePaymentRate(id, bodyData) {
  const token = getToken();
  if (!token) {
    alert("Missing authentication token. Please login first.");
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
      alert("✅ Payment rate updated successfully!");
      getPaymentRates(); // reload list
    } else {
      alert("Failed to update: " + json.message);
      console.warn("Update validation errors:", json.errors);
    }
  } catch (err) {
    console.error("Error updating payment rate:", err);
  }
}


/* -------------------- Initialize -------------------- */
document.addEventListener('DOMContentLoaded', () => {
  // Only fetch payment rates if the container exists
  if ($('#workSection .task-list .list-group').length) {
    console.log(" Loading payment rates...");
    getPaymentRates();
  }
});

