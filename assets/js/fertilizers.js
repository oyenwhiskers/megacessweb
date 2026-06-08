// ==================== GLOBAL STATE ====================
let paginationState = {
  currentPage: 1,
  perPage: 10,
  search: "",
};
let allFertilizersData = [];

// ==================== INITIALIZATION ====================
document.addEventListener("DOMContentLoaded", () => {
  getAllFertilizers();

  // Search Listener
  const searchInput = document.getElementById("fertilizerSearch");
  if (searchInput) {
    searchInput.addEventListener(
      "input",
      debounce((e) => {
        paginationState.search = e.target.value;
        paginationState.currentPage = 1;
        renderFilteredFertilizers();
      }, 200)
    );
  }

  // Refresh Button Listener
  const refreshBtn = document.getElementById("refreshFertilizerBtn");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", () => {
      paginationState.search = "";
      paginationState.currentPage = 1;
      if (searchInput) searchInput.value = "";
      getAllFertilizers();
    });
  }
});

// ==================== DATA FETCHING ====================
async function getAllFertilizers() {
  const loading = document.getElementById("loading");
  const tableBody = document.getElementById("fertilizerTableBody");
  if (loading) loading.style.display = "block";
  if (tableBody) tableBody.innerHTML = "";

  try {
    const result = await apiFetch("/fertilizers");
    if (loading) loading.style.display = "none";

    if (result.success && Array.isArray(result.data)) {
      allFertilizersData = result.data;
      renderFilteredFertilizers();
    } else {
      showError(result.message || "Failed to fetch fertilizers.");
    }
  } catch (error) {
    console.error(error);
    if (loading) loading.style.display = "none";
  }
}

// ==================== RENDER & PAGINATION ====================
function renderFilteredFertilizers() {
  const tableBody = document.getElementById("fertilizerTableBody");
  if (!tableBody) return;
  tableBody.innerHTML = "";

  // Filter in-memory
  const searchTerm = paginationState.search.toLowerCase().trim();
  const filtered = allFertilizersData.filter(item => 
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
      row.innerHTML = `
              <div class="col-8 ps-3 fw-bold text-dark">${item.name}</div>
              <div class="col-4 text-center">
                  <button class="btn btn-sm btn-warning me-2 edit-fertilizer-btn" 
                          data-id="${item.id}" 
                          data-name="${item.name}" 
                          title="Edit">
                      <i class="bi bi-pencil"></i>
                  </button>
                  <button class="btn btn-sm btn-danger delete-fertilizer-btn" data-id="${item.id}" title="Delete">
                      <i class="bi bi-trash"></i>
                  </button>
              </div>
          `;
      fragment.appendChild(row);
    });
    tableBody.appendChild(fragment);
    renderPagination(paginationState.currentPage, lastPage);
  } else {
    tableBody.innerHTML = `<div class="text-center text-muted py-4">No fertilizers found</div>`;
    const container = document.getElementById("fertilizerPagination");
    if (container) container.innerHTML = "";
  }
}

function renderPagination(current, last) {
  const container = document.getElementById("fertilizerPagination");
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
  renderFilteredFertilizers();
}

// ==================== EVENT DELEGATION ====================
document.addEventListener("DOMContentLoaded", () => {
  const tableBody = document.getElementById("fertilizerTableBody");
  if (tableBody) {
    tableBody.addEventListener("click", (e) => {
      // Handle Edit
      const editBtn = e.target.closest(".edit-fertilizer-btn");
      if (editBtn) {
        handleEdit(editBtn);
      }

      // Handle Delete
      const deleteBtn = e.target.closest(".delete-fertilizer-btn");
      if (deleteBtn) {
        handleDelete(deleteBtn);
      }
    });
  }
});

// ==================== POST /fertilizers ====================
const addFertilizerBtn = document.getElementById("addFertilizerBtn");
if (addFertilizerBtn) {
  addFertilizerBtn.addEventListener("click", async () => {
    const fertilizerName = document.getElementById("fertilizerName").value.trim();

    if (!fertilizerName) {
      showError("Please fill in the name field.");
      return;
    }

    addFertilizerBtn.disabled = true;
    const originalText = addFertilizerBtn.textContent;
    addFertilizerBtn.textContent = "Adding...";

    try {
      const result = await apiFetch("/fertilizers", {
        method: "POST",
        body: JSON.stringify({
          name: fertilizerName,
        }),
      });

      if (result.success) {
        bootstrap.Modal.getOrCreateInstance(
          document.getElementById("addFertilizerModal")
        ).hide();
        document.getElementById("fertilizerName").value = "";

        showSuccess("Success!", "Fertilizer added successfully!");
        getAllFertilizers();
      } else {
        showError(result.message);
      }
    } catch (error) {
      console.error(error);
    } finally {
      addFertilizerBtn.disabled = false;
      addFertilizerBtn.textContent = originalText;
    }
  });
}

// ==================== DELETE /fertilizers ====================
async function handleDelete(btn) {
  const fertilizerId = btn.dataset.id;
  showConfirm("You want to delete this fertilizer?", async () => {
    showLoading();
    try {
      const result = await apiFetch(`/fertilizers/${fertilizerId}`, {
        method: "DELETE",
      });
      if (result.success) {
        showSuccess("Success!", result.message);
        getAllFertilizers();
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

// ==================== UPDATE /fertilizers ====================
let currentFertilizerId = null;

function handleEdit(btn) {
  currentFertilizerId = btn.dataset.id;
  document.getElementById("updateFertilizerName").value = btn.dataset.name;
  bootstrap.Modal.getOrCreateInstance(
    document.getElementById("updateFertilizerModal")
  ).show();
}

const updateFertilizerBtn = document.getElementById("updateFertilizerBtn");
if (updateFertilizerBtn) {
  updateFertilizerBtn.addEventListener("click", async () => {
    if (!currentFertilizerId) return;

    const name = document.getElementById("updateFertilizerName").value.trim();

    if (!name) {
      showError("Please fill in all fields.");
      return;
    }

    updateFertilizerBtn.disabled = true;
    const originalText = updateFertilizerBtn.textContent;
    updateFertilizerBtn.textContent = "Updating...";

    try {
      const result = await apiFetch(`/fertilizers/${currentFertilizerId}`, {
        method: "PUT",
        body: JSON.stringify({
          name: name,
        }),
      });

      if (result.success) {
        bootstrap.Modal.getOrCreateInstance(
          document.getElementById("updateFertilizerModal")
        ).hide();
        getAllFertilizers();
        showSuccess("Success!", "Fertilizer updated successfully!");
      } else {
        showError(result.message);
      }
    } catch (error) {
      console.error(error);
    } finally {
      updateFertilizerBtn.disabled = false;
      updateFertilizerBtn.textContent = originalText;
    }
  });
}
