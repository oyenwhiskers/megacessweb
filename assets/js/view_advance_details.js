document.addEventListener('DOMContentLoaded', function() {
  const loadingSpinner = document.getElementById('loadingSpinner');
  const errorMessage = document.getElementById('errorMessage');
  const contentArea = document.getElementById('contentArea');
  const advanceRecordsList = document.getElementById('advanceRecordsList');
  const paginationNav = document.getElementById('paginationNav');
  const paginationList = document.getElementById('paginationList');
  const paginationInfo = document.getElementById('paginationInfo');

  // Get URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const type = urlParams.get('type');
  const id = urlParams.get('id');

  // Pagination state
  let allAdvances = [];
  let currentPage = 1;
  const recordsPerPage = 5;

  // Helper: get token
  function getAuthToken() {
    return localStorage.getItem('authToken') || sessionStorage.getItem('authToken') || null;
  }

  // Helper: format currency
  function formatCurrency(amount) {
    return parseFloat(amount || 0).toFixed(2);
  }

  // Helper: format date to DD/MM/YYYY
  function formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-GB');
  }

  // Helper: get status badge
  function getStatusBadge(status) {
    const statusLower = (status || '').toLowerCase();
    if (statusLower === 'paid') {
      return '<span class="badge bg-success">Paid</span>';
    } else if (statusLower === 'not_paid') {
      return '<span class="badge bg-danger">Not Paid</span>';
    } else if (statusLower === 'partially_paid') {
      return '<span class="badge bg-warning">Partially Paid</span>';
    }
    return `<span class="badge bg-secondary">${status || '-'}</span>`;
  }

  // Fetch advance details
  async function fetchAdvanceDetails() {
    if (!type || !id) {
      showError('Missing required parameters: type and id');
      return;
    }

    const token = getAuthToken();
    if (!token) {
      showError('Not authenticated. Please log in again.');
      return;
    }

    try {
      loadingSpinner.classList.remove('d-none');
      contentArea.classList.add('d-none');
      errorMessage.classList.add('d-none');

      const url = `https://mwms.megacess.com/api/v1/advances/${type}/${id}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      const result = await response.json();

      if (response.ok && result.success) {
        displayAdvanceDetails(result.data);
      } else {
        showError(result.message || 'Failed to load advance details.');
      }
    } catch (err) {
      showError(err.message || 'Error loading advance details.');
    } finally {
      loadingSpinner.classList.add('d-none');
    }
  }

  // Display advance details
  function displayAdvanceDetails(data) {
    // Display person summary
    const personName = document.getElementById('personName');
    const personInfo = document.getElementById('personInfo');
    const personAvatar = document.getElementById('personAvatar');
    const totalOutstanding = document.getElementById('totalOutstanding');
    const totalLoan = document.getElementById('totalLoan');
    const totalPaid = document.getElementById('totalPaid');
    const loanCount = document.getElementById('loanCount');

    personName.textContent = data.name || '-';
    personInfo.textContent = data.type === 'staff' ? 'Worker' : 'Staff';

    // Set avatar
    if (data.img) {
      let imgUrl = data.img;
      if (!imgUrl.startsWith('http') && !imgUrl.startsWith('/')) {
        imgUrl = `https://mwms.megacess.com/storage/user-images/${imgUrl}`;
      } else if (imgUrl.startsWith('/')) {
        imgUrl = `https://mwms.megacess.com${imgUrl}`;
      }
      personAvatar.innerHTML = `<img src="${imgUrl}" class="rounded-circle" style="width:80px;height:80px;object-fit:cover;" alt="${data.name}">`;
    } else {
      personAvatar.innerHTML = `<div class="rounded-circle bg-dark d-flex align-items-center justify-content-center" style="width:80px;height:80px;"><i class="bi bi-person text-white" style="font-size:3rem;"></i></div>`;
    }

    totalOutstanding.textContent = `RM ${formatCurrency(data.total_outstanding_balance)}`;
    totalLoan.textContent = `RM ${formatCurrency(data.total_loan_amount)}`;
    totalPaid.textContent = `RM ${formatCurrency(data.total_paid_amount)}`;
    loanCount.textContent = data.loan_count || 0;

    // Store all advances and reset pagination
    allAdvances = data.advances || [];
    currentPage = 1;

    // Display paginated records
    renderAdvanceRecords();
    renderPagination();

    contentArea.classList.remove('d-none');
  }

  // Render advance records for current page
  function renderAdvanceRecords() {
    if (!allAdvances || allAdvances.length === 0) {
      advanceRecordsList.innerHTML = '<div class="text-center text-muted py-5">No advance records found.</div>';
      paginationNav.classList.add('d-none');
      paginationInfo.textContent = '';
      return;
    }

    const totalPages = Math.ceil(allAdvances.length / recordsPerPage);
    const startIndex = (currentPage - 1) * recordsPerPage;
    const endIndex = startIndex + recordsPerPage;
    const currentRecords = allAdvances.slice(startIndex, endIndex);

    advanceRecordsList.innerHTML = currentRecords.map(advance => {
      return `
        <div class="card mb-3 border">
          <div class="card-body">
            <div class="row">
              <div class="col-md-6 mb-2">
                <div class="text-muted small">Loan Date</div>
                <div class="fw-semibold">${formatDate(advance.loan_date)}</div>
              </div>
              <div class="col-md-6 mb-2">
                <div class="text-muted small">Status</div>
                <div>${getStatusBadge(advance.loan_status)}</div>
              </div>
              <div class="col-md-6 mb-2">
                <div class="text-muted small">Loan Amount</div>
                <div class="fw-bold fs-5">RM ${formatCurrency(advance.loan_amount)}</div>
              </div>
              <div class="col-md-6 mb-2">
                <div class="text-muted small">Paid Amount</div>
                <div class="fw-bold text-success">RM ${formatCurrency(advance.loan_paid_amount)}</div>
              </div>
              <div class="col-md-6 mb-2">
                <div class="text-muted small">Remaining Amount</div>
                <div class="fw-bold text-danger">RM ${formatCurrency(advance.remaining_amount)}</div>
              </div>
              <div class="col-md-6 mb-2">
                <div class="text-muted small">Created By</div>
                <div>${advance.creator?.user_fullname || '-'}</div>
              </div>
              <div class="col-12 mb-2">
                <div class="text-muted small">Remarks</div>
                <div>${advance.loan_remarks || '-'}</div>
              </div>
              <div class="col-12">
                <div class="text-muted small">Created At</div>
                <div class="small">${formatDate(advance.created_at)}</div>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Update pagination info
    const startRecord = startIndex + 1;
    const endRecord = Math.min(endIndex, allAdvances.length);
    paginationInfo.textContent = `Showing ${startRecord}-${endRecord} of ${allAdvances.length} records`;
  }

  // Render pagination controls
  function renderPagination() {
    const totalPages = Math.ceil(allAdvances.length / recordsPerPage);
    
    if (totalPages <= 1) {
      paginationNav.classList.add('d-none');
      return;
    }

    paginationNav.classList.remove('d-none');
    let paginationHTML = '';

    // Previous button
    paginationHTML += `
      <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
        <a class="page-link" href="#" data-page="${currentPage - 1}" ${currentPage === 1 ? 'tabindex="-1" aria-disabled="true"' : ''}>
          <i class="bi bi-chevron-left"></i>
        </a>
      </li>
    `;

    // Page numbers
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage < maxVisiblePages - 1) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    if (startPage > 1) {
      paginationHTML += `
        <li class="page-item">
          <a class="page-link" href="#" data-page="1">1</a>
        </li>
      `;
      if (startPage > 2) {
        paginationHTML += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      paginationHTML += `
        <li class="page-item ${i === currentPage ? 'active' : ''}">
          <a class="page-link" href="#" data-page="${i}">${i}</a>
        </li>
      `;
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        paginationHTML += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
      }
      paginationHTML += `
        <li class="page-item">
          <a class="page-link" href="#" data-page="${totalPages}">${totalPages}</a>
        </li>
      `;
    }

    // Next button
    paginationHTML += `
      <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
        <a class="page-link" href="#" data-page="${currentPage + 1}" ${currentPage === totalPages ? 'tabindex="-1" aria-disabled="true"' : ''}>
          <i class="bi bi-chevron-right"></i>
        </a>
      </li>
    `;

    paginationList.innerHTML = paginationHTML;

    // Attach event listeners
    paginationList.querySelectorAll('.page-link').forEach(link => {
      link.addEventListener('click', function(e) {
        e.preventDefault();
        const page = parseInt(this.getAttribute('data-page'));
        if (page && page !== currentPage && page >= 1 && page <= totalPages) {
          currentPage = page;
          renderAdvanceRecords();
          renderPagination();
          // Scroll to top of records list
          advanceRecordsList.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  }

  // Show error message
  function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.remove('d-none');
    contentArea.classList.add('d-none');
  }

  // Initial load
  fetchAdvanceDetails();
});

