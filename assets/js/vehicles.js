// ==================== GLOBAL STATE ====================
let paginationState = {
  currentPage: 1,
  lastPage: 1,
  perPage: 10,
  total: 0,
  search: "",
  status: "",
};

// ==================== INITIALIZATION ====================
document.addEventListener("DOMContentLoaded", () => {
  getAllVehicles();
  if (typeof refreshVehicleSummary === "function") refreshVehicleSummary();

  // Search & Filter Listeners
  const searchInput = document.getElementById("vehicleSearch");
  const statusFilter = document.getElementById("vehicleStatus");

  if (searchInput) {
    searchInput.addEventListener(
      "input",
      debounce((e) => {
        paginationState.search = e.target.value;
        paginationState.currentPage = 1;
        getAllVehicles(paginationState);
      }, 100)
    );
  }

  if (statusFilter) {
    statusFilter.addEventListener("change", (e) => {
      paginationState.status = e.target.value;
      paginationState.currentPage = 1;
      getAllVehicles(paginationState);
    });
  }

  // Refresh Button Listener
  const refreshBtn = document.getElementById("refreshVehicleBtn");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", () => {
      // Reset State
      paginationState.search = "";
      paginationState.status = "";
      paginationState.currentPage = 1;

      // Reset DOM elements
      if (searchInput) searchInput.value = "";
      if (statusFilter) statusFilter.value = "";

      getAllVehicles(paginationState);
      refreshVehicleSummary();
    });
  }

  // Dynamic Maintenance Remark Visibility togglers
  const addStatusSelect = document.getElementById("addVehicleStatus");
  const addRemarkGroup = document.getElementById("addMaintenanceRemarkGroup");
  if (addStatusSelect && addRemarkGroup) {
    addStatusSelect.addEventListener("change", (e) => {
      if (e.target.value === "Under Maintenance") {
        addRemarkGroup.classList.remove("d-none");
      } else {
        addRemarkGroup.classList.add("d-none");
        document.getElementById("addMaintenanceRemark").value = "";
      }
    });
  }

  const updateStatusSelect = document.getElementById("updateVehicleStatus");
  const updateRemarkGroup = document.getElementById("updateMaintenanceRemarkGroup");
  if (updateStatusSelect && updateRemarkGroup) {
    updateStatusSelect.addEventListener("change", (e) => {
      if (e.target.value === "Under Maintenance") {
        updateRemarkGroup.classList.remove("d-none");
      } else {
        updateRemarkGroup.classList.add("d-none");
        document.getElementById("updateMaintenanceRemark").value = "";
      }
    });
  }
});

// ==================== DATA FETCHING ====================
async function getAllVehicles({
  search = "",
  status = "",
  page = 1,
  per_page = 10,
} = {}) {
  const loading = document.getElementById("loading");
  const tableBody = document.getElementById("vehicleTableBody");
  if (loading) loading.style.display = "block";
  if (tableBody) tableBody.innerHTML = "";

  const params = new URLSearchParams();
  if (search) params.append("search", search);
  if (status) params.append("status", status);
  params.append("page", page);
  params.append("per_page", per_page);

  try {
    const result = await apiFetch(`/vehicles?${params.toString()}`);

    if (loading) loading.style.display = "none";

    if (result.success) {
      let data = [];
      let meta = {};

      // Handle different API response structures
      if (result.meta) {
        data = result.data;
        meta = result.meta;
      } else if (
        result.data &&
        Array.isArray(result.data.data) &&
        result.data.current_page
      ) {
        data = result.data.data;
        meta = result.data;
      } else if (Array.isArray(result.data)) {
        // Client-side fallback
        const allData = result.data;
        const total = allData.length;
        const lastPage = Math.ceil(total / per_page) || 1;
        const start = (page - 1) * per_page;
        const end = start + per_page;
        data = allData.slice(start, end);
        meta = {
          current_page: parseInt(page),
          last_page: lastPage,
          total: total,
          per_page: per_page,
        };
      }

      if (data && data.length > 0) {
        populateVehicleTable(data);
        updatePaginationControls(meta);
      } else {
        if (tableBody)
          tableBody.innerHTML = `<div class="text-center text-muted py-3">No vehicles found</div>`;
        const container = document.getElementById("vehiclePagination");
        if (container) container.innerHTML = "";
      }
    } else {
      showError(result.message || "Failed to fetch vehicles.");
    }
  } catch (error) {
    console.error(error);
    if (loading) loading.style.display = "none";
  }
}

function populateVehicleTable(vehicles) {
  const tableBody = document.getElementById("vehicleTableBody");
  if (!tableBody) return;
  tableBody.innerHTML = "";

  const fragment = document.createDocumentFragment();

  vehicles.forEach((vehicle) => {
    const row = document.createElement("div");
    row.className = "content-row d-flex border-bottom py-2 align-items-center";

    let statusClass = "bg-secondary";
    if (vehicle.status.toLowerCase() === "available")
      statusClass = "bg-success";
    else if (vehicle.status.toLowerCase() === "in use")
      statusClass = "bg-warning text-dark";
    else if (vehicle.status.toLowerCase() === "under maintenance")
      statusClass = "bg-danger";

    let remarkHtml = "";
    if (vehicle.status.toLowerCase() === "under maintenance" && vehicle.maintenance_remark) {
      remarkHtml = `<div class="small text-danger fw-semibold mt-1"><i class="bi bi-exclamation-triangle me-1"></i>Remark: ${vehicle.maintenance_remark}</div>`;
    }

    row.innerHTML = `
            <div class="col ps-3 fw-bold text-dark">${vehicle.vehicle_name}</div>
            <div class="col">${vehicle.plate_number}</div>
            <div class="col">
                <span class="badge ${statusClass}">${vehicle.status}</span>
                ${remarkHtml}
            </div>
            <div class="col text-center">
                <button class="btn btn-sm btn-warning me-2 edit-vehicle-btn" 
                        data-id="${vehicle.id}" 
                        data-name="${vehicle.vehicle_name}" 
                        data-plate="${vehicle.plate_number}" 
                        data-status="${vehicle.status}"
                        data-remark="${vehicle.maintenance_remark || ''}"
                        title="Edit">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-danger delete-vehicle-btn" data-id="${
                  vehicle.id
                }" title="Delete">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        `;
    fragment.appendChild(row);
  });

  tableBody.appendChild(fragment);
}

// ==================== EVENT DELEGATION ====================
// Replaces attachEditListeners and attachDeleteListeners
document.addEventListener("DOMContentLoaded", () => {
  const tableBody = document.getElementById("vehicleTableBody");
  if (tableBody) {
    tableBody.addEventListener("click", (e) => {
      // Handle Edit
      const editBtn = e.target.closest(".edit-vehicle-btn");
      if (editBtn) {
        handleEdit(editBtn);
      }

      // Handle Delete
      const deleteBtn = e.target.closest(".delete-vehicle-btn");
      if (deleteBtn) {
        handleDelete(deleteBtn);
      }
    });
  }
});

// ==================== PAGINATION ====================
function updatePaginationControls(meta) {
  paginationState.currentPage = meta.current_page;
  paginationState.lastPage = meta.last_page;
  paginationState.perPage = meta.per_page;
  paginationState.total = meta.total;

  const currentEl = document.getElementById("currentPage");
  const totalPagesEl = document.getElementById("totalPages");
  const totalRecordsEl = document.getElementById("totalRecords");
  if (currentEl) currentEl.textContent = meta.current_page;
  if (totalPagesEl) totalPagesEl.textContent = meta.last_page;
  if (totalRecordsEl) totalRecordsEl.textContent = meta.total;

  renderPagination(meta.current_page, meta.last_page);
}

function renderPagination(current, last) {
  const container = document.getElementById("vehiclePagination");
  if (!container) return;

  const maxButtons = 7;
  let start = Math.max(1, current - Math.floor(maxButtons / 2));
  let end = Math.min(last, start + maxButtons - 1);
  if (end - start + 1 < maxButtons) {
    start = Math.max(1, end - maxButtons + 1);
  }

  let html = "";
  const prevDisabled = current <= 1;
  html += `<li class="page-item ${
    prevDisabled ? "disabled" : ""
  }"><a class="page-link" href="#" data-page="${Math.max(
    1,
    current - 1
  )}">Previous</a></li>`;

  for (let i = start; i <= end; i++) {
    if (i === current) {
      html += `<li class="page-item active" aria-current="page"><a class="page-link" href="#" data-page="${i}">${i}</a></li>`;
    } else {
      html += `<li class="page-item"><a class="page-link" href="#" data-page="${i}">${i}</a></li>`;
    }
  }

  const nextDisabled = current >= last;
  html += `<li class="page-item ${
    nextDisabled ? "disabled" : ""
  }"><a class="page-link" href="#" data-page="${Math.min(
    last,
    current + 1
  )}">Next</a></li>`;

  container.innerHTML = html;

  const enabledLinks = container.querySelectorAll(
    "li.page-item:not(.disabled) a[data-page]"
  );
  enabledLinks.forEach((link) => {
    link.removeEventListener("click", handlePaginationClick);
    link.addEventListener("click", handlePaginationClick);
  });
}

function handlePaginationClick(e) {
  e.preventDefault();
  const page = parseInt(e.currentTarget.dataset.page, 10);
  if (!page || page === paginationState.currentPage) return;

  getAllVehicles({
    search: paginationState.search,
    status: paginationState.status,
    per_page: paginationState.perPage,
    page: page,
  });
  window.scrollTo(0, 0);
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
    ["totalVehiclesSpinner", "totalVehiclesValue"],
    ["availableVehiclesSpinner", "availableVehiclesValue"],
    ["inUseVehiclesSpinner", "inUseVehiclesValue"],
    ["maintenanceVehiclesSpinner", "maintenanceVehiclesValue"],
  ];

  mapping.forEach(([spinnerId, valueId]) => {
    const spinner = document.getElementById(spinnerId);
    const valueEl = document.getElementById(valueId);
    if (!spinner || !valueEl) return;

    if (isLoading) {
      spinner.classList.remove("d-none");
      valueEl.classList.add("opacity-50");
    } else {
      spinner.classList.add("d-none");
      valueEl.classList.remove("opacity-50");
    }
  });
}

// -------------------- Real Analytics (Summary) --------------------
async function fetchResourcesUsageAnalytics() {
  try {
    const result = await apiFetch("/analytics/resources-usage");
    if (result?.success && result?.data) {
      return result.data;
    }
  } catch (err) {
    console.error("Failed to fetch analytics:", err);
  }

  return null;
}

async function refreshVehicleSummary() {
  setStatsLoading(true);

  const analytics = await fetchResourcesUsageAnalytics();
  if (!analytics || !analytics.vehicle_analytics) {
    console.warn("Unable to fetch vehicle analytics.");
    setStatsLoading(false);
    return;
  }

  const vehicles = analytics.vehicle_analytics;

  animateCount(
    document.getElementById("totalVehiclesValue"),
    Number(vehicles.total_vehicles) || 0,
    1200
  );
  animateCount(
    document.getElementById("availableVehiclesValue"),
    Number(vehicles.available) || 0,
    1200
  );
  animateCount(
    document.getElementById("inUseVehiclesValue"),
    Number(vehicles.in_use) || 0,
    1200
  );
  animateCount(
    document.getElementById("maintenanceVehiclesValue"),
    Number(vehicles.under_maintenance) || 0,
    1200
  );

  setStatsLoading(false);
}

// ==================== POST /vehicles ====================
const addVehicleBtn = document.getElementById("addVehicleBtn");
if (addVehicleBtn) {
  addVehicleBtn.addEventListener("click", async () => {
    const vehicleName = document.getElementById("vehicleName").value.trim();
    const plateNo = document.getElementById("plateNo").value.trim();
    const statusSelect = document.getElementById("addVehicleStatus");
    const status = statusSelect.value;

    const remark = document.getElementById("addMaintenanceRemark").value.trim();

    if (!vehicleName || !plateNo || !status || status === "Choose status") {
      showError("Please fill in all fields.");
      return;
    }

    addVehicleBtn.disabled = true;
    const originalText = addVehicleBtn.textContent;
    addVehicleBtn.textContent = "Adding...";

    try {
      const result = await apiFetch("/vehicles", {
        method: "POST",
        body: JSON.stringify({
          vehicle_name: vehicleName,
          plate_number: plateNo,
          status,
          maintenance_remark: status === "Under Maintenance" ? remark : null,
        }),
      });

      if (result.success) {
        bootstrap.Modal.getOrCreateInstance(
          document.getElementById("addVehicleModal")
        ).hide();
        document.getElementById("vehicleName").value = "";
        document.getElementById("plateNo").value = "";
        document.getElementById("addMaintenanceRemark").value = "";
        document.getElementById("addMaintenanceRemarkGroup").classList.add("d-none");
        statusSelect.value = "Choose status";

        if (typeof refreshVehicleSummary === "function")
          refreshVehicleSummary();
        showSuccess("Success!", "Vehicle added successfully!");
        getAllVehicles();
      } else {
        showError(result.message);
      }
    } catch (error) {
      console.error(error);
    } finally {
      addVehicleBtn.disabled = false;
      addVehicleBtn.textContent = originalText;
    }
  });
}

// ==================== DELETE /vehicles ====================

async function handleDelete(btn) {
  const vehicleId = btn.dataset.id;
  showConfirm("You want to delete this vehicle?", async () => {
    showLoading();
    try {
      const result = await apiFetch(`/vehicles/${vehicleId}`, {
        method: "DELETE",
      });
      if (result.success) {
        showSuccess("Success!", result.message);
        getAllVehicles();
        if (typeof refreshVehicleSummary === "function")
          refreshVehicleSummary();
      } else {
        showError(result.message);
      }
    } catch (err) {
      console.error(err);
    } finally {
      hideLoading();
    }
  });
}

// ==================== UPDATE /vehicles ====================
let currentVehicleId = null;

function handleEdit(btn) {
  currentVehicleId = btn.dataset.id;
  document.getElementById("updateVehicleName").value = btn.dataset.name;
  document.getElementById("updatePlateNo").value = btn.dataset.plate;
  
  const status = btn.dataset.status;
  document.getElementById("updateVehicleStatus").value = status;
  
  const remarkGroup = document.getElementById("updateMaintenanceRemarkGroup");
  const remarkField = document.getElementById("updateMaintenanceRemark");
  if (status === "Under Maintenance") {
    remarkGroup.classList.remove("d-none");
    remarkField.value = btn.dataset.remark || "";
  } else {
    remarkGroup.classList.add("d-none");
    remarkField.value = "";
  }
  
  bootstrap.Modal.getOrCreateInstance(
    document.getElementById("updateVehicleModal")
  ).show();
}

const updateVehicleBtn = document.getElementById("updateVehicleBtn");
if (updateVehicleBtn) {
  updateVehicleBtn.addEventListener("click", async () => {
    if (!currentVehicleId) return;

    const name = document.getElementById("updateVehicleName").value.trim();
    const plate = document.getElementById("updatePlateNo").value.trim();
    const status = document.getElementById("updateVehicleStatus").value;

    const remark = document.getElementById("updateMaintenanceRemark").value.trim();

    if (!name || !plate || !status) {
      showError("Please fill in all fields.");
      return;
    }

    updateVehicleBtn.disabled = true;
    const originalText = updateVehicleBtn.textContent;
    updateVehicleBtn.textContent = "Updating...";

    try {
      const result = await apiFetch(`/vehicles/${currentVehicleId}`, {
        method: "PUT",
        body: JSON.stringify({
          vehicle_name: name,
          plate_number: plate,
          status,
          maintenance_remark: status === "Under Maintenance" ? remark : null,
        }),
      });

      if (result.success) {
        bootstrap.Modal.getOrCreateInstance(
          document.getElementById("updateVehicleModal")
        ).hide();
        getAllVehicles();
        if (typeof refreshVehicleSummary === "function")
          refreshVehicleSummary();
        showSuccess("Success!", "Vehicle updated successfully!");
      } else {
        showError(result.message);
      }
    } catch (error) {
      console.error(error);
    } finally {
      updateVehicleBtn.disabled = false;
      updateVehicleBtn.textContent = originalText;
    }
  });
}
