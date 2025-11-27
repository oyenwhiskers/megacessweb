$(document).ready(function() {
  const API_URL = "https://mwms.megacess.com/api/v1/staff";
  const token = getToken();

  if (!token) {
    Swal.fire({
      icon: "error",
      title: "Authentication Required!",
      text: "Please login first before proceeding.",
      confirmButtonText: "Log in now."
    }).then(() => {
      window.location.href = "/megacessweb/assets/pages/log-in.html";
    });
    return;
  }

  const headers = {
    "Authorization": "Bearer " + token,
    "Content-Type": "application/json",
    "Accept": "application/json"
  };

  // --- URL sync for Worker/Staff toggle ---
function showEmployeeType(type, push) {
  if(type === 'staff') {
    // Show staff section
    $('#staffSection').removeClass('d-none');
    $('#workerSection').addClass('d-none');
    $('#staff').prop('checked', true);

    if(typeof fetchUsers === 'function') fetchUsers(1);
  } else {
    // Show worker section
    $('#workerSection').removeClass('d-none');
    $('#staffSection').addClass('d-none');
    $('#worker').prop('checked', true);

    if(typeof fetchWorkers === 'function') fetchWorkers(1);
  }

  const url = '?employee=' + type;
  if(push) {
    history.pushState({employee: type}, '', url);
  } else {
    history.replaceState({employee: type}, '', url);
  }
}


  // Initial state from URL
  const params = new URLSearchParams(window.location.search);
  const initialEmployee = params.get('employee') === 'staff' ? 'staff' : 'worker';
  showEmployeeType(initialEmployee, false);

  // Toggle by radio button
  $('#worker').on('change', function() {
    if($(this).is(':checked')) showEmployeeType('worker', true);
  });
  $('#staff').on('change', function() {
    if($(this).is(':checked')) showEmployeeType('staff', true);
  });

  // Handle back/forward
  window.addEventListener('popstate', function(ev) {
    const p = new URLSearchParams(window.location.search).get('employee');
    showEmployeeType(p === 'staff' ? 'staff' : 'worker', false);
  });

  let currentPage = 1;
  let lastPage = 1;

  function fetchWorkers(page = 1) {
    // Only fetch if Worker section is visible
    if ($('#workerList').hasClass('d-none')) return;

    const searchInput = $("#searchWorker").val().trim();
    const params = {
      per_page: 15,
      page: page,
      ...(searchInput ? { search: searchInput } : {})
    };

    $("#workerList .row").html('<div class="col-12 text-center text-muted py-3">Loading...</div>');

    $.ajax({
      url: API_URL,
      method: "GET",
      headers: headers,
      data: params,
      success: function(response) {
        if (response && response.success && Array.isArray(response.data)) {
          renderWorker(response.data);
          currentPage = response.meta?.current_page || 1;
          lastPage = response.meta?.last_page || 1;
          renderPagination();
        } else {
          $("#workerList .row").html('<div class="col-12 text-center text-muted">No workers found</div>');
          $("#workerPagination").remove();
        }
      },
      error: function(xhr) {
        console.error("Failed to load workers:", xhr.responseText);
        $("#workerList .row").html('<div class="col-12 text-center text-danger">Error loading workers</div>');
        $("#workerPagination").remove();
      }
    });
  }

  function renderWorker(workers) {
    const $row = $("#workerList .row");
    $row.empty();

    if (!workers.length) {
      $row.append('<div class="col-12 text-center text-muted">No workers found</div>');
      return;
    }

    workers.forEach(worker => {
      const workerId = worker.id || "";
      const workerName = worker.staff_fullname || "Unknown";
      const workerAvatar = worker.staff_img 
        ? (worker.staff_img.startsWith("http") ? worker.staff_img : `https://mwms.megacess.com${worker.staff_img}`)
        : "https://via.placeholder.com/64";
      
      // Safely access nested base_salary property
      let workerBaseSalary = "Not set";
      if (worker.base_salary && worker.base_salary.base_salary != null) {
        workerBaseSalary = worker.base_salary.base_salary;
      }

      const $col = $("<div>").addClass("col-12 col-sm-6 col-md-4");
      const $card = $(`
        <div class="card h-100 shadow-sm">
          <div class="card-body d-flex gap-3 align-items-center">
            <img src="${workerAvatar}" alt="${workerName}" class="rounded-circle" width="64" height="64">
            <div class="flex-grow-1">
              <h6 class="mb-1">${workerName}</h6>
              <small class="text-muted d-block">Base Salary: <strong>${workerBaseSalary}</strong></small>
            </div>
            <div class="d-flex flex-column ms-auto">
              <a href="/megacessweb/pages/manage-payment-rate-edit-salary-worker.html?id=${encodeURIComponent(workerId)}" 
                 class="btn btn-sm btn-outline-success" title="Edit base salary">
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
    $("#workerPagination").remove();
    if (lastPage <= 1) return;

    const $container = $("#workerList");
    const $pagination = $('<div id="workerPagination" class="mt-3 text-center"></div>');

    const $prev = $('<button class="btn btn-sm btn-outline-success mx-1"><i class="bi bi-chevron-left"></i></button>');
    $prev.prop("disabled", currentPage === 1);
    $prev.on("click", () => fetchWorkers(currentPage - 1));
    $pagination.append($prev);

    for (let i = 1; i <= lastPage; i++) {
      const $btn = $(`<button class="btn btn-sm mx-1">${i}</button>`);
      $btn.addClass(i === currentPage ? "btn-success" : "btn-outline-success");
      $btn.on("click", () => fetchWorkers(i));
      $pagination.append($btn);
    }

    const $next = $('<button class="btn btn-sm btn-outline-success mx-1"><i class="bi bi-chevron-right"></i></button>');
    $next.prop("disabled", currentPage === lastPage);
    $next.on("click", () => fetchWorkers(currentPage + 1));
    $pagination.append($next);

    $container.append($pagination);
  }

  // Search input
  $("#searchWorker").on("input", () => fetchWorkers(1));

  // Initial fetch
  fetchWorkers();

  // Re-fetch when Worker section becomes visible
  $('input[name="employeeType"]').on("change", () => fetchWorkers(1));
});
