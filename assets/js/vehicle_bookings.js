// ==================== GLOBAL STATE ====================
let allVehicles = [];
let allUsersAndStaff = [];
let bookingPaginationState = {
  currentPage: 1,
  lastPage: 1,
  perPage: 10,
  total: 0,
  search: "",
  bookingFilter: "",
};

// ==================== DATA FETCHING ====================

// for dropdown in modal
async function fetchVehicle() {
  try {
    let allData = [];
    const availabilityFilter = "status=Available";

    // 1. Fetch only first page (limited to 50 items for initial view)
    const result = await apiFetch(`/vehicles?${availabilityFilter}&page=1&per_page=50`);

    if (!result.success) throw new Error(result.message);

    const getItems = (res) => Array.isArray(res.data) ? res.data : res.data.data || [];
    const data = getItems(result);

    // takes each vehicle, copies all its data, and adds a new field called name
    // that combines the vehicle name and plate number.
    allVehicles = data.map((v) => ({
      ...v,
      name: `${v.vehicle_name} (${v.plate_number})`,
    }));
  } catch (error) {
    // console.error("Error fetching available vehicles:", error);
  }
}

// Wrapper for server-side vehicle search
async function searchVehicles(term) {
  try {
    let endpoint = `/vehicles?per_page=20`;
    // Add search term if exists
    if (term) {
      endpoint += `&search=${encodeURIComponent(term)}`;
    } else {
      // If no search, filter by available (default behavior for dropdown)
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

// for dropdown in modal
// for dropdown in modal - Wrapper for server-side user/staff search
async function searchUserAndStaff(term) {
  try {
    let endpoint = "/users-and-staff";
    if (term) {
      endpoint += `?search=${encodeURIComponent(term)}`;
    }
    const result = await apiFetch(endpoint);
    if (result.success) {
      return result.data.map((item) => ({
        user_id: item.user_id || null,
        staff_id: item.staff_id || null,
        fullname: item.fullname,
        role: item.role,
        displayLabel: `${item.fullname} - ${item.role}`,
      }));
    }
    return [];
  } catch (error) {
    // console.error("Error fetching users:", error);
    return [];
  }
}

// ==================== MAIN TABLE LOGIC ====================

// Get all vehicle bookings
async function getAllVehicleBookings({
  search = "",
  bookingFilter = "",
  page = 1,
  per_page = 10,
} = {}) {
  const loading = document.getElementById("loadingBooking");
  const tableBody = document.getElementById("vehicleBookingTableBody");
  if (loading) loading.style.display = "block";
  if (tableBody) tableBody.innerHTML = "";

  try {
    const params = new URLSearchParams();
    if (search) params.append("search", search);
    if (bookingFilter) params.append("bookingFilter", bookingFilter);
    params.append("page", page);
    params.append("per_page", per_page);

    // Cache for 5 minutes
    const result = await apiFetchWithCache(
      `/vehicle-bookings?${params.toString()}`,
      { method: 'GET' },
      5 * 60 * 1000
    );

    if (loading) loading.style.display = "none";

    if (result.success) {
      let data = [];
      let meta = {};

      // Option A: Root Meta
      if (result.meta) {
        data = result.data;
        meta = result.meta;
      }
      // Option B: Nested Meta
      else if (
        result.data &&
        Array.isArray(result.data.data) &&
        result.data.current_page
      ) {
        data = result.data.data;
        meta = result.data;
      }
      // Fallback: Client-side pagination
      else if (Array.isArray(result.data)) {
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
        populateVehicleBookingTable(data);
        updateBookingPaginationControls(meta);
      } else {
        if (tableBody)
          tableBody.innerHTML = `<div class="text-center text-muted py-3">No bookings found</div>`;
        // Clear pagination
        const container = document.getElementById("vehicleBookingPagination");
        if (container) container.innerHTML = "";
      }
    } else {
      showError(result.message || "Failed to load bookings.");
    }
  } catch (error) {
    if (loading) loading.style.display = "none";
    // console.error(error);
  }
}

// Render the booking table
function populateVehicleBookingTable(bookings) {
  const tableBody = document.getElementById("vehicleBookingTableBody");
  if (!tableBody) return;
  tableBody.innerHTML = "";

  const fragment = document.createDocumentFragment();

  bookings.forEach((booking) => {
    const row = document.createElement("div");
    row.className = "content-row d-flex border-bottom py-2 align-items-center";

    const userName = booking.user
      ? booking.user.user_fullname
      : booking.staff
        ? booking.staff.staff_fullname
        : "-";
    const dateBook = booking.datetime_booking
      ? new Date(booking.datetime_booking).toLocaleString("en-GB")
      : "-";
    const dateRet = booking.datetime_return
      ? new Date(booking.datetime_return).toLocaleString("en-GB")
      : "-";

    row.innerHTML = `
            <div class="col ps-3 fw-bold text-dark">${booking.vehicle.vehicle_name}<br><small>(${booking.vehicle.plate_number
      })</small></div>
            <div class="col fw-bold text-dark">${userName}</div>
            <div class="col">${dateBook}</div>
            <div class="col">${dateRet}</div>
            <div class="col text-center">
                <button class="btn btn-sm btn-warning me-2 edit-btn" data-obj='${JSON.stringify(
        booking
      ).replace(/'/g, "&apos;")}' title="Edit">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-danger delete-btn" 
                        data-id="${booking.id}"
                        data-vehicle-id="${booking.vehicle.id}"
                        data-vehicle-name="${booking.vehicle.vehicle_name}"
                        data-vehicle-plate="${booking.vehicle.plate_number}"
                        title="Delete">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        `;
    fragment.appendChild(row);
  });

  tableBody.appendChild(fragment);
}

// ==================== PAGINATION ====================

// Update pagination controls
// Update pagination controls
function updateBookingPaginationControls(meta) {
  bookingPaginationState = {
    ...bookingPaginationState,
    currentPage: meta.current_page,
    lastPage: meta.last_page,
  };

  // Render standardized pagination
  renderPagination('vehicleBookingPagination', meta, (newPage) => {
    const search = document.getElementById("vehicleBookingSearch")?.value || "";
    const filter = document.getElementById("vehicleBookingFilter")?.value || "";
    getAllVehicleBookings(search, filter, newPage);
  });
}



// ==================== CRUD OPERATIONS ====================

// DELETE
async function deleteVehicleBooking(id, vehicleInfo = null) {
  showLoading();
  try {
    // 1. Delete the booking
    const result = await apiFetch(`/vehicle-bookings/${id}`, {
      method: "DELETE",
    });

    if (result.success) {
      // 2. If success, update vehicle status to 'Available'
      if (vehicleInfo && vehicleInfo.id) {
        try {
          await apiFetch(`/vehicles/${vehicleInfo.id}`, {
            method: "PUT",
            body: JSON.stringify({
              vehicle_name: vehicleInfo.name,
              plate_number: vehicleInfo.plate,
              status: "Available",
            }),
          });
        } catch (updateErr) {
          console.error("Failed to update vehicle status:", updateErr);
        }
      }

      // 3. Refresh UI
      showSuccess("Success!", "Booking deleted & vehicle marked Available!");
      if (typeof refreshVehicleSummary === "function") refreshVehicleSummary();

      // Refresh main table
      getAllVehicleBookings();
      getAllVehicles();

      // Refresh the 'Available Vehicles' dropdown since we just freed one up
      fetchVehicle();
    } else {
      showError(result.message || "Delete failed");
    }
  } catch (err) {
    console.error(err);
  } finally {
    hideLoading();
  }
}

// UPDATE PREPARATION
function openUpdateVehicleBookingModal(booking) {
  const modal = bootstrap.Modal.getOrCreateInstance(
    document.getElementById("updateVehicleBookingModal")
  );
  const vInput = document.getElementById("updateBookingVehicleInput");
  const uInput = document.getElementById("updateUsedBy");

  vInput.value = `${booking.vehicle.vehicle_name} (${booking.vehicle.plate_number})`;
  vInput.dataset.selectedId = booking.vehicle.id;

  if (booking.user) {
    uInput.value = `${booking.user.user_fullname} (${booking.user.id}) - user`;
    uInput.dataset.selectedUserId = booking.user.id;
    uInput.dataset.selectedStaffId = null;
  } else if (booking.staff) {
    uInput.value = `${booking.staff.staff_fullname} (${booking.staff.id}) - staff`;
    uInput.dataset.selectedStaffId = booking.staff.id;
    uInput.dataset.selectedUserId = null;
  }

  document.getElementById("updateBookingDateInput").value =
    formatForDateTimeLocal(booking.datetime_booking);
  document.getElementById("updateReturnDateInput").value =
    formatForDateTimeLocal(booking.datetime_return);
  document.getElementById("updateVehicleBookingForm").dataset.bookingId =
    booking.id;

  modal.show();
}

// ==================== INITIALIZATION ====================

window.addEventListener("DOMContentLoaded", () => {
  // 1. Initial Data Fetch
  getAllVehicleBookings();
  fetchVehicle(); // Initial load for cache/fallback
  // fetchUserAndStaff(); // Removed eager load

  // 2. Setup Autocompletes (Create Modal)
  // vehicle - switched to Server Dropdown
  initServerDropdown(
    document.getElementById("bookingVehicleInput"), //inputEl
    document.getElementById("vehicleDropdown"), //dropdownEl
    searchVehicles, //fetchFunction
    (v) => { //onSelect
      document.getElementById("bookingVehicleInput").dataset.selectedId = v.id;
    },
    (v) => `${v.vehicle_name} (${v.plate_number})` //renderItem
  );

  // user and staff - switched to Server Dropdown
  initServerDropdown(
    document.getElementById("usedBy"),
    document.getElementById("usedByDropdown"),
    searchUserAndStaff,
    (p) => {
      const input = document.getElementById("usedBy");
      input.dataset.selectedUserId = p.user_id;
      input.dataset.selectedStaffId = p.staff_id;
    },
    (p) => `${p.fullname} - ${p.role}`
  );

  // 3. Setup Autocompletes (Update Modal)
  // vehicle
  initServerDropdown(
    document.getElementById("updateBookingVehicleInput"),
    document.getElementById("updateVehicleDropdown"),
    searchVehicles,
    (v) => {
      document.getElementById("updateBookingVehicleInput").dataset.selectedId =
        v.id;
    },
    (v) => `${v.vehicle_name} (${v.plate_number})`
  );

  // user and staff
  initServerDropdown(
    document.getElementById("updateUsedBy"),
    document.getElementById("updateUsedByDropdown"),
    searchUserAndStaff,
    (p) => {
      const input = document.getElementById("updateUsedBy");
      input.dataset.selectedUserId = p.user_id;
      input.dataset.selectedStaffId = p.staff_id;
    },
    (p) => `${p.fullname} - ${p.role}`
  );

  // 4. Search Listeners
  const searchInput = document.getElementById("vehicleBookingSearch");
  const sortInput = document.getElementById("vehicleBookingSortBy");

  if (searchInput && sortInput) {
    const runSearch = debounce(() => {
      getAllVehicleBookings({
        search: searchInput.value,
        bookingFilter: sortInput.value,
        page: 1,
      });
    }, 100);

    searchInput.addEventListener("input", runSearch);
    sortInput.addEventListener("change", runSearch);
  }

  // 5. Refresh Button Listener
  const refreshBtn = document.getElementById("refreshVehicleBookingBtn");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", () => {
      const sortInput = document.getElementById("vehicleBookingSortBy");
      if (sortInput) sortInput.value = "";

      getAllVehicleBookings({
        search: bookingPaginationState.search,
        bookingFilter: "",
        page: bookingPaginationState.currentPage,
        per_page: bookingPaginationState.perPage,
      });
    });
  }

  // 6. Form Listeners
  const addBookingForm = document.getElementById("addVehicleBookingForm");
  if (addBookingForm) {
    addBookingForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = document.getElementById("createBookingBtn");
      const vInput = document.getElementById("bookingVehicleInput");
      const uInput = document.getElementById("usedBy");

      const payload = {
        vehicle_id: vInput.dataset.selectedId,
        user_id:
          uInput.dataset.selectedUserId !== "null"
            ? uInput.dataset.selectedUserId
            : null,
        staff_id:
          uInput.dataset.selectedStaffId !== "null"
            ? uInput.dataset.selectedStaffId
            : null,
        datetime_booking: document.getElementById("bookingDateInput").value,
        datetime_return:
          document.getElementById("returnDateInput").value || null,
      };

      if (!payload.vehicle_id || (!payload.user_id && !payload.staff_id)) {
        showError("Select vehicle and user/staff.");
        return;
      }

      btn.disabled = true;
      btn.textContent = "Creating...";

      try {
        const result = await apiFetch("/vehicle-bookings", {
          method: "POST",
          body: JSON.stringify(payload),
        });

        if (result.success) {
          showSuccess("Success!", "Booking created!");
          bootstrap.Modal.getOrCreateInstance(
            document.getElementById("addVehicleBookingModal")
          ).hide();
          e.target.reset();
          // Clear datasets
          delete vInput.dataset.selectedId;
          delete uInput.dataset.selectedUserId;
          delete uInput.dataset.selectedStaffId;
          getAllVehicleBookings();
          getAllVehicles();
          if (typeof refreshVehicleSummary === "function")
            refreshVehicleSummary();
        } else {
          showError(result.message || "Failed.");
        }
      } catch (err) {
        console.error(err);
      } finally {
        btn.disabled = false;
        btn.textContent = "Create Booking";
      }
    });
  }

  const updateBookingForm = document.getElementById("updateVehicleBookingForm");
  if (updateBookingForm) {
    updateBookingForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const bookingId = e.target.dataset.bookingId;
      const btn = document.getElementById("updateBookingBtn");
      const vInput = document.getElementById("updateBookingVehicleInput");
      const uInput = document.getElementById("updateUsedBy");

      const payload = {
        vehicle_id: vInput.dataset.selectedId,
        user_id:
          uInput.dataset.selectedUserId !== "null"
            ? uInput.dataset.selectedUserId
            : null,
        staff_id:
          uInput.dataset.selectedStaffId !== "null"
            ? uInput.dataset.selectedStaffId
            : null,
        datetime_booking: document.getElementById("updateBookingDateInput")
          .value,
        datetime_return:
          document.getElementById("updateReturnDateInput").value || null,
      };

      btn.disabled = true;
      btn.textContent = "Updating...";

      try {
        const result = await apiFetch(`/vehicle-bookings/${bookingId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });

        if (result.success) {
          showSuccess("Success!", "Updated successfully!");
          bootstrap.Modal.getOrCreateInstance(
            document.getElementById("updateVehicleBookingModal")
          ).hide();
          if (typeof refreshVehicleSummary === "function")
            refreshVehicleSummary();
          getAllVehicleBookings();
        } else {
          showError(result.message || "Update failed.");
        }
      } catch (err) {
        console.error(err);
      } finally {
        btn.disabled = false;
        btn.textContent = "Update";
      }
    });
  }

  const openModalBtn = document.getElementById("openModalBtn");
  if (openModalBtn) {
    openModalBtn.addEventListener("click", () => {
      bootstrap.Modal.getOrCreateInstance(
        document.getElementById("addVehicleBookingModal")
      ).show();
    });
  }

  // Event Delegation for Table Actions (Edit/Delete)
  const tableBody = document.getElementById("vehicleBookingTableBody");
  if (tableBody) {
    tableBody.addEventListener("click", (e) => {
      // Handle Delete
      const deleteBtn = e.target.closest(".delete-btn");
      if (deleteBtn) {
        const id = deleteBtn.dataset.id;
        const vehicleInfo = {
          id: deleteBtn.dataset.vehicleId,
          name: deleteBtn.dataset.vehicleName,
          plate: deleteBtn.dataset.vehiclePlate,
        };
        showConfirm("Permanently delete this booking?", () =>
          deleteVehicleBooking(id, vehicleInfo)
        );
      }

      // Handle Edit
      const editBtn = e.target.closest(".edit-btn");
      if (editBtn) {
        const booking = JSON.parse(editBtn.dataset.obj);
        openUpdateVehicleBookingModal(booking);
      }
    });
  }
});
