// This salary_get_user.js can handle fetching all users details, displaying it, filtering, searching, and paginating users for Salary Management tab

$(document).ready(function() {
  const API_URL = "https://mwms.megacess.com/api/v1/users"; 
  const token = getToken();

  if (!token) {
    console.error("Token not found. Please ensure user is authenticated.");
    return;
  }

  const headers = {
    "Authorization": "Bearer " + token,
    "Content-Type": "application/json",
    "Accept": "application/json"
  };

  let currentPage = 1;
  let lastPage = 1;

  function fetchUsers(page = 1) {
    const roleId = $("input[name='staffFilter']:checked").attr("id") || "filterAll";
    const roleMap = { filterManager: "manager", filterChecker: "checker", filterAdmin: "admin", filterMandor: "mandor" };
    const role = roleMap[roleId] || "";

    const searchInput = $("#searchStaff").val().trim();

    const params = {
      per_page: 15,
      page: page,
      ...(role ? { role } : {}),
      ...(searchInput ? { search: searchInput } : {})
    };

    $("#staffList .row").html('<div class="col-12 text-center text-muted py-3">Loading...</div>');

    $.ajax({
      url: API_URL,
      method: "GET",
      headers: headers,
      data: params,
      success: function(response) {
        if (response && response.success && Array.isArray(response.data)) {
          renderStaff(response.data);
          currentPage = response.meta.current_page;
          lastPage = response.meta.last_page;
          renderPagination();
        } else {
          $("#staffList .row").html('<div class="col-12 text-center text-muted">No users found</div>');
          $("#staffPagination").remove();
        }
      },
      error: function(xhr) {
        console.error("Failed to load users:", xhr.responseText);
        $("#staffList .row").html('<div class="col-12 text-center text-danger">Error loading users</div>');
        $("#staffPagination").remove();
      }
    });
  }

  function renderStaff(users) {
    const $row = $("#staffList .row");
    $row.empty();

    if (!users.length) {
      $row.append('<div class="col-12 text-center text-muted">No staff found</div>');
      return;
    }

    users.forEach(user => {
      const id = user.id ?? "";
      const name = user.user_nickname || user.user_fullname || "Unknown";
      const role = user.user_role ? user.user_role.charAt(0).toUpperCase() + user.user_role.slice(1) : "Staff";
      const img = user.user_img
        ? (user.user_img.startsWith("http") ? user.user_img : `https://mwms.megacess.com${user.user_img}`)
        : "https://via.placeholder.com/64";

      const $col = $("<div>").addClass("col-12 col-sm-6 col-md-4");
      const $card = $(`
        <div class="card h-100 shadow-sm">
          <div class="card-body d-flex gap-3 align-items-center">
            <img src="${img}" alt="${name}" class="rounded-circle" width="64" height="64">
            <div class="flex-grow-1">
              <h6 class="mb-1">${name}</h6>
              <small class="text-muted">${role}</small>
            </div>
            <div class="d-flex flex-column ms-2">
              <a href="/megacessweb/pages/manage-payment-rate-edit-salary.html?id=${encodeURIComponent(id)}"
                class="btn btn-sm btn-outline-success mb-1" title="Edit base salary">
                <i class="bi bi-pencil-fill"></i>
              </a>
            </div>
          </div>
        </div>
      `);

      $col.append($card);
      $row.append($col);
    });
  }

  function renderPagination() {
    $("#staffPagination").remove();

    if (lastPage <= 1) return;

    const $container = $("#staffList");
    const $pagination = $('<div id="staffPagination" class="mt-3 text-center"></div>');

    // Previous button
    const $prev = $('<button class="btn btn-sm btn-outline-success mx-1"><i class="bi bi-chevron-left"></i></button>');
    $prev.prop("disabled", currentPage === 1);
    $prev.on("click", () => { fetchUsers(currentPage - 1); });
    $pagination.append($prev);

    // Page buttons
    for (let i = 1; i <= lastPage; i++) {
      const $btn = $(`<button class="btn btn-sm mx-1">${i}</button>`);
      $btn.addClass(i === currentPage ? "btn-success" : "btn-outline-success");
      $btn.on("click", () => { fetchUsers(i); });
      $pagination.append($btn);
    }

    // Next button
    const $next = $('<button class="btn btn-sm btn-outline-success mx-1"><i class="bi bi-chevron-right"></i></button>');
    $next.prop("disabled", currentPage === lastPage);
    $next.on("click", () => { fetchUsers(currentPage + 1); });
    $pagination.append($next);

    $container.append($pagination);
  }

  // Search + filter triggers
  $("#searchStaff").on("input", () => fetchUsers(1));
  $("input[name='staffFilter']").on("change", () => fetchUsers(1));

  // Initial fetch
  fetchUsers();
});

