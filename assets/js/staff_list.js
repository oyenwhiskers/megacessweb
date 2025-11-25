(function () {
  const searchInput = document.getElementById('accountSearch');
  const staffView = document.getElementById('staffView');
    // Shared variables
  let currentRoleFilter = 'all';
  let currentSearch = '';
  let currentPage = 1;
  const DEFAULT_PER_PAGE = 10;

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
  async function fetchStaffList(search = '', role = 'all', page = 1) {
    currentRoleFilter = role || 'all';
    currentSearch = search || '';
    currentPage = page;
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
      per_page: DEFAULT_PER_PAGE.toString(),
      page: page.toString(),
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

  function createPaginationHTML(currentPage, totalPages, totalItems, currentSearch, currentRole) {
    if (totalPages <= 1) return '';
    let paginationHTML = `
      <nav aria-label="Staff list pagination" class="mt-4">
        <ul class="pagination justify-content-center" style="background:#effaf3; border-radius:8px; padding:8px 16px;">
    `;
    // Previous button
    paginationHTML += `
      <li class="page-item${currentPage === 1 ? ' disabled' : ''}">
        <button class="page-link" style="background:transparent; border:none; color:#007bff;" onclick="fetchStaffList('${currentSearch}', '${currentRole}', ${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>Previous</button>
      </li>
    `;
    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
      paginationHTML += `
        <li class="page-item${i === currentPage ? ' active' : ''}">
          <button class="page-link" style="${i === currentPage ? 'background:#007bff;color:#fff;border:none;' : 'background:transparent; border:none; color:#007bff;'}" onclick="fetchStaffList('${currentSearch}', '${currentRole}', ${i})">${i}</button>
        </li>
      `;
    }
    // Next button
    paginationHTML += `
      <li class="page-item${currentPage === totalPages ? ' disabled' : ''}">
        <button class="page-link" style="background:transparent; border:none; color:#007bff;" onclick="fetchStaffList('${currentSearch}', '${currentRole}', ${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>Next</button>
      </li>
    `;
    paginationHTML += `
        </ul>
      </nav>
    `;
    return paginationHTML;
  }

  function renderStaff(payload, roleFilter) {
    // remove any previous status nodes
    const prevStatus = staffView.querySelector('.js-status');
    if (prevStatus) prevStatus.remove();

    const list = document.createElement('div');
    list.className = 'list-group text-start';

    let users = Array.isArray(payload.data) ? payload.data : (payload.users || payload || []);
    
    // Update cache with current staff list
    staffListCache = users;
    
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
    
    // Pagination meta
    const meta = payload.meta || {};
    const totalItems = meta.total || users.length;
    const totalPages = meta.last_page || Math.ceil(totalItems / DEFAULT_PER_PAGE);
    
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
        let imgSrc = placeholderImage;
        const userImage = u.user_img || u.user_image || '';
        if (userImage && userImage.trim() !== '') {
          const imgPath = userImage.trim();
          // Check if it's a full URL or relative path
          if (imgPath.startsWith('http://') || imgPath.startsWith('https://')) {
            imgSrc = imgPath;
          } else {
            // Construct full URL using API base URL
            imgSrc = `https://mwms.megacess.com/${imgPath.startsWith('/') ? imgPath.substring(1) : imgPath}`;
          }
        }
        
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
                    <!-- View Details button retained -->
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
      // Add pagination below the list
      list.innerHTML += createPaginationHTML(currentPage, totalPages, totalItems, currentSearch, currentRoleFilter);
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

  // Cache to store staff data from the list
  let staffListCache = [];

  // Staff action functions - View details
  window.viewStaffDetails = async function(staffId) {
    try {
      // Get authentication token
      const token = localStorage.getItem('auth_token') || 
                   sessionStorage.getItem('auth_token') || 
                   localStorage.getItem('authToken') ||
                   sessionStorage.getItem('authToken');
      if (!token) {
        alert('Authentication token not found. Please log in again.');
        window.location.href = '/megacessweb/pages/log-in.html';
        return;
      }
      // Show loading modal first
      showStaffDetailsModal({ loading: true });
      // Fetch staff details from API using staffId
      const response = await fetch(`https://mwms.megacess.com/api/v1/users/${staffId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication failed. Please log in again.');
        } else if (response.status === 404) {
          throw new Error('Staff member not found.');
        } else {
          throw new Error(`Failed to load staff details (${response.status})`);
        }
      }
      const result = await response.json();
      const staffData = result.data || result;
      // Display staff details in modal
      showStaffDetailsModal(staffData);
    } catch (error) {
      console.error('Error fetching staff details:', error);
      showStaffDetailsModal({
        error: error.message || 'Failed to load staff details.'
      });
    }
  };
  
  // Function to display staff details in a modal
  function showStaffDetailsModal(staffData) {
    // Remove existing modal if present
    const existingModal = document.getElementById('staffDetailsModal');
    if (existingModal) {
      const modalInstance = bootstrap.Modal.getInstance(existingModal);
      if (modalInstance) {
        modalInstance.dispose();
      }
      existingModal.remove();
    }
    
    // Remove any lingering backdrops
    const backdrops = document.querySelectorAll('.modal-backdrop');
    backdrops.forEach(backdrop => backdrop.remove());
    
    // Remove modal-open class from body if no other modals are open
    if (!document.querySelector('.modal.show')) {
      document.body.classList.remove('modal-open');
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    }
    
    let modalContent = '';
    
    if (staffData.loading) {
      modalContent = `
        <div class="text-center py-5">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
          <p class="mt-3">Loading staff details...</p>
        </div>
      `;
    } else if (staffData.error) {
      modalContent = `
        <div class="alert alert-danger" role="alert">
          <i class="bi bi-exclamation-triangle me-2"></i>
          <strong>Error:</strong> ${staffData.error}
        </div>
      `;
    } else {
      // Extract staff details from API response
      const staffId = staffData.id;
      const name = staffData.user_fullname || 'Unknown';
      const nickname = staffData.user_nickname || '-';
      const role = staffData.user_role || '-';
      const phone = staffData.user_phone || '-';
      const ic = staffData.user_ic || '-';
      const dob = staffData.user_dob || '-';
      const gender = staffData.user_gender || '-';
      const bankName = staffData.user_bank_name || '-';
      const bankNumber = staffData.user_bank_number || '-';
      const kwspNumber = staffData.user_kwsp_number || '-';
      
      // Get image source with fallback
      const placeholderImage = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0d6efd&color=fff&size=256&bold=true&rounded=true`;
      let imgSrc = placeholderImage;
      const userImage = staffData.user_img || '';
      if (userImage && userImage.trim() !== '') {
        const imgPath = userImage.trim();
        if (imgPath.startsWith('http://') || imgPath.startsWith('https://')) {
          imgSrc = imgPath;
        } else {
          imgSrc = `https://mwms.megacess.com/${imgPath.startsWith('/') ? imgPath.substring(1) : imgPath}`;
        }
      }
      
      // Format date if available (convert YYYY-MM-DD to DD/MM/YYYY)
      let formattedDob = dob;
      if (dob && dob !== '-') {
        // Handle both YYYY-MM-DD and ISO date formats
        const date = new Date(dob);
        if (!isNaN(date.getTime())) {
          const day = String(date.getDate()).padStart(2, '0');
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const year = date.getFullYear();
          formattedDob = `${day}/${month}/${year}`;
        }
      }
      
      // Format gender for display
      const genderDisplay = gender && gender !== '-' ? gender.charAt(0).toUpperCase() + gender.slice(1) : '-';
      
      modalContent = `
        <div class="row">
          <div class="col-md-3 text-center mb-3 mb-md-0">
            <div style="border:2px solid #dee2e6; border-radius:8px; padding:10px; display:inline-block; background:#f8f9fa;">
              <img src="${imgSrc}" 
                   alt="${name}" 
                   id="staffDetailsImagePreview"
                   style="width:120px; height:120px; object-fit:cover; border-radius:8px;" 
                   onerror="if(this.src!=='${placeholderImage}'){this.src='${placeholderImage}';}">
              <input type="file" id="staffDetailsImageInput" accept="image/*" style="display:none;">
            </div>
          </div>
          
          <div class="col-md-9">
            <div class="row g-2">
              <div class="col-md-6">
                <label class="form-label fw-semibold mb-1 small">IC / Document ID:</label>
                <input type="text" class="form-control form-control-sm" value="${ic}" readonly>
              </div>
              
              <div class="col-md-6">
                <label class="form-label fw-semibold mb-1 small">Nickname:</label>
                <input type="text" class="form-control form-control-sm" value="${nickname}" readonly>
              </div>
              
              <div class="col-md-6">
                <label class="form-label fw-semibold mb-1 small">Full Name:</label>
                <input type="text" class="form-control form-control-sm" value="${name}" readonly>
              </div>
              
              <div class="col-md-6">
                <label class="form-label fw-semibold mb-1 small">Phone Number:</label>
                <input type="text" class="form-control form-control-sm" value="${phone}" readonly>
              </div>
              
              <div class="col-md-6">
                <label class="form-label fw-semibold mb-1 small">Date Of Birth:</label>
                <input type="text" class="form-control form-control-sm" value="${formattedDob}" readonly>
              </div>
              
              <div class="col-md-6">
                <label class="form-label fw-semibold mb-1 small">Gender:</label>
                <input type="text" class="form-control form-control-sm" value="${genderDisplay}" readonly>
              </div>
              
              <div class="col-md-6">
                <label class="form-label fw-semibold mb-1 small">Role:</label>
                <input type="text" class="form-control form-control-sm" value="${role}" readonly>
              </div>
              
              <div class="col-md-6">
                <label class="form-label fw-semibold mb-1 small">Bank Type:</label>
                <input type="text" class="form-control form-control-sm" value="${bankName}" readonly>
              </div>
              
              <div class="col-md-6">
                <label class="form-label fw-semibold mb-1 small">Bank Account Number:</label>
                <input type="text" class="form-control form-control-sm" value="${bankNumber}" readonly>
              </div>
              
              <div class="col-md-6">
                <label class="form-label fw-semibold mb-1 small">KWSP Number:</label>
                <input type="text" class="form-control form-control-sm" value="${kwspNumber}" readonly>
              </div>
            </div>
          </div>
        </div>
      `;
    }
    
    // Create modal HTML
    const modalHTML = `
      <div class="modal fade" id="staffDetailsModal" tabindex="-1" aria-labelledby="staffDetailsModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered modal-xl">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title" id="staffDetailsModalLabel">
                <i class="bi bi-person-badge me-2"></i>Staff Details
              </h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              ${modalContent}
            </div>
            <div class="modal-footer">
              ${!staffData.loading && !staffData.error ? `
                <button type="button" class="btn btn-primary" onclick="editStaff(${staffData.id})">
                  <i class="bi bi-pencil me-1"></i>Edit
                </button>
              ` : ''}
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Append modal to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Show modal using Bootstrap
    const modalElement = document.getElementById('staffDetailsModal');
    const modal = new bootstrap.Modal(modalElement, {
      backdrop: true,
      keyboard: true,
      focus: true
    });
    modal.show();
    
    // Clean up modal and backdrop when hidden
    modalElement.addEventListener('hidden.bs.modal', function () {
      // Dispose of the modal instance
      const modalInstance = bootstrap.Modal.getInstance(modalElement);
      if (modalInstance) {
        modalInstance.dispose();
      }
      
      // Remove modal element from DOM
      modalElement.remove();
      
      // Remove any lingering backdrops
      const remainingBackdrops = document.querySelectorAll('.modal-backdrop');
      remainingBackdrops.forEach(backdrop => backdrop.remove());
      
      // Ensure body classes and styles are cleaned up
      if (!document.querySelector('.modal.show')) {
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
      }
    });
  }

  window.editStaff = function(staffId) {
    // Get the current modal
    const currentModal = document.getElementById('staffDetailsModal');
    if (!currentModal) return;
    
    // Switch to edit mode
    enableEditModeStaff(staffId);
  };

  // Function to enable edit mode in the current staff modal
  function enableEditModeStaff(staffId) {
    const modal = document.getElementById('staffDetailsModal');
    if (!modal) return;
    
    const modalBody = modal.querySelector('.modal-body');
    const modalFooter = modal.querySelector('.modal-footer');
    
    // Get all readonly inputs
    const inputs = modalBody.querySelectorAll('input[readonly]');
    
    // Convert inputs to editable
    inputs.forEach(input => {
      input.removeAttribute('readonly');
      input.classList.add('border-primary');
      
      // Convert text inputs to appropriate types and add name attributes
      const label = input.previousElementSibling?.textContent || '';
      
      if (label.includes('IC / Document ID')) {
        input.setAttribute('name', 'user_ic');
        input.setAttribute('required', 'required');
      } else if (label.includes('Nickname')) {
        input.setAttribute('name', 'user_nickname');
        // Note: API may not support updating nickname
      } else if (label.includes('Full Name')) {
        input.setAttribute('name', 'user_fullname');
        input.setAttribute('required', 'required');
        input.setAttribute('minlength', '2');
        // Note: API may not support updating fullname
      } else if (label.includes('Phone Number')) {
        input.type = 'tel';
        input.setAttribute('name', 'user_phone');
        input.setAttribute('required', 'required');
      } else if (label.includes('Date Of Birth')) {
        // Convert DD/MM/YYYY to YYYY-MM-DD for date input BEFORE changing type
        const dateValue = input.value;
        if (dateValue && dateValue !== '-') {
          const parts = dateValue.split('/');
          if (parts.length === 3) {
            // Ensure proper padding for month and day
            const day = parts[0].padStart(2, '0');
            const month = parts[1].padStart(2, '0');
            const year = parts[2];
            input.value = `${year}-${month}-${day}`;
          }
        }
        // Now change the type after value is converted
        input.type = 'date';
        input.setAttribute('name', 'user_dob');
        input.setAttribute('required', 'required');
      } else if (label.includes('Gender')) {
        // Replace gender input with select
        const currentValue = input.value.toLowerCase();
        const selectHTML = `
          <select class="form-control form-control-sm border-primary" name="user_gender" required>
            <option value="">Select Gender</option>
            <option value="male" ${currentValue === 'male' ? 'selected' : ''}>Male</option>
            <option value="female" ${currentValue === 'female' ? 'selected' : ''}>Female</option>
            <option value="other" ${currentValue === 'other' ? 'selected' : ''}>Other</option>
          </select>
        `;
        input.outerHTML = selectHTML;
        return; // Skip further processing for this field
      } else if (label.includes('Role:')) {
        // Make role editable with select
        const currentValue = input.value.toLowerCase();
        const selectHTML = `
          <select class="form-control form-control-sm border-primary" name="user_role" required>
            <option value="">Select Role</option>
            <option value="admin" ${currentValue === 'admin' ? 'selected' : ''}>Admin</option>
            <option value="manager" ${currentValue === 'manager' ? 'selected' : ''}>Manager</option>
            <option value="mandor" ${currentValue === 'mandor' ? 'selected' : ''}>Mandor</option>
            <option value="checker" ${currentValue === 'checker' ? 'selected' : ''}>Checker</option>
          </select>
        `;
        input.outerHTML = selectHTML;
        return; // Skip further processing for this field
      } else if (label.includes('Bank Type')) {
        input.setAttribute('name', 'user_bank_name');
      } else if (label.includes('Bank Account Number')) {
        input.setAttribute('name', 'user_bank_number');
      } else if (label.includes('KWSP Number')) {
        input.setAttribute('name', 'user_kwsp_number');
      }
      
      // Clear dash values
      if (input.value === '-') {
        input.value = '';
      }
    });
    
    // Add password field in edit mode
    const lastRow = modalBody.querySelector('.row.g-2');
    // Remove password field if present
    const passwordFieldContainer = modalBody.querySelector('#passwordFieldContainer');
    if (passwordFieldContainer) {
      passwordFieldContainer.remove();
    }
    
    // Add "Change Photo" button in edit mode
    const imageContainer = modalBody.querySelector('.col-md-3.text-center');
    if (imageContainer && !imageContainer.querySelector('#changePhotoStaffBtn')) {
      const changePhotoBtn = document.createElement('button');
      changePhotoBtn.id = 'changePhotoStaffBtn';
      changePhotoBtn.type = 'button';
      changePhotoBtn.className = 'btn btn-sm btn-outline-primary mt-2';
      changePhotoBtn.innerHTML = '<i class="bi bi-camera"></i> Change Photo';
      changePhotoBtn.onclick = function() {
        document.getElementById('staffDetailsImageInput').click();
      };
      imageContainer.querySelector('div').appendChild(changePhotoBtn);
      
      // Add image preview functionality
      const imageInput = document.getElementById('staffDetailsImageInput');
      const imagePreview = document.getElementById('staffDetailsImagePreview');
      
      if (imageInput && imagePreview) {
        imageInput.addEventListener('change', function(e) {
          const file = e.target.files[0];
          if (file) {
            // Validate file type
            if (!file.type.startsWith('image/')) {
              alert('Please select a valid image file.');
              e.target.value = '';
              return;
            }
            
            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
              alert('Image size must be less than 5MB.');
              e.target.value = '';
              return;
            }
            
            // Show preview
            const reader = new FileReader();
            reader.onload = function(event) {
              imagePreview.src = event.target.result;
            };
            reader.readAsDataURL(file);
          }
        });
      }
    }
    
    // Update footer buttons
    modalFooter.innerHTML = `
      <button type="button" class="btn btn-secondary" onclick="cancelEditModeStaff(${staffId})">
        <i class="bi bi-x-circle me-1"></i>Cancel
      </button>
      <button type="button" class="btn btn-primary" onclick="saveStaffChanges(${staffId}, event)">
        <i class="bi bi-save me-1"></i>Save Changes
      </button>
    `;
  }

  // Function to cancel edit mode and reload view mode
  window.cancelEditModeStaff = function(staffId) {
    const modal = document.getElementById('staffDetailsModal');
    if (modal) {
      const modalInstance = bootstrap.Modal.getInstance(modal);
      if (modalInstance) {
        modalInstance.hide();
      }
    }
    
    // Reload the view modal after a brief delay
    setTimeout(() => {
      viewStaffDetails(staffId);
    }, 300);
  };

  // Update saveStaffChanges to accept event and fix button usage
  window.saveStaffChanges = async function(staffId, event) {
    try {
      const modal = document.getElementById('staffDetailsModal');
      if (!modal) return;
      const modalBody = modal.querySelector('.modal-body');
      // Collect all input values first
      const inputs = modalBody.querySelectorAll('input:not([type="file"]):not([readonly]), select');
      const staffData = {};
      inputs.forEach(input => {
        const name = input.getAttribute('name');
        if (name) {
          let value = input.value.trim();
          if (name === 'user_password') {
            if (value !== '') {
              staffData[name] = value;
            }
          } else if (value !== '' && value !== '-') {
            staffData[name] = value;
          }
        }
      });
      // Validate required fields before proceeding
      if (!staffData.user_ic) {
        alert('IC / Document ID is required');
        return;
      }
      if (!staffData.user_phone) {
        alert('Phone Number is required');
        return;
      }
      if (!staffData.user_dob) {
        alert('Date of Birth is required');
        return;
      }
      if (!staffData.user_gender) {
        alert('Gender is required');
        return;
      }
      if (!staffData.user_role) {
        alert('Role is required');
        return;
      }
      // Check if there's an image file to upload
      const imageInput = document.getElementById('staffDetailsImageInput');
      const imageFile = imageInput && imageInput.files.length > 0 ? imageInput.files[0] : null;
      let requestBody;
      let headers = {
        'Authorization': `Bearer ${getAuthToken()}`,
        'Accept': 'application/json'
      };
      if (imageFile) {
        const formData = new FormData();
        Object.keys(staffData).forEach(key => {
          formData.append(key, staffData[key]);
        });
        formData.append('user_img', imageFile);
        requestBody = formData;
      } else {
        requestBody = JSON.stringify(staffData);
        headers['Content-Type'] = 'application/json';
      }
      if (event && event.target) {
        const saveButton = event.target;
        const originalButtonText = saveButton.innerHTML;
        saveButton.disabled = true;
        saveButton.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Saving...';
      }
      // Use correct API endpoint for updating staff
      const response = await fetch(`https://mwms.megacess.com/api/v1/users/${staffId}` , {
        method: 'PUT',
        headers: headers,
        body: requestBody
      });
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication failed. Please log in again.');
        } else if (response.status === 403) {
          throw new Error('Access denied. You do not have permission to edit this staff.');
        } else if (response.status === 404) {
          throw new Error('Staff not found.');
        } else if (response.status === 422) {
          const errorData = await response.json();
          console.log('Validation error details:', errorData);
          const errorMessages = Object.values(errorData.errors || {}).flat().join(', ');
          throw new Error(errorMessages || 'Validation failed. Please check your input.');
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      }
      const result = await response.json();
      console.log('Save response:', result);
      alert('Staff profile updated successfully!');
      const modalInstance = bootstrap.Modal.getInstance(modal);
      if (modalInstance) {
        modalInstance.hide();
      }
      setTimeout(() => {
        fetchStaffList(currentSearch, currentRoleFilter);
      }, 300);
    } catch (error) {
      console.error('Error saving staff changes:', error);
      alert(`Failed to save changes: ${error.message}`);
      if (event && event.target) {
        const saveButton = event.target;
        saveButton.disabled = false;
        saveButton.innerHTML = '<i class="bi bi-save me-1"></i>Save Changes';
      }
    }
  };

  // Helper function to get auth token
  function getAuthToken() {
    return localStorage.getItem('auth_token') || 
           sessionStorage.getItem('auth_token') || 
           localStorage.getItem('authToken') ||
           sessionStorage.getItem('authToken');
  }

  window.deleteStaff = async function(staffId) {
    // Find staff member details for confirmation message
    const staffMember = staffListCache.find(s => (s.id || s.user_id) === staffId);
    const staffName = staffMember ? (staffMember.user_fullname || staffMember.name || 'this staff member') : 'this staff member';
    
    if (!confirm(`Delete this staff permanently?\n\nStaff: ${staffName}\n\nThis action cannot be undone.`)) {
      return;
    }
    
    try {
      const token = localStorage.getItem('auth_token') || 
                   sessionStorage.getItem('auth_token') || 
                   localStorage.getItem('authToken') ||
                   sessionStorage.getItem('authToken');
      
      if (!token) {
        alert('Authentication token not found. Please log in again.');
        window.location.href = '/megacessweb/pages/log-in.html';
        return;
      }
      
      // Make DELETE request
      const response = await fetch(`https://mwms.megacess.com/api/v1/users/${staffId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          alert('Authentication failed. Please log in again.');
          window.location.href = '/megacessweb/pages/log-in.html';
          return;
        } else if (response.status === 403) {
          alert('Access denied. You do not have permission to delete this staff member.');
          return;
        } else if (response.status === 404) {
          alert('Staff member not found.');
          return;
        } else {
          throw new Error(`Failed to delete staff (${response.status})`);
        }
      }
      
      const result = await response.json();
      
      if (result.success) {
        alert(result.message || 'User deleted successfully');
        
        // Refresh the staff list
        fetchStaffList(currentSearch, currentRoleFilter);
      } else {
        alert('Failed to delete staff member.');
      }
      
    } catch (error) {
      console.error('Error deleting staff:', error);
      alert(`Failed to delete staff member: ${error.message}`);
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

  // Auto-load staff when the script is loaded
  document.addEventListener('DOMContentLoaded', function() {
    if (document.body.dataset.page === 'manage-account') {
      const staffTabActive = document.getElementById('staffView') && !document.getElementById('staffView').classList.contains('d-none');
      if (staffTabActive) {
        fetchStaffList('', 'all', 1);
      }
    }
  });
})();