(function () {
  const searchInput = document.getElementById('accountSearch');
  const staffView = document.getElementById('staffView');
    // Shared variables
  let currentRoleFilter = 'all';
  let currentSearch = '';

  // Highlight search terms in text
  function highlightSearchTerm(text, searchTerm) {
    if (!searchTerm || !searchTerm.trim() || !text) {
      return text;
    }
    
    const escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedTerm})`, 'gi');
    return text.replace(regex, '<mark class="bg-warning text-dark">$1</mark>');
  }

  if (!staffView) return;

  // helper to show status/error in the view
  function showStatus(message, type = 'muted') {
    // Create consistent list format for status messages
    const statusContainer = document.createElement('div');
    statusContainer.className = 'list-group text-start js-status';
    
    const statusItem = document.createElement('div');
    statusItem.className = 'list-group-item text-center py-4';
    
    if (type === 'danger') {
      statusItem.innerHTML = `
        <div class="alert alert-danger mb-0" role="alert">
          <i class="bi bi-exclamation-triangle me-2"></i>
          <strong>Error:</strong> ${message}
          <button class="btn btn-outline-danger btn-sm ms-3" onclick="fetchStaffList('', '${currentRoleFilter}')">
            <i class="bi bi-arrow-clockwise me-1"></i>Retry
          </button>
        </div>
      `;
    } else {
      statusItem.innerHTML = `<div class="text-${type}">${message}</div>`;
    }
    
    statusContainer.appendChild(statusItem);
    
    // remove any previous status nodes with .js-status
    const prev = staffView.querySelector('.js-status');
    if (prev) prev.remove();
    
    // keep heading and note, replace content
    const heading = staffView.querySelector('h2');
    const note = staffView.querySelector('p');
    staffView.innerHTML = '';
    if (heading) staffView.appendChild(heading);
    if (note) staffView.appendChild(note);
    staffView.appendChild(statusContainer);
  }

  // fetchStaffList is exposed on window so other scripts (page toggle) can call it
  async function fetchStaffList(search = '', role = 'all') {
    currentRoleFilter = role || 'all';
    currentSearch = search || '';
    // retrieve token from localStorage / session
    const token = localStorage.getItem('auth_token') || 
                 sessionStorage.getItem('auth_token') || 
                 localStorage.getItem('authToken') ||
                 sessionStorage.getItem('authToken');
    if (!token) {
      console.error('No authentication token found. Please log in.');
      window.location.href = '/megacessweb/pages/log-in.html';
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
    
    // Apply client-side search filter as fallback
    if (currentSearch && currentSearch.trim()) {
      const searchTerm = currentSearch.trim().toLowerCase();
      console.log('Applying client-side search filter for:', searchTerm);
      
      users = users.filter(u => {
        const name = u.user_fullname || u.name || u.full_name || u.username || '';
        const nickname = u.user_nickname || '';
        return name.toLowerCase().includes(searchTerm) || nickname.toLowerCase().includes(searchTerm);
      });
    }
    
    if (!users || users.length === 0) {
      const emptyMessage = currentSearch ? 
        `No staff found matching "${currentSearch}".` : 
        'No staff found.';
      list.innerHTML = `<div class="list-group-item text-center py-5"><div class="text-muted">${emptyMessage}</div></div>`;
    } else {
      users.forEach(u => {
        const name = u.user_fullname || u.name || u.full_name || u.username || 'Unknown';
        const nick = u.user_nickname ? ` (${u.user_nickname})` : '';
        const role = u.user_role || u.role || '—';
        const staffCount = (typeof u.staff_count !== 'undefined') ? u.staff_count : 0;
        
        // Apply search highlighting to staff name
        const highlightedName = highlightSearchTerm(name, currentSearch);
        const highlightedNick = nick ? ` (${highlightSearchTerm(u.user_nickname, currentSearch)})` : '';
        
        // Get role badge color
        const getRoleBadgeColor = (role) => {
          switch(role.toLowerCase()) {
            case 'admin': return 'bg-danger';
            case 'manager': return 'bg-primary';
            case 'mandor': return 'bg-success';
            case 'checker': return 'bg-warning text-dark';
            default: return 'bg-secondary';
          }
        };
        
        // Set image source with fallback - generate avatar from name
        const placeholderImage = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0d6efd&color=fff&size=128&bold=true&rounded=true`;
        
        // Use staff image if exists and valid, otherwise use placeholder
        const userImage = u.user_img || u.user_image || '';
        const imgSrc = (userImage && userImage.trim() !== '') ? userImage : placeholderImage;
        
        // create item with similar structure to workers
        const item = document.createElement('div');
        item.className = 'list-group-item staff-list-item';
        item.innerHTML = `
          <div class="d-flex align-items-center">
            <div style="width:48px;height:48px;flex:0 0 48px;">
              <img src="${imgSrc}" 
                   alt="${name}" 
                   class="rounded-circle" 
                   style="width:48px;height:48px;object-fit:cover;background:#0d6efd;" 
                   onerror="if(this.src!=='${placeholderImage}'){this.src='${placeholderImage}';}">
            </div>
            <div class="flex-grow-1 ms-3">
              <div class="d-flex justify-content-between align-items-start">
                <div>
                  <div class="fw-semibold">${highlightedName}${highlightedNick}</div>
                  <div class="small text-muted mb-1">
                    <i class="bi bi-person-badge me-1"></i>Role: <span class="badge ${getRoleBadgeColor(role)}">${role}</span>
                    ${staffCount > 0 ? `<span class="ms-3"><i class="bi bi-people me-1"></i>Staff: ${staffCount}</span>` : ''}
                  </div>
                  ${u.user_email ? `
                    <div class="small text-muted">
                      <i class="bi bi-envelope me-1"></i>${u.user_email}
                    </div>
                  ` : ''}
                </div>
                <div class="d-flex align-items-center gap-2">
                  <div class="btn-group" role="group">
                    <button class="btn btn-sm btn-outline-primary" 
                            onclick="viewStaffDetails(${u.id || u.user_id})"
                            title="View Details">
                      <i class="bi bi-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" 
                            onclick="deleteStaff(${u.id || u.user_id})"
                            title="Delete Staff">
                      <i class="bi bi-trash"></i>
                    </button>
                  </div>
                </div>
              </div>
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

  // Staff action functions (similar to workers)
  window.viewStaffDetails = function(staffId) {
    alert(`View staff details for ID: ${staffId}\nThis functionality will be implemented soon.`);
  };

  window.editStaff = function(staffId) {
    alert(`Edit staff for ID: ${staffId}\nThis functionality will be implemented soon.`);
  };

  window.deleteStaff = function(staffId) {
    if (confirm('Are you sure you want to delete this staff member?')) {
      alert(`Delete staff for ID: ${staffId}\nThis functionality will be implemented soon.`);
    }
  };

  // wire clear button to clear search and refresh if staff view visible
  const clearBtn = document.getElementById('clearAccountSearch');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      if (!staffView.classList.contains('d-none')) fetchStaffList('', currentRoleFilter);
    });
  }
})();