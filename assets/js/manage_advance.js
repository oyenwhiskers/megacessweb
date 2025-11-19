document.addEventListener('DOMContentLoaded', function() {
  const workerTab = document.getElementById('workerTab');
  const staffTab = document.getElementById('staffTab');
  const advanceList = document.querySelector('.advance-list');
  const searchInput = document.getElementById('advanceSearch');

  let currentType = 'worker'; // 'staff' or 'worker'
  let currentPage = 1;
  let currentRole = '';
  let currentStatus = '';
  let perPage = 15;

  // Helper: get token
  function getAuthToken() {
    return localStorage.getItem('authToken') || sessionStorage.getItem('authToken') || null;
  }

  // Helper: create or get modal
  function getAdvanceModal() {
    let modal = document.getElementById('advanceViewModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'advanceViewModal';
      modal.innerHTML = `
        <div class="modal fade" tabindex="-1" id="advanceModal" aria-hidden="true">
          <div class="modal-dialog modal-dialog-centered" style="max-width:600px;">
            <div class="modal-content" style="background:#d2f5d7;">
              <div class="modal-header border-0 pb-0">
                <h5 class="modal-title fw-bold">View Existing Advance & Expense Details</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div class="modal-body" id="advanceModalBody"></div>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }
    return modal;
  }

  // Helper: show modal with content (optionally show immediately)
  function showAdvanceModal(html, showNow = true) {
    getAdvanceModal();
    document.getElementById('advanceModalBody').innerHTML = html;
    const modalInstance = new bootstrap.Modal(document.getElementById('advanceModal'));
    // Remove modal from DOM on close to fix lingering backdrop
    document.getElementById('advanceModal').addEventListener('hidden.bs.modal', function() {
      const modalEl = document.getElementById('advanceViewModal');
      if (modalEl) modalEl.remove();
    }, { once: true });
    if (showNow) modalInstance.show();
    return modalInstance;
  }

  // Helper: fetch and show advance details
  async function viewAdvance(item, type) {
    const token = getAuthToken();
    if (!token) return;
    let id, url;
    if (type === 'worker') {
      // Worker: use staff_id or staff.id
      id = item.staff_id || (item.staff && item.staff.id);
      url = `https://mwms.megacess.com/api/v1/advances/staff/${id}`;
    } else if (type === 'staff') {
      // Staff: use user_id or staff.id
      id = item.user_id || (item.staff && item.staff.id);
      url = `https://mwms.megacess.com/api/v1/advances/user/${id}`;
    } else {
      document.getElementById('advanceModalBody').innerHTML = `<div class='text-danger py-4'>Invalid type.</div>`;
      return;
    }
    // Show modal immediately with spinner
    const spinnerHtml = `<div class='d-flex justify-content-center align-items-center' style='min-height:200px;'><div class='spinner-border text-success'></div></div>`;
    const modalInstance = showAdvanceModal(spinnerHtml, true);
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      const result = await res.json();
      if (res.ok && result.success) {
        const d = result.data;
        const person = d.staff;
        const creator = d.creator;
        const avatar = person && person.staff_img ?
          `<img src='${person.staff_img}' class='rounded-circle me-2' style='width:50px;height:50px;object-fit:cover;' alt='${person.staff_fullname}'>` :
          `<span class='rounded-circle bg-dark d-inline-flex align-items-center justify-content-center me-2' style='width:50px;height:50px;'><i class='bi bi-person text-white' style='font-size:2rem;'></i></span>`;
        document.getElementById('advanceModalBody').innerHTML = `
          <div class='mb-2 fw-semibold'>Made for:</div>
          <div class='d-flex align-items-center border rounded p-2 mb-3 bg-white'>
            ${avatar}
            <div>
              <div class='fw-bold fs-5'>${person.staff_fullname || person.user_fullname || '-'}</div>
              <div class='text-muted'>${type === 'worker' ? 'Worker' : (d.role || 'Staff')}</div>
            </div>
          </div>
          <div class='row mb-2'>
            <div class='col-6'><span class='text-muted'>Date:</span><br>${d.loan_date ? new Date(d.loan_date).toLocaleDateString('en-GB') : '-'}</div>
            <div class='col-6'><span class='text-muted'>Created by:</span><br>${creator && creator.user_fullname ? creator.user_fullname : '-'}</div>
          </div>
          <div class='mb-2'><span class='text-muted'>Amount:</span><br>RM ${d.loan_amount || '-'}</div>
          <div class='mb-2'><span class='text-muted'>Remarks:</span><br>${d.loan_remarks || '-'}</div>
        `;
      } else {
        document.getElementById('advanceModalBody').innerHTML = `<div class='text-danger py-4'>${result.message || 'Failed to load details.'}</div>`;
      }
    } catch (err) {
      document.getElementById('advanceModalBody').innerHTML = `<div class='text-danger py-4'>${err.message || 'Error loading details.'}</div>`;
    }
  }

  // Helper: render advances
  function renderAdvances(data, type) {
    if (!advanceList) return;
    if (!data || data.length === 0) {
      advanceList.innerHTML = `<div class='text-center text-muted py-5'>No advances found.</div>`;
      return;
    }
    advanceList.innerHTML = data.map((item, idx) => {
      const person = item.staff;
      const name = person ? (person.staff_fullname || person.user_fullname || '-') : '-';
      const role = type === 'worker' ? 'Worker' : (item.role || 'Staff');
      const avatar = person && person.staff_img ?
        `<img src='${person.staff_img}' class='rounded-circle' style='width:60px;height:60px;object-fit:cover;' alt='${name}'>` :
        `<div class="rounded-circle bg-dark d-flex align-items-center justify-content-center" style="width:60px;height:60px;"><i class="bi bi-person text-white" style="font-size:2.5rem;"></i></div>`;
      return `
        <div class="advance-card d-flex align-items-center justify-content-between border rounded mb-3 p-2" style="background:#fff;">
          <div class="d-flex align-items-center gap-3">
            ${avatar}
            <div>
              <div class="fw-bold fs-5">${name}</div>
              <div class="text-muted">${role}</div>
            </div>
          </div>
          <div class="border-start" style="height:60px;"></div>
          <button class="btn btn-success d-flex align-items-center gap-2 px-3 py-1 ms-3 view-advance-btn" data-idx="${idx}" style="background:#11634b;border:none;">
            <i class="bi bi-eye"></i>
            <span>View</span>
          </button>
        </div>
      `;
    }).join('');
    // Add event listeners for view buttons
    document.querySelectorAll('.view-advance-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        const idx = this.getAttribute('data-idx');
        viewAdvance(data[idx], type);
      });
    });
  }

  // Fetch advances from API
  async function fetchAdvances() {
    const token = getAuthToken();
    if (!token) {
      advanceList.innerHTML = `<div class='text-center text-danger py-5'>Not authenticated</div>`;
      return;
    }
    const type = currentType === 'worker' ? 'staff' : 'user';
    const search = searchInput.value.trim();
    let url = `https://mwms.megacess.com/api/v1/advances?type=${type}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    if (currentRole) url += `&role=${encodeURIComponent(currentRole)}`;
    if (currentStatus) url += `&status=${encodeURIComponent(currentStatus)}`;
    url += `&per_page=${perPage}&page=${currentPage}`;
    try {
      advanceList.innerHTML = `<div class='text-center py-5'><div class='spinner-border text-success'></div></div>`;
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      const result = await res.json();
      if (res.ok && result.success) {
        renderAdvances(result.data, currentType);
      } else {
        advanceList.innerHTML = `<div class='text-center text-danger py-5'>${result.message || 'Failed to load advances.'}</div>`;
      }
    } catch (err) {
      advanceList.innerHTML = `<div class='text-center text-danger py-5'>${err.message || 'Error loading advances.'}</div>`;
    }
  }

  // Tab switching
  workerTab.addEventListener('click', function() {
    workerTab.classList.remove('btn-light', 'border');
    workerTab.classList.add('btn-success');
    workerTab.style.background = '#11634b';
    workerTab.style.border = 'none';
    staffTab.classList.remove('btn-success');
    staffTab.classList.add('btn-light', 'border');
    staffTab.style.background = '';
    staffTab.style.border = '';
    currentType = 'worker';
    fetchAdvances();
  });
  staffTab.addEventListener('click', function() {
    staffTab.classList.remove('btn-light', 'border');
    staffTab.classList.add('btn-success');
    staffTab.style.background = '#11634b';
    staffTab.style.border = 'none';
    workerTab.classList.remove('btn-success');
    workerTab.classList.add('btn-light', 'border');
    workerTab.style.background = '';
    workerTab.style.border = '';
    currentType = 'staff';
    fetchAdvances();
  });

  // Search
  searchInput.addEventListener('input', function() {
    currentPage = 1;
    fetchAdvances();
  });

  // Initial load
  fetchAdvances();
});
