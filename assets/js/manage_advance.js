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
      let avatar = '';
      if (type === 'worker' && person && person.staff_img) {
        let workerImage = person.staff_img;
        if (!workerImage.startsWith('http') && !workerImage.startsWith('/')) {
          workerImage = `https://mwms.megacess.com/storage/user-images/${workerImage}`;
        } else if (workerImage.startsWith('/')) {
          workerImage = `https://mwms.megacess.com${workerImage}`;
        }
        avatar = `<img src='${workerImage}' class='rounded-circle' style='width:60px;height:60px;object-fit:cover;' alt='${name}'>`;
      } else if (person && person.staff_img) {
        avatar = `<img src='${person.staff_img}' class='rounded-circle' style='width:60px;height:60px;object-fit:cover;' alt='${name}'>`;
      } else {
        avatar = `<div class="rounded-circle bg-dark d-flex align-items-center justify-content-center" style="width:60px;height:60px;"><i class="bi bi-person text-white" style="font-size:2.5rem;"></i></div>`;
      }
      // Use advance record id for View button
      const viewId = item.id || item.loan_id;
      return `
        <div class="advance-card d-flex align-items-center justify-content-between border rounded mb-3 p-2" style="background:#fff;">
          <div class="d-flex align-items-center gap-3">
            ${avatar}
            <div>
              <div class="fw-bold fs-5">${name}</div>
              <div class="text-muted">${role}</div>
            </div>
          </div>
          <div class="d-flex align-items-center gap-3">
            <div class="border-start" style="height:60px;"></div>
            <button type="button" class="btn btn-outline-success view-advance-btn" data-id="${viewId}"><i class="bi bi-eye"></i> View</button>
          </div>
        </div>
      `;
    }).join('');
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

  // Helper: format date to YYYY-MM-DD
  function formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    return d.toISOString().slice(0, 10);
  }

  // Helper: show advance details in modal
  function showAdvanceDetails(data) {
    let modal = document.getElementById('viewAdvanceModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.className = 'modal fade';
      modal.id = 'viewAdvanceModal';
      modal.tabIndex = -1;
      modal.innerHTML = `
        <div class="modal-dialog modal-dialog-centered" style="max-width:700px;">
          <div class="modal-content" style="background:#d2f5d7;">
            <div class="modal-header border-0 pb-0">
              <h5 class="modal-title fw-bold" style="color:#11634b;">View Existing Advance & Expense Details</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              <div id="advanceDetailsContent"></div>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }
    const content = document.getElementById('advanceDetailsContent');
    if (content) {
      // Avatar logic
      let avatar = `<span class='bg-dark rounded-circle d-flex align-items-center justify-content-center' style='width:48px;height:48px;'><i class='bi bi-person text-white' style='font-size:2rem;'></i></span>`;
      let name = data.staff?.staff_fullname || data.staff?.user_fullname || '-';
      let role = data.staff?.user_role || data.staff?.staff_role || data.role || '';
      if (data.staff?.staff_img) {
        let img = data.staff.staff_img;
        if (!img.startsWith('http') && !img.startsWith('/')) {
          img = `https://mwms.megacess.com/storage/user-images/${img}`;
        } else if (img.startsWith('/')) {
          img = `https://mwms.megacess.com${img}`;
        }
        avatar = `<img src='${img}' class='rounded-circle' style='width:48px;height:48px;object-fit:cover;' alt='${name}'>`;
      }
      // Format date as DD/MM/YYYY
      function formatDisplayDate(dateStr) {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        if (isNaN(d)) return dateStr;
        return d.toLocaleDateString('en-GB');
      }
      content.innerHTML = `
        <div class="p-3" style="background:#fff;border-radius:12px;">
          <div class="mb-3">
            <div class="fw-semibold text-secondary mb-1">Made for:</div>
            <div class="d-flex align-items-center gap-3 border rounded p-2" style="background:#fff;">
              ${avatar}
              <div>
                <div class="fw-bold fs-5">${name}</div>
                <div class="text-muted">${role}</div>
              </div>
            </div>
          </div>
          <div class="row mb-2">
            <div class="col-6">
              <div class="fw-semibold text-secondary">Date:</div>
              <div>${formatDisplayDate(data.loan_date)}</div>
            </div>
            <div class="col-6">
              <div class="fw-semibold text-secondary">Created by:</div>
              <div>${data.creator?.user_fullname || '-'}</div>
            </div>
          </div>
          <div class="mb-2">
            <div class="fw-semibold text-secondary">Amount:</div>
            <div>RM ${data.loan_amount || '-'}</div>
          </div>
          <div class="mb-2">
            <div class="fw-semibold text-secondary">Loan status:</div>
            <div>${data.loan_status || '-'}</div>
          </div>
          <div class="mb-2">
            <div class="fw-semibold text-secondary">Remarks:</div>
            <div>${data.loan_remarks || '-'}</div>
          </div>
        </div>
      `;
    }
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
  }

  // Attach event listeners to View buttons
  function attachViewButtonHandlers() {
    document.querySelectorAll('.view-advance-btn').forEach(btn => {
      btn.addEventListener('click', async function() {
        let advanceId = this.getAttribute('data-id');
        if (!advanceId) return;
        advanceId = parseInt(advanceId, 10); // Ensure integer
        if (isNaN(advanceId)) {
          alert('Invalid advance ID');
          return;
        }
        const token = getAuthToken();
        if (!token) {
          alert('Not authenticated');
          return;
        }
        // Determine type for API endpoint
        const type = currentType === 'worker' ? 'staff' : 'user';
        let url = `https://mwms.megacess.com/api/v1/advances/${type}/${advanceId}`;
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
            showAdvanceDetails(result.data);
          } else {
            alert(result.message || 'Failed to fetch details.');
          }
        } catch (err) {
          alert(err.message || 'Error fetching details.');
        }
      });
    });
  }

  // Patch renderAdvances to attach handlers after rendering
  const origRenderAdvances = renderAdvances;
  renderAdvances = function(data, type) {
    origRenderAdvances(data, type);
    attachViewButtonHandlers();
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
