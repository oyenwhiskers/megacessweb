(function () {
  const searchInput = document.getElementById('accountSearch');
  const staffView = document.getElementById('staffView');
  let currentRoleFilter = 'all';

  if (!staffView) return;

  // helper to show status/error in the view
  function showStatus(message, type = 'muted') {
    const status = document.createElement('div');
    status.className = `text-${type} small mt-3`;
    status.textContent = message;
    // remove any previous status nodes with .js-status
    const prev = staffView.querySelector('.js-status');
    if (prev) prev.remove();
    status.classList.add('js-status');
    staffView.appendChild(status);
  }

  // fetchStaffList is exposed on window so other scripts (page toggle) can call it
  async function fetchStaffList(search = '', role = 'all') {
    currentRoleFilter = role || 'all';
    // retrieve token from localStorage / session or replace with secure retrieval
    const token = localStorage.getItem('authToken') || '{YOUR_TOKEN}';
    if (!token || token === '{YOUR_TOKEN}') {
      showStatus('Not authenticated — set a valid token (localStorage.authToken) or implement token retrieval.', 'danger');
      return;
    }

    const url = new URL("https://mwms.megacess.com/api/v1/users");
    const params = {
      role: (role && role !== 'all') ? role : '',
      search: search || "",
      per_page: "20",
    };
    Object.keys(params).forEach(k => url.searchParams.append(k, params[k]));

    const headers = {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/json",
    };

    try {
      const res = await fetch(url.toString(), { method: "GET", headers });

      if (res.status === 401) {
        // unauthorized
        showStatus('Unauthorized (401). Please login again or refresh your token.', 'danger');
        console.error('Staff list fetch returned 401 Unauthorized');
        return;
      }

      if (!res.ok) {
        showStatus(`Failed to load staff list (${res.status})`, 'danger');
        console.error('Failed to load staff list', res.statusText);
        return;
      }

      const data = await res.json();
      renderStaff(data, role);
    } catch (err) {
      showStatus('Network or server error while loading staff list.', 'danger');
      renderStaff({ data: [] });
    }
  }

  function renderStaff(payload, roleFilter) {
    // remove any previous status nodes
    const prevStatus = staffView.querySelector('.js-status');
    if (prevStatus) prevStatus.remove();

    const list = document.createElement('div');
    list.className = 'list-group text-start';

    let users = Array.isArray(payload.data) ? payload.data : (payload.users || payload || []);
    // Client-side filter fallback (if API doesn't filter)
    if (roleFilter && roleFilter !== 'all') {
      users = users.filter(u => (u.user_role || '').toLowerCase() === roleFilter.toLowerCase());
    }
    if (!users || users.length === 0) {
      list.innerHTML = '<div class="text-muted">No staff found.</div>';
    } else {
      users.forEach(u => {
        const name = u.user_fullname || u.name || u.full_name || u.username || 'Unknown';
        const nick = u.user_nickname ? `<small class="text-muted"> ${u.user_nickname}</small>` : '';
        const role = u.user_role || u.role || '—';
        const staffCount = (typeof u.staff_count !== 'undefined') ? `<span class="ms-2 text-muted small">Staff: ${u.staff_count}</span>` : '';
        // image (may be relative path from API)
        let imgSrc = u.user_img || u.user_image || '';
        // create item
        const item = document.createElement('div');
        item.className = 'list-group-item';
        item.innerHTML = `
          <div class="d-flex align-items-center">
            <div style="width:48px;height:48px;flex:0 0 48px;">
              ${imgSrc ? `<img src="${imgSrc}" alt="${name}" class="rounded-circle" style="width:48px;height:48px;object-fit:cover" onerror="this.onerror=null;this.src='https://via.placeholder.com/48?text=User'">`
                       : `<img src="https://via.placeholder.com/48?text=User" alt="avatar" class="rounded-circle" style="width:48px;height:48px;object-fit:cover">`}
            </div>
            <div class="flex-grow-1 ms-3">
              <div class="fw-semibold">${name}${nick}</div>
              <div class="small text-muted">Role: <span class="badge bg-secondary">${role}</span>${staffCount}</div>
            </div>
          </div>
        `;
        list.appendChild(item);
      });
    }

    // keep heading and replace remaining contents
    const heading = staffView.querySelector('h2');
    const note = staffView.querySelector('p');
    staffView.innerHTML = '';
    if (heading) staffView.appendChild(heading);
    if (note) staffView.appendChild(note);
    staffView.appendChild(list);
  }

  // expose function globally so page script can call when staff tab is selected
  window.fetchStaffList = fetchStaffList;

  // wire clear button to clear search and refresh if staff view visible
  const clearBtn = document.getElementById('clearAccountSearch');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      if (!staffView.classList.contains('d-none')) fetchStaffList('', currentRoleFilter);
    });
  }
})();