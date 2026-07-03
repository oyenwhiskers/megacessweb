// ==================== GLOBAL STATE ====================
let paginationState = {
  currentPage: 1,
  perPage: 10,
  search: "",
};
let allLocationsData = [];

// ==================== INITIALIZATION ====================
document.addEventListener("DOMContentLoaded", () => {
  getAllLocations();

  // Search Listener
  const searchInput = document.getElementById("locationSearch");
  if (searchInput) {
    searchInput.addEventListener(
      "input",
      debounce((e) => {
        paginationState.search = e.target.value;
        paginationState.currentPage = 1;
        renderFilteredLocations();
      }, 200)
    );
  }

  // Refresh Button Listener
  const refreshBtn = document.getElementById("refreshLocationBtn");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", () => {
      paginationState.search = "";
      paginationState.currentPage = 1;
      if (searchInput) searchInput.value = "";
      getAllLocations();
    });
  }
});

// ==================== DATA FETCHING ====================
async function getAllLocations() {
  const loading = document.getElementById("loading");
  const tableBody = document.getElementById("locationTableBody");
  if (loading) loading.style.display = "block";
  if (tableBody) tableBody.innerHTML = "";

  try {
    const result = await apiFetch("/locations");
    if (loading) loading.style.display = "none";

    if (result.success && Array.isArray(result.data)) {
      allLocationsData = result.data;
      renderFilteredLocations();
    } else {
      showError(result.message || "Failed to fetch locations.");
    }
  } catch (error) {
    console.error(error);
    if (loading) loading.style.display = "none";
  }
}

// ==================== RENDER & PAGINATION ====================
function renderFilteredLocations() {
  const tableBody = document.getElementById("locationTableBody");
  if (!tableBody) return;
  tableBody.innerHTML = "";

  // Filter in-memory
  const searchTerm = paginationState.search.toLowerCase().trim();
  const filtered = allLocationsData.filter(item => 
    item.name.toLowerCase().includes(searchTerm)
  );

  // Paginate
  const total = filtered.length;
  const lastPage = Math.ceil(total / paginationState.perPage) || 1;
  const start = (paginationState.currentPage - 1) * paginationState.perPage;
  const end = start + paginationState.perPage;
  const paginatedData = filtered.slice(start, end);

  if (paginatedData.length > 0) {
    const fragment = document.createDocumentFragment();
    paginatedData.forEach((item) => {
      const row = document.createElement("div");
      row.className = "content-row d-flex border-bottom py-2 align-items-center";
      
      const statusBadge = item.isActive
        ? `<span class="badge bg-success">Active</span>`
        : `<span class="badge bg-secondary">Inactive</span>`;

      const toggleButton = item.isActive
        ? `<button class="btn btn-sm btn-outline-danger toggle-status-btn" data-id="${item.id}" data-active="false" title="Deactivate">
              <i class="bi bi-shield-slash"></i> Deactivate
           </button>`
        : `<button class="btn btn-sm btn-outline-success toggle-status-btn" data-id="${item.id}" data-active="true" title="Activate">
              <i class="bi bi-shield-check"></i> Activate
           </button>`;

      row.innerHTML = `
              <div class="col-6 ps-3 fw-bold text-dark">${item.name}</div>
              <div class="col-3 text-center">${statusBadge}</div>
              <div class="col-3 text-center">
                  <button class="btn btn-sm btn-warning me-2 edit-location-btn" 
                          data-id="${item.id}" 
                          data-name="${item.name}" 
                          title="Edit">
                      <i class="bi bi-pencil"></i>
                  </button>
                  ${toggleButton}
              </div>
          `;
      fragment.appendChild(row);
    });
    tableBody.appendChild(fragment);
    renderPagination(paginationState.currentPage, lastPage);
  } else {
    tableBody.innerHTML = `<div class="text-center text-muted py-4">No locations found</div>`;
    const container = document.getElementById("locationPagination");
    if (container) container.innerHTML = "";
  }
}

function renderPagination(current, last) {
  const container = document.getElementById("locationPagination");
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
    link.addEventListener("click", handlePaginationClick);
  });
}

function handlePaginationClick(e) {
  e.preventDefault();
  const page = parseInt(e.currentTarget.dataset.page, 10);
  if (!page || page === paginationState.currentPage) return;
  paginationState.currentPage = page;
  renderFilteredLocations();
}

// ==================== EVENT DELEGATION ====================
document.addEventListener("DOMContentLoaded", () => {
  const tableBody = document.getElementById("locationTableBody");
  if (tableBody) {
    tableBody.addEventListener("click", (e) => {
      // Handle Edit
      const editBtn = e.target.closest(".edit-location-btn");
      if (editBtn) {
        handleEdit(editBtn);
      }

      // Handle Toggle Status
      const toggleBtn = e.target.closest(".toggle-status-btn");
      if (toggleBtn) {
        handleToggleStatus(toggleBtn);
      }
    });
  }
});

// ==================== POST /locations ====================
const addLocationBtn = document.getElementById("addLocationBtn");
if (addLocationBtn) {
  addLocationBtn.addEventListener("click", async () => {
    const locationName = document.getElementById("locationName").value.trim();

    if (!locationName) {
      showError("Please fill in the name field.");
      return;
    }

    addLocationBtn.disabled = true;
    const originalText = addLocationBtn.textContent;
    addLocationBtn.textContent = "Adding...";

    try {
      const result = await apiFetch("/locations", {
        method: "POST",
        body: JSON.stringify({
          location_name: locationName,
        }),
      });

      if (result.success) {
        bootstrap.Modal.getOrCreateInstance(
          document.getElementById("addLocationModal")
        ).hide();
        document.getElementById("locationName").value = "";

        showSuccess("Success!", "Location added successfully!");
        getAllLocations();
      } else {
        showError(result.message);
      }
    } catch (error) {
      console.error(error);
    } finally {
      addLocationBtn.disabled = false;
      addLocationBtn.textContent = originalText;
    }
  });
}

// ==================== TOGGLE STATUS (ACTIVE / INACTIVE) ====================
async function handleToggleStatus(btn) {
  const locationId = btn.dataset.id;
  const shouldActivate = btn.dataset.active === "true";
  const actionText = shouldActivate ? "activate" : "deactivate";

  showConfirm(`You want to ${actionText} this location?`, async () => {
    showLoading();
    try {
      let result;
      if (shouldActivate) {
        // Activate location via PUT
        result = await apiFetch(`/locations/${locationId}`, {
          method: "PUT",
          body: JSON.stringify({
            is_active: true
          }),
        });
      } else {
        // Deactivate location via DELETE (which soft deletes/deactivates in backend)
        result = await apiFetch(`/locations/${locationId}`, {
          method: "DELETE",
        });
      }

      if (result.success) {
        showSuccess("Success!", result.message || `Location ${actionText}d successfully.`);
        getAllLocations();
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

// ==================== UPDATE /locations ====================
let currentLocationId = null;

function handleEdit(btn) {
  currentLocationId = btn.dataset.id;
  document.getElementById("updateLocationName").value = btn.dataset.name;
  bootstrap.Modal.getOrCreateInstance(
    document.getElementById("updateLocationModal")
  ).show();
}

const updateLocationBtn = document.getElementById("updateLocationBtn");
if (updateLocationBtn) {
  updateLocationBtn.addEventListener("click", async () => {
    if (!currentLocationId) return;

    const locationName = document.getElementById("updateLocationName").value.trim();

    if (!locationName) {
      showError("Please fill in the name field.");
      return;
    }

    updateLocationBtn.disabled = true;
    const originalText = updateLocationBtn.textContent;
    updateLocationBtn.textContent = "Updating...";

    try {
      const result = await apiFetch(`/locations/${currentLocationId}`, {
        method: "PUT",
        body: JSON.stringify({
          location_name: locationName,
        }),
      });

      if (result.success) {
        bootstrap.Modal.getOrCreateInstance(
          document.getElementById("updateLocationModal")
        ).hide();
        getAllLocations();
        showSuccess("Success!", "Location updated successfully!");
      } else {
        showError(result.message);
      }
    } catch (error) {
      console.error(error);
    } finally {
      updateLocationBtn.disabled = false;
      updateLocationBtn.textContent = originalText;
    }
  });
}
