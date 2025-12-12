document.addEventListener('DOMContentLoaded', function() {
  const workerTab = document.getElementById('workerTab');
  const staffTab = document.getElementById('staffTab');
  const advanceList = document.querySelector('.advance-list');
  const searchInput = document.getElementById('advanceSearch');

  let currentType = 'worker'; // 'staff' or 'worker'
  let currentPage = 1;
  let lastPage = 1;
  let currentRole = '';
  let perPage = 5;

  // Helper: get token - expose globally for use in HTML
  window.getAuthToken = function() {
    return localStorage.getItem('authToken') || sessionStorage.getItem('authToken') || null;
  };
  
  // Use global function internally
  function getAuthToken() {
    return window.getAuthToken();
  }

  // Helper: render advances
  function renderAdvances(data, type) {
    if (!advanceList) return;
    if (!data || data.length === 0) {
      advanceList.innerHTML = `<div class='text-center text-muted py-5'>No advances found.</div>`;
      return;
    }
    advanceList.innerHTML = data.map((item, idx) => {
      const name = item.name || '-';
      const phone = item.phone || '';
      const role = type === 'worker' ? 'Worker' : (item.type === 'user' ? 'Staff' : 'Worker');
      let avatar = '';
      
      // Handle image
      if (item.img) {
        let imageUrl = item.img;
        if (!imageUrl.startsWith('http') && !imageUrl.startsWith('/')) {
          imageUrl = `https://mwms.megacess.com/storage/user-images/${imageUrl}`;
        } else if (imageUrl.startsWith('/')) {
          imageUrl = `https://mwms.megacess.com${imageUrl}`;
        }
        avatar = `<img src='${imageUrl}' class='rounded-circle' style='width:60px;height:60px;object-fit:cover;' alt='${name}'>`;
      } else {
        avatar = `<div class="rounded-circle bg-dark d-flex align-items-center justify-content-center" style="width:60px;height:60px;"><i class="bi bi-person text-white" style="font-size:2.5rem;"></i></div>`;
      }
      
      // Use person id for View button
      const personId = item.id;
      const personType = item.type || (type === 'worker' ? 'staff' : 'user');
      
      // Format currency
      const formatCurrency = (amount) => {
        return parseFloat(amount || 0).toFixed(2);
      };
      
      return `
        <div class="advance-card d-flex align-items-center justify-content-between border rounded mb-3 p-3" style="background:#fff;">
          <div class="d-flex align-items-center gap-3 flex-grow-1">
            ${avatar}
            <div class="flex-grow-1">
              <div class="fw-bold fs-5">${item.name}</div>
              <div class="text-muted">${item.role || role}</div>
              <div class="mt-2 d-flex gap-4 text-sm">
                <div>
                  <span class="text-muted">Outstanding:</span>
                  <span class="fw-semibold text-danger">RM ${formatCurrency(item.total_outstanding_balance)}</span>
                </div>
                <div>
                  <span class="text-muted">Total Advance:</span>
                  <span class="fw-semibold">RM ${formatCurrency(item.total_loan_amount)}</span>
                </div>
                <div>
                  <span class="text-muted">Paid:</span>
                  <span class="fw-semibold text-success">RM ${formatCurrency(item.total_paid_amount)}</span>
                </div>
                <div>
                  <span class="text-muted">Count:</span>
                  <span class="fw-semibold">${item.loan_count || 0}</span>
                </div>
              </div>
            </div>
          </div>
          <div class="d-flex align-items-center gap-3">
            <div class="border-start" style="height:60px;"></div>
            <button type="button" class="btn btn-success view-advance-btn" data-id="${personId}" data-type="${personType}"><i class="bi bi-eye"></i> View</button>
          </div>
        </div>
      `;
    }).join('');
  }

  // Render pagination controls
  function renderPagination() {
    // Remove existing pagination
    const existingPagination = document.getElementById('advancePagination');
    if (existingPagination) existingPagination.remove();

    if (lastPage <= 1) return;

    const paginationContainer = document.createElement('div');
    paginationContainer.id = 'advancePagination';
    paginationContainer.className = 'mt-3 text-center';

    // Previous button
    const prevBtn = document.createElement('button');
    prevBtn.className = 'btn btn-sm btn-success mx-1';
    prevBtn.innerHTML = '<i class="bi bi-chevron-left"></i>';
    prevBtn.disabled = currentPage === 1;
    prevBtn.addEventListener('click', () => {
      currentPage--;
      fetchAdvances();
    });
    paginationContainer.appendChild(prevBtn);

    // Smart page buttons with ellipsis (max 7 buttons)
    let pages = [];
    if (lastPage <= 7) {
      // Show all pages if 7 or fewer
      pages = Array.from({ length: lastPage }, (_, i) => i + 1);
    } else {
      // Smart ellipsis logic
      if (currentPage <= 4) {
        // Near start: [1] [2] [3] [4] [5] [...] [last]
        pages = [1, 2, 3, 4, 5, '...', lastPage];
      } else if (currentPage >= lastPage - 3) {
        // Near end: [1] [...] [last-4] [last-3] [last-2] [last-1] [last]
        pages = [1, '...', lastPage - 4, lastPage - 3, lastPage - 2, lastPage - 1, lastPage];
      } else {
        // Middle: [1] [...] [current-1] [current] [current+1] [...] [last]
        pages = [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', lastPage];
      }
    }

    // Render page buttons
    pages.forEach((page) => {
      if (page === '...') {
        // Ellipsis (non-clickable)
        const ellipsis = document.createElement('button');
        ellipsis.className = 'btn btn-sm btn-success mx-1';
        ellipsis.disabled = true;
        ellipsis.textContent = '...';
        ellipsis.style.cursor = 'default';
        paginationContainer.appendChild(ellipsis);
      } else {
        // Page button
        const pageBtn = document.createElement('button');
        pageBtn.className = 'btn btn-sm mx-1';
        pageBtn.classList.add(page === currentPage ? 'btn-success' : 'btn-outline-success');
        pageBtn.textContent = page;
        pageBtn.addEventListener('click', () => {
          currentPage = page;
          fetchAdvances();
        });
        paginationContainer.appendChild(pageBtn);
      }
    });

    // Next button
    const nextBtn = document.createElement('button');
    nextBtn.className = 'btn btn-sm btn-success mx-1';
    nextBtn.innerHTML = '<i class="bi bi-chevron-right"></i>';
    nextBtn.disabled = currentPage === lastPage;
    nextBtn.addEventListener('click', () => {
      currentPage++;
      fetchAdvances();
    });
    paginationContainer.appendChild(nextBtn);

    // Append pagination to the wrapper div
    const paginationWrapper = document.getElementById('advancePaginationWrapper');
    if (paginationWrapper) {
      paginationWrapper.innerHTML = '';
      paginationWrapper.appendChild(paginationContainer);
    }
  }

  // Fetch advances from API
  async function fetchAdvances() {
    const token = getAuthToken();
    if (!token) {
      advanceList.innerHTML = `<div class='text-center text-danger py-5'>Not authenticated. Please log in.</div>`;
      return;
    }
    // Use correct type for API - staff tab shows users, worker tab shows staff
    const type = currentType === 'staff' ? 'user' : 'staff';
    const search = searchInput.value.trim();
    let url = `https://mwms.megacess.com/api/v1/advances?type=${type}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    if (currentRole) url += `&role=${encodeURIComponent(currentRole)}`;
    url += `&per_page=${perPage}&page=${currentPage}`;
    try {
      // Clear pagination during loading
      const paginationWrapper = document.getElementById('advancePaginationWrapper');
      if (paginationWrapper) {
        paginationWrapper.innerHTML = '';
      }
      
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
        // Store pagination metadata - check both meta and pagination objects
        if (result.meta) {
          currentPage = result.meta.current_page || 1;
          lastPage = result.meta.last_page || 1;
        } else if (result.pagination) {
          currentPage = result.pagination.current_page || 1;
          lastPage = result.pagination.last_page || 1;
        }
        renderPagination();
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


  // Attach event listeners to View buttons
  function attachViewButtonHandlers() {
    document.querySelectorAll('.view-advance-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        const personId = this.getAttribute('data-id');
        const personType = this.getAttribute('data-type');
        if (!personId || !personType) {
          console.error('Unable to load person data.');
          Swal.fire({
            icon: 'error',
            text: 'Unable to load person data.',
            confirmButtonColor: '#0d6832'
          });
          return;
        }
        // Navigate to view advance details page
        window.location.href = `/megacessweb/pages/view-advance-details.html?type=${encodeURIComponent(personType)}&id=${encodeURIComponent(personId)}`;
      });
    });
  }

  // Patch renderAdvances to attach handlers after rendering
  const origRenderAdvances = renderAdvances;
  renderAdvances = function(data, type) {
    origRenderAdvances(data, type);
    attachViewButtonHandlers();
  }

  // Add Advance: POST new advance record
  async function addAdvance(data) {
    const token = getAuthToken();
    if (!token) {
      console.error('Not authenticated');
      Swal.fire({
            icon: 'warning',
            title: 'Not authenticated',
            text: 'Please fill in all fields and select a worker/staff.',
            confirmButtonColor: '#0d6832'
          });
      return { success: false, message: 'Not authenticated' };
    }
    const url = 'https://mwms.megacess.com/api/v1/advances';
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(data)
      });
      const result = await res.json();
      return result;
    } catch (err) {
      return { success: false, message: err.message || 'Error adding advance.' };
    }
  }

  // Example: Attach handler to Add Advance form/button
  const addAdvanceForm = document.getElementById('addAdvanceForm');
  if (addAdvanceForm) {
    addAdvanceForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      // Collect form data (adjust field names as needed)
      const formData = new FormData(addAdvanceForm);
      const data = {
        loan_amount: formData.get('loan_amount'),
        loan_date: formData.get('loan_date'),
        loan_remarks: formData.get('loan_remarks'),
        loan_status: formData.get('loan_status'),
        // Add other fields as needed
        type: currentType === 'worker' ? 'staff' : 'user',
        person_id: formData.get('person_id') // staff_id or user_id
      };
      const result = await addAdvance(data);
      if (result.success) {
        console.log('Advance added successfully!');
        Swal.fire({
          icon: 'success',
          text: 'The advance has been added successfully.',
          timer: 2000,
          showtimerProgressBar: true,
        })
        fetchAdvances(); // Refresh list
        addAdvanceForm.reset();
      } else {
        console.error(result.message || 'Failed to add advance.');
        Swal.fire({
          icon: 'error',
          text: result.message || 'Failed to add advance.',
          confirmButtonColor: '#0d6832'
        })
      }
    });
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
    currentPage = 1;
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
    currentPage = 1;
    fetchAdvances();
  });

  // Search
  searchInput.addEventListener('input', function() {
    currentPage = 1;
    fetchAdvances();
  });

  // Listen for refresh event from add advance modal
  window.addEventListener('refreshAdvanceList', function() {
    fetchAdvances();
  });

  // Initial load
  fetchAdvances();
});


