// Global State
let allVehicles = [];
let sparePartsState = {
  currentPage: 1,
  lastPage: 1,
  perPage: 10,
  total: 0,
  search: "",
  status: "",
};

// fetch vehicles for dropdown
// Wrapper for server-side vehicle search
async function searchVehicles(term) {
  try {
    let endpoint = `/vehicles?per_page=20`;
    if (term) {
      endpoint += `&search=${encodeURIComponent(term)}`;
    } else {
      endpoint += `&status=Available`;
    }

    const result = await apiFetch(endpoint);
    if (result.success) {
      const items = Array.isArray(result.data) ? result.data : result.data.data || [];
      return items.map(v => ({
        ...v,
        name: `${v.vehicle_name} (${v.plate_number})`,
        displayLabel: `${v.vehicle_name} (${v.plate_number})`
      }));
    }
    return [];
  } catch (e) {
    return [];
  }
}

// ==================== MAIN TABLE LOGIC ====================

async function getAllSpareParts({ search = "", status = "", page = 1 } = {}) {
  const loading = document.getElementById("loading");
  const tableBody = document.getElementById("toolsTableBody");

  // Update Global State
  sparePartsState.search = search;
  sparePartsState.status = status;
  sparePartsState.currentPage = page;

  // Show loading spinner
  loading.style.display = "block";
  tableBody.innerHTML = "";

  // Searches for tools,
  // fetches the matching list from the backend,
  // updates the table, updates the pagination, and handles errors.
  try {
    const queryParams = new URLSearchParams({
      search: search,
      status: status,
      page: page,
      per_page: sparePartsState.perPage,
    });

    // Cache for 5 minutes
    const result = await apiFetchWithCache(`/tools?${queryParams.toString()}`, { method: 'GET' }, 5 * 60 * 1000);
    loading.style.display = "none";

    if (result.data && result.data.length > 0) {
      populateSparePartsTable(result.data);
      if (result.meta) updateToolPaginationControls(result.meta);
    } else {
      tableBody.innerHTML = `<div class="text-center text-muted py-3">No tools found</div>`;
    }
  } catch (error) {
    loading.style.display = "none";
    tableBody.innerHTML = `<div class="text-center text-danger py-3">Failed to load tools</div>`;
    showError(error.message);
  }
}

function populateSparePartsTable(tools) {
  const tableBody = document.getElementById("toolsTableBody");
  tableBody.innerHTML = "";

  const fragment = document.createDocumentFragment();

  tools.forEach((tool) => {
    const row = document.createElement("div");
    row.className = "content-row d-flex border-bottom py-2 align-items-center";

    const sparePartName = tool.name || "-";
    let vehicleName = "-";
    let plateNumber = "-";
    if (tool.vehicle) {
      vehicleName = tool.vehicle.vehicle_name || "-";
      plateNumber = tool.vehicle.plate_number || "-";
    }

    // Safe JSON for Edit button
    const safeJson = JSON.stringify(tool).replace(/'/g, "&apos;");

    row.innerHTML = `
        <div class="col-5 ps-4 d-flex align-items-center">
            <div>
                <div class="fw-bold text-dark">${sparePartName}</div>
            </div>
        </div>

        <div class="col-4">${vehicleName}<small> (${plateNumber})</small></div>

        <div class="col-4 text-center">
            <button class="btn btn-sm btn-warning me-2 edit-btn" data-json='${safeJson}' title="Edit">
                <i class="bi bi-pencil"></i>
            </button>
            <button class="btn btn-sm btn-danger delete-btn" data-id="${tool.id}" title="Delete">
                <i class="bi bi-trash"></i>
            </button>
        </div>
    `;

    fragment.appendChild(row);
  });

  tableBody.appendChild(fragment);
}

// EVENT DELEGATION: Handle Table Clicks (Edit/Delete)
document.getElementById("toolsTableBody").addEventListener("click", (e) => {
  const deleteBtn = e.target.closest(".delete-btn");
  const editBtn = e.target.closest(".edit-btn");

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
  sparePartsState.lastPage = meta.last_page;
  sparePartsState.total = meta.total;

  // Render standardized pagination
  renderPagination('toolPagination', {
    current_page: meta.current_page,
    last_page: meta.last_page
  }, (newPage) => {
    const search = document.getElementById("searchTools")?.value || "";
    getAllSpareParts(search, newPage);
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
    ["totalToolsSpinner", "totalToolsValue"],
    ["availableToolsSpinner", "availableToolsValue"],
    ["inUseToolsSpinner", "inUseToolsValue"],
    ["brokenToolsSpinner", "brokenToolsValue"],
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

async function refreshToolSummary() {
  setStatsLoading(true);
  try {
    // Simple direct fetch to ensure we get global stats, not just per-page
    const result = await apiFetch("/analytics/resources-usage");

    if (result.data && result.data.tools_analytics) {
      const stats = result.data.tools_analytics;
      animateCount(
        document.getElementById("totalToolsValue"),
        Number(stats.total_spare_parts) || 0,
        1200
      );
      animateCount(
        document.getElementById("availableToolsValue"),
        Number(stats.available) || 0,
        1200
      );
      animateCount(
        document.getElementById("inUseToolsValue"),
        Number(stats.used) || 0,
        1200
      );
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
document.getElementById("addToolBtn").addEventListener("click", async (e) => {
  e.preventDefault();
  const nameInput = document.getElementById("toolName");
  const vehicleInput = document.getElementById("toolVehicleInput");
  const btn = document.getElementById("addToolBtn");

  const payload = {
    name: nameInput.value.trim(),
    vehicle_id: vehicleInput.dataset.selectedId || null,
  };

  if (!payload.name) {
    return showError("Please enter a tool name.");
  }

  btn.disabled = true;
  btn.textContent = "Adding...";

  try {
    const result = await apiFetch("/tools", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    showSuccess("Tool added successfully!");
    bootstrap.Modal.getOrCreateInstance(
      document.getElementById("addToolsModal")
    ).hide();

    // Reset form
    nameInput.value = "";
    vehicleInput.value = "";
    delete vehicleInput.dataset.selectedId;

    getAllSpareParts({ page: 1 }); // Reset to first page
    refreshToolSummary();
  } catch (error) {
    showError(error.message);
  } finally {
    btn.disabled = false;
    btn.textContent = "Save Tool";
  }
});

// DELETE TOOL
async function handleDelete(toolId) {
  showConfirm("Are you sure you want to delete this tool?", async () => {
    showLoading();
    try {
      const result = await apiFetch(`/tools/${toolId}`, { method: "DELETE" });
      showSuccess(result.message || "Tool deleted");

      getAllSpareParts({ ...sparePartsState }); // Refresh current page
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
  const modal = bootstrap.Modal.getOrCreateInstance(
    document.getElementById("updateToolModal")
  );

  document.getElementById("updateToolName").value = tool.name;
  if (tool.vehicle) {
    document.getElementById("updateToolVehicleInput").value =
      tool.vehicle.vehicle_name || null;
  } else {
    document.getElementById("updateToolVehicleInput").value = null;
    delete document.getElementById("updateToolVehicleInput").dataset.selectedId;
  }

  // Store ID on the update button for reference
  document.getElementById("updateToolBtn").dataset.id = tool.id;

  modal.show();
}

// UPDATE TOOL SUBMIT
document
  .getElementById("updateToolBtn")
  .addEventListener("click", async (e) => {
    const toolId = e.target.dataset.id;
    const name = document.getElementById("updateToolName").value.trim();
    let vehicleId = null;
    if (!document.getElementById("updateToolVehicleInput").value)
      vehicleId = document.getElementById("updateToolVehicleInput").value;
    else
      vehicleId = document.getElementById("updateToolVehicleInput").dataset
        .selectedId;
    const btn = e.target;

    if (!toolId) return;
    if (!name) return showError("Please enter a spare part name.");

    btn.disabled = true;
    btn.textContent = "Updating...";

    try {
      const result = await apiFetch(`/tools/${toolId}`, {
        method: "PUT",
        body: JSON.stringify({ name: name, vehicle_id: vehicleId }),
      });

      showSuccess(result.message || "Tool updated");
      bootstrap.Modal.getOrCreateInstance(
        document.getElementById("updateToolModal")
      ).hide();

      getAllSpareParts({ ...sparePartsState });
      refreshToolSummary();
    } catch (error) {
      showError(error.message);
    } finally {
      btn.disabled = false;
      btn.textContent = "Update Tool";
    }
  });

// ==================== INITIALIZATION & SEARCH ====================

window.addEventListener("DOMContentLoaded", () => {
  getAllSpareParts();
  refreshToolSummary();
  getAllSpareParts();
  refreshToolSummary();
  // getAllVehicles(); // Check if this is needed for anything else. If only for dropdowns, it's replaced.

  // Setup Autocompletes (Create Modal)
  // vehicle
  // Setup Autocompletes (Create Modal)
  // vehicle
  initServerDropdown(
    document.getElementById("toolVehicleInput"), //inputEl
    document.getElementById("toolVehicleDropdown"), //dropdownEl
    searchVehicles, //fetchFunction
    (v) => {
      document.getElementById("toolVehicleInput").dataset.selectedId = v.id;
    }, //onSelect
    (v) => `${v.vehicle_name} (${v.plate_number})` //renderItem
  );

  // Setup Autocompletes (Update Modal)
  // vehicle
  initServerDropdown(
    document.getElementById("updateToolVehicleInput"),
    document.getElementById("updateToolVehicleDropdown"),
    searchVehicles,
    (v) => {
      document.getElementById("updateToolVehicleInput").dataset.selectedId =
        v.id;
    },
    (v) => `${v.vehicle_name} (${v.plate_number})`
  );
});

// Search & Filter Handlers
const handleSearch = debounce(() => {
  const search = document.getElementById("toolSearch").value.trim();
  const status = document.getElementById("toolStatus").value;
  getAllSpareParts({ search, status, page: 1 });
}, 100);

document.getElementById("toolSearch").addEventListener("input", handleSearch);
document.getElementById("toolStatus").addEventListener("change", handleSearch);

document.getElementById("refreshToolBtn").addEventListener("click", () => {
  document.getElementById("toolSearch").value = "";
  document.getElementById("toolStatus").value = "";
  getAllSpareParts({ page: 1, search: "", status: "" });
  refreshToolSummary();
});
