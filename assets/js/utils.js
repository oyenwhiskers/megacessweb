// API_URL is defined globally in config.js

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
    const response = await fetch(`${API_URL}${path}`, {
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

// ==================== CACHING IMPLEMENTATION ====================
const apiCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes default TTL

/**
 * Fetches data from API with in-memory caching
 * @param {string} path - API endpoint path
 * @param {object} options - Fetch options
 * @param {number} ttl - Time to live in milliseconds (optional, default 5 mins)
 * @returns {Promise<any>} - JSON response
 */
async function apiFetchWithCache(path, options = {}, ttl = CACHE_TTL) {
  // Only cache GET requests
  const method = options.method ? options.method.toUpperCase() : 'GET';
  if (method !== 'GET') {
    return apiFetch(path, options);
  }

  const cacheKey = `${path}_${JSON.stringify(options)}`;
  const cached = apiCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < ttl) {
    // console.log(`[Cache Hit] ${path}`);
    return cached.data;
  }

  // console.log(`[Cache Miss] ${path}`);
  const data = await apiFetch(path, options);

  apiCache.set(cacheKey, {
    data,
    timestamp: Date.now()
  });

  return data;
}

/**
 * Clears API cache entries matching a pattern
 * @param {string} pattern - Substring to match in cache keys (optional, clears all if empty)
 */
function clearApiCache(pattern = null) {
  if (!pattern) {
    apiCache.clear();
    // console.log('[Cache] All cleared');
    return;
  }

  for (const key of apiCache.keys()) {
    if (key.includes(pattern)) {
      apiCache.delete(key);
      // console.log(`[Cache] Cleared: ${key}`);
    }
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

/**
 * Initializes a server-side searchable dropdown (Async/Lazy Load).
 * @param {HTMLElement} inputEl - The input element.
 * @param {HTMLElement} dropdownEl - The UL element for the dropdown.
 * @param {Function} fetchFunction - Async function(searchTerm) returning array of items.
 * @param {Function} onSelect - Callback when item is selected.
 * @param {Function} renderItem - Function returning HTML string for an item.
 */
function initServerDropdown(
  inputEl,
  dropdownEl,
  fetchFunction,
  onSelect,
  renderItem
) {
  if (!inputEl || !dropdownEl) return;

  let debounceTimer;

  const performSearch = async (term) => {
    dropdownEl.innerHTML = '<li class="dropdown-item text-muted">Searching...</li>';
    dropdownEl.style.display = "block";

    try {
      const items = await fetchFunction(term);
      dropdownEl.innerHTML = "";

      if (!items || items.length === 0) {
        dropdownEl.innerHTML = '<li class="dropdown-item text-muted">No results found</li>';
      } else {
        items.forEach((item) => {
          const li = document.createElement("li");
          li.classList.add("dropdown-item");
          li.style.cursor = "pointer";
          li.innerHTML = renderItem(item);
          li.addEventListener("click", () => {
            // Determine display value (fallback logic similar to original)
            const displayVal = item.displayLabel || item.fullname || item.name || item.vehicle_name || "";
            if (displayVal) inputEl.value = displayVal;

            dropdownEl.style.display = "none";
            onSelect(item);
          });
          dropdownEl.appendChild(li);
        });
      }
    } catch (e) {
      console.error("Dropdown fetch error", e);
      dropdownEl.innerHTML = '<li class="dropdown-item text-danger">Error loading data</li>';
    }
  };

  // Debounced input handler
  inputEl.addEventListener("input", () => {
    const term = inputEl.value.trim();
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => performSearch(term), 300);
  });

  // Focus handler (optional: load initial suggestions or nothing)
  inputEl.addEventListener("focus", () => {
    // Only search if empty to show recently used or defaults? 
    // For now, let's search empty string (listing defaults)
    if (inputEl.value.trim() === "") {
      performSearch("");
    }
  });

  document.addEventListener("click", (e) => {
    if (!inputEl.contains(e.target) && !dropdownEl.contains(e.target)) {
      dropdownEl.style.display = "none";
    }
  });
}
