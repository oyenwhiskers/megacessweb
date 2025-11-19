document.addEventListener('DOMContentLoaded', function() {
  const workerTab = document.getElementById('workerTab');
  const staffTab = document.getElementById('staffTab');
  const advanceList = document.querySelector('.advance-list');
  const searchInput = document.getElementById('advanceSearch');

  let currentType = 'staff'; // 'staff' or 'worker'
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
    advanceList.innerHTML = data.map(item => {
      const person = type === 'worker' ? item.staff : item.staff; // API returns 'staff' for both
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
          <button class="btn btn-link p-0 ms-3" style="font-size:2rem;"><i class="bi bi-eye"></i></button>
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
