document.addEventListener('DOMContentLoaded', function () {
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

    try {
      loadingSpinner.classList.remove('d-none');
      contentArea.classList.add('d-none');
      errorMessage.classList.add('d-none');

      const result = await apiFetch(`/advances/${type}/${id}`);

      if (result.success) {
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
    const totalOutstanding = document.getElementById('totalOutstanding');
    const totalLoan = document.getElementById('totalLoan');
    const totalPaid = document.getElementById('totalPaid');
    const loanCount = document.getElementById('loanCount');

    personName.textContent = data.name || '-';
    personInfo.textContent = data.type === 'staff' ? 'Worker' : 'Staff';

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
              <div class="col-12 mb-3">
                <div class="text-muted small">Created At</div>
                <div class="small">${formatDate(advance.created_at)}</div>
              </div>
              <div class="col-12 d-flex justify-content-end gap-2 border-top pt-2">
                <button type="button" class="btn btn-sm btn-outline-primary edit-btn" data-id="${advance.loan_id}">
                  <i class="bi bi-pencil-square me-1"></i> Edit
                </button>
                <button type="button" class="btn btn-sm btn-outline-danger delete-btn" data-id="${advance.loan_id}">
                  <i class="bi bi-trash me-1"></i> Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Attach event listeners to Edit and Delete buttons
    advanceRecordsList.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        const loanId = parseInt(this.getAttribute('data-id'));
        const advance = allAdvances.find(a => a.loan_id === loanId);
        if (advance) {
          document.getElementById('editLoanId').value = advance.loan_id;
          
          let loanDate = advance.loan_date;
          if (loanDate && loanDate.includes('T')) {
            loanDate = loanDate.split('T')[0];
          } else if (loanDate) {
            const d = new Date(loanDate);
            if (!isNaN(d.getTime())) {
              loanDate = d.toISOString().split('T')[0];
            }
          }
          document.getElementById('editAdvanceDate').value = loanDate;
          document.getElementById('editAdvanceAmount').value = advance.loan_amount;
          document.getElementById('editAdvancePaidAmount').value = advance.loan_paid_amount;
          document.getElementById('editAdvanceStatus').value = advance.loan_status;
          document.getElementById('editAdvanceRemarks').value = advance.loan_remarks || '';
          
          const modal = new bootstrap.Modal(document.getElementById('editAdvanceModal'));
          modal.show();
        }
      });
    });

    advanceRecordsList.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        const loanId = this.getAttribute('data-id');
        showConfirm('This advance record will be permanently deleted.', async () => {
          try {
            await apiFetch(`/advances/${type}/record/${loanId}`, {
              method: 'DELETE'
            });
            clearApiCache('advances');
            showSuccess('Deleted!', 'Advance record has been deleted.');
            fetchAdvanceDetails();
          } catch (err) {
            showError(err.message || 'Failed to delete advance record.');
          }
        });
      });
    });

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
      link.addEventListener('click', function (e) {
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

  // Handle edit form submit
  const editAdvanceForm = document.getElementById('editAdvanceForm');
  if (editAdvanceForm) {
    editAdvanceForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      const loanId = document.getElementById('editLoanId').value;
      const loanDate = document.getElementById('editAdvanceDate').value;
      const loanAmount = document.getElementById('editAdvanceAmount').value;
      const loanPaidAmount = document.getElementById('editAdvancePaidAmount').value;
      const loanStatus = document.getElementById('editAdvanceStatus').value;
      const loanRemarks = document.getElementById('editAdvanceRemarks').value;

      try {
        const payload = {
          loan_date: loanDate,
          loan_amount: parseFloat(loanAmount),
          loan_paid_amount: parseFloat(loanPaidAmount),
          loan_status: loanStatus,
          loan_remarks: loanRemarks
        };

        await apiFetch(`/advances/${type}/record/${loanId}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });

        clearApiCache('advances');
        showSuccess('Saved!', 'Advance record has been updated.');
        
        // Hide modal
        const modalEl = document.getElementById('editAdvanceModal');
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) {
          modal.hide();
        } else {
          // If instance not initialized/found by getInstance
          const newModal = bootstrap.Modal.getOrCreateInstance(modalEl);
          newModal.hide();
        }

        fetchAdvanceDetails();
      } catch (err) {
        showError(err.message || 'Failed to update advance record.');
      }
    });
  }

  // Initial load
  fetchAdvanceDetails();
});

