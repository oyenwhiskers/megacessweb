// ==================== GLOBAL CONSTANTS ====================
const BASE_URL = "https://mwms.megacess.com/api/v1";

// ==================== AUTH & TOKEN ====================
function getToken() {
  const keys = ["authToken", "auth_token", "token", "access_token"];
  for (const k of keys) {
    const v = localStorage.getItem(k) || sessionStorage.getItem(k);
    if (v) return v;
  }
  console.warn("No token found in storage");
  return null;
}

// ==================== API FETCH WRAPPER ====================
async function apiFetch(path, options = {}) {
  const token = getToken();

  if (!token) {
    showErrorNoToken("Authentication token missing.");
    throw new Error("Authentication failed.");
  }

  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        ...options.headers,
      },
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok || result.success === false) {
      throw new Error(result.message || `API Error: ${response.status}`);
    }

    return result;
  } catch (error) {
    console.error("API Fetch Error:", error);
    throw error;
  }
}

// ==================== UI HELPERS (SweetAlert) ====================
function showSuccess(title, msg = "") {
  Swal.fire({
    icon: "success",
    title: title,
    text: msg,
    timer: 2000,
    showConfirmButton: false,
  });
}

function showError(msg) {
  Swal.fire({
    icon: "error",
    title: "Error",
    text: msg,
    timer: 3000,
    showConfirmButton: true,
  });
}

function showErrorNoToken(msg) {
  Swal.fire({
    icon: "error",
    title: "Missing authentication token",
    text: msg,
  }).then(() => {
    window.location.replace("../log-in.html");
  });
}

function showConfirm(message, callbackYes) {
  Swal.fire({
    title: "Are you sure?",
    text: message,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#3085d6",
    cancelButtonColor: "#d33",
    confirmButtonText: "Yes, do it!",
  }).then((result) => {
    if (result.isConfirmed) callbackYes();
  });
}

// ==================== DOM HELPERS ====================
function showLoading() {
  const overlay = document.getElementById("loadingOverlay");
  if (overlay) {
    overlay.classList.remove("d-none");
  } else {
    console.warn("showLoading: #loadingOverlay not found");
  }
}

function hideLoading() {
  const overlay = document.getElementById("loadingOverlay");
  if (overlay) overlay.classList.add("d-none");
}

function debounce(func, delay) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), delay);
  };
}

function formatForDateTimeLocal(isoString) {
  if (!isoString) return "";
  const date = new Date(isoString);
  const offset = date.getTimezoneOffset() * 60000;
  const localTime = new Date(date.getTime() - offset);
  return localTime.toISOString().slice(0, 16);
}

function formatDateDisplay(dateString) {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ==================== GENERIC DROPDOWN ====================
/**
 * Initializes a searchable dropdown.
 * @param {HTMLElement} inputEl - The input element.
 * @param {HTMLElement} dropdownEl - The UL element for the dropdown.
 * @param {Function} fetchItems - Async function returning array of items.
 * @param {Function} onSelect - Callback when item is selected.
 * @param {Function} renderItem - Function returning HTML string for an item.
 * @param {Function} filterItem - Function returning boolean for search filtering.
 */
function initSearchableDropdown(
  inputEl,
  dropdownEl,
  fetchItems,
  onSelect,
  renderItem,
  filterItem
) {
  if (!inputEl || !dropdownEl) return;

  let allItems = [];
  let hasFetched = false;

  async function loadItems() {
    if (!hasFetched) {
      // Show loading immediately
      dropdownEl.innerHTML =
        '<li class="dropdown-item text-muted">Loading...</li>';
      dropdownEl.style.display = "block";

      try {
        allItems = await fetchItems();
        hasFetched = true;
      } catch (e) {
        console.error("Failed to fetch dropdown items", e);
        allItems = [];
      }
    }
    return allItems;
  }

  // To show dropdown items
  function showDropdown(list) {
    dropdownEl.innerHTML = "";
    if (!list.length) {
      dropdownEl.innerHTML =
        '<li class="dropdown-item text-muted">No results found</li>';
    } else {
      list.forEach((item) => {
        const li = document.createElement("li");
        li.classList.add("dropdown-item");
        li.style.cursor = "pointer";
        li.innerHTML = renderItem(item);
        li.addEventListener("click", () => {
          inputEl.value = item.fullname || item.name || "none"; // Default fallback
          dropdownEl.style.display = "none";
          onSelect(item);
        });
        dropdownEl.appendChild(li);
      });
    }
    dropdownEl.style.display = "block";
  }

  // for dropdown in modal
  const openDropdown = async () => {
    const items = await loadItems();
    const search = inputEl.value.toLowerCase();
    // Filter if there is a value, otherwise show all
    const filtered = search
      ? allItems.filter((item) => filterItem(item, search))
      : allItems;
    showDropdown(filtered);
  };

  inputEl.addEventListener("focus", openDropdown);
  inputEl.addEventListener("click", openDropdown);

  inputEl.addEventListener("input", async () => {
    await loadItems(); // Ensure items are loaded
    const search = inputEl.value.toLowerCase();
    const filtered = allItems.filter((item) => filterItem(item, search));
    showDropdown(filtered);
  });

  document.addEventListener("click", (e) => {
    if (!inputEl.contains(e.target) && !dropdownEl.contains(e.target)) {
      dropdownEl.style.display = "none";
    }
  });
}
