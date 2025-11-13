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

  // Cache to store staff data from the list
  let staffListCache = [];

  // Staff action functions (similar to workers)
  window.viewStaffDetails = async function(staffId) {
    try {
      // Show loading state in a modal
      showStaffDetailsModal({
        loading: true,
        staffId: staffId
      });
      
      // First, try to find staff in cache from the already-loaded list
      const cachedStaff = staffListCache.find(s => (s.id || s.user_id) === staffId);
      
      if (cachedStaff) {
        console.log('Using cached staff data for ID:', staffId);
        // Display cached staff details in modal
        showStaffDetailsModal(cachedStaff);
        return;
      }
      
      // If not in cache, fetch from API
      const token = localStorage.getItem('auth_token') || 
                   sessionStorage.getItem('auth_token') || 
                   localStorage.getItem('authToken') ||
                   sessionStorage.getItem('authToken');
      
      if (!token) {
        throw new Error('Authentication token not found. Please log in again.');
      }
      
      // Try fetching all users and find the specific one (since /users/{id} endpoint doesn't exist)
      const response = await fetch(`https://mwms.megacess.com/api/v1/users?per_page=100`, {
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
        } else if (response.status === 403) {
          throw new Error('Access denied.');
        } else {
          throw new Error(`Failed to load staff details (${response.status})`);
        }
      }
      
      const result = await response.json();
      
      if (!result.data || !Array.isArray(result.data)) {
        throw new Error('Invalid response format');
      }
      
      // Find the specific staff member
      const staffMember = result.data.find(s => (s.id || s.user_id) === staffId);
      
      if (!staffMember) {
        throw new Error('Staff member not found');
      }
      
      // Display staff details in modal
      showStaffDetailsModal(staffMember);
      
    } catch (error) {
      console.error('Error fetching staff details:', error);
      showStaffDetailsModal({
        error: error.message || 'Failed to load staff details.'
      });
    }
  };

  // Function to display staff details in a modal
  function showStaffDetailsModal(staffData) {
    // Remove existing modal if any
    const existingModal = document.getElementById('staffDetailsModal');
    if (existingModal) {
      // Properly dispose of existing modal instance
      const existingModalInstance = bootstrap.Modal.getInstance(existingModal);
      if (existingModalInstance) {
        existingModalInstance.dispose();
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
      const staff = staffData;
      
      // Generate avatar placeholder
      const userName = staff.user_fullname || 'Staff';
      const placeholderImage = `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=0d6efd&color=fff&size=200&bold=true&rounded=true`;
      
      // Use staff image if exists and valid, otherwise use placeholder
      let imageSrc = placeholderImage;
      if (staff.user_img && staff.user_img.trim() !== '') {
        const imgPath = staff.user_img.trim();
        console.log('Modal - Image path from API:', imgPath);
        console.log('Modal - Staff data:', staff);
        // Check if it's a full URL or relative path
        if (imgPath.startsWith('http://') || imgPath.startsWith('https://')) {
          imageSrc = imgPath;
        } else {
          // Construct full URL using API base URL
          imageSrc = `https://mwms.megacess.com/${imgPath.startsWith('/') ? imgPath.substring(1) : imgPath}`;
        }
        console.log('Modal - Final image URL:', imageSrc);
      } else {
        console.log('Modal - No image, staff.user_img:', staff.user_img);
      }
      
      // Format date for input field (YYYY-MM-DD to DD/MM/YYYY)
      function formatDateForDisplay(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
      }
      
      // Helper function to display value or dash
      function displayValue(value) {
        return (value && value.trim() !== '') ? value : '-';
      }
      
      // Get gender display text
      function getGenderDisplay(gender) {
        if (!gender) return '-';
        return gender.charAt(0).toUpperCase() + gender.slice(1);
      }
      
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
      
      modalContent = `
        <div class="row">
          <div class="col-md-3 text-center mb-3 mb-md-0">
            <div style="border:2px solid #dee2e6; border-radius:8px; padding:10px; display:inline-block; background:#f8f9fa;">
              <img id="staffDetailsImagePreview" src="${imageSrc}" 
                   alt="${userName}" 
                   style="width:120px; height:120px; object-fit:cover; border-radius:8px;"
                   onerror="if(this.src!=='${placeholderImage}'){this.src='${placeholderImage}';}">
              <input type="file" id="staffDetailsImageInput" accept="image/*" style="display:none;">
            </div>
          </div>
          
          <div class="col-md-9">
            <div class="row g-2">
              <div class="col-md-6">
                <label class="form-label fw-semibold mb-1 small">IC / Document ID:</label>
                <input type="text" class="form-control form-control-sm" value="${displayValue(staff.user_ic) !== '-' ? displayValue(staff.user_ic) : staff.id}" readonly>
              </div>
              
              <div class="col-md-6">
                <label class="form-label fw-semibold mb-1 small">Nickname:</label>
                <input type="text" class="form-control form-control-sm" value="${displayValue(staff.user_nickname)}" readonly>
              </div>
              
              <div class="col-md-6">
                <label class="form-label fw-semibold mb-1 small">Full Name:</label>
                <input type="text" class="form-control form-control-sm" value="${displayValue(staff.user_fullname)}" readonly>
              </div>
              
              <div class="col-md-6">
                <label class="form-label fw-semibold mb-1 small">Phone Number:</label>
                <input type="text" class="form-control form-control-sm" value="${displayValue(staff.user_phone)}" readonly>
              </div>
              
              <div class="col-md-6">
                <label class="form-label fw-semibold mb-1 small">Date Of Birth:</label>
                <input type="text" class="form-control form-control-sm" value="${formatDateForDisplay(staff.user_dob)}" readonly>
              </div>
              
              <div class="col-md-6">
                <label class="form-label fw-semibold mb-1 small">Gender:</label>
                <input type="text" class="form-control form-control-sm" value="${getGenderDisplay(staff.user_gender)}" readonly>
              </div>
              
              <div class="col-md-6">
                <label class="form-label fw-semibold mb-1 small">Role:</label>
                <div class="form-control form-control-sm d-flex align-items-center" style="border:1px solid #dee2e6; background:#e9ecef;">
                  <span class="badge ${getRoleBadgeColor(staff.user_role || '')}">${staff.user_role ? staff.user_role.charAt(0).toUpperCase() + staff.user_role.slice(1) : '-'}</span>
                </div>
              </div>
              
              <div class="col-md-6">
                <label class="form-label fw-semibold mb-1 small">Bank Type:</label>
                <input type="text" class="form-control form-control-sm" value="${displayValue(staff.user_bank_name)}" readonly>
              </div>
              
              <div class="col-md-6">
                <label class="form-label fw-semibold mb-1 small">Bank Account Number:</label>
                <input type="text" class="form-control form-control-sm" value="${displayValue(staff.user_bank_number)}" readonly>
              </div>
              
              <div class="col-md-6">
                <label class="form-label fw-semibold mb-1 small">KWSP Number:</label>
                <input type="text" class="form-control form-control-sm" value="${displayValue(staff.user_kwsp_number)}" readonly>
              </div>
            </div>
          </div>
        </div>
      `;
    }
    
    // Create modal element
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
      
      // Remove the modal element
      modalElement.remove();
      
      // Clean up any lingering backdrops
      const backdrops = document.querySelectorAll('.modal-backdrop');
      backdrops.forEach(backdrop => backdrop.remove());
      
      // Ensure body classes and styles are reset
      if (!document.querySelector('.modal.show')) {
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
      }
    }, { once: true });
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
      } else if (label.includes('Nickname')) {
        input.setAttribute('name', 'user_nickname');
      } else if (label.includes('Full Name')) {
        input.setAttribute('name', 'user_fullname');
      } else if (label.includes('Phone Number')) {
        input.type = 'tel';
        input.setAttribute('name', 'user_phone');
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
        // Role field stays readonly - cannot change role through edit
        input.classList.remove('border-primary');
        input.setAttribute('readonly', 'readonly');
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
    if (lastRow && !modalBody.querySelector('input[name="user_password"]')) {
      const passwordFieldHTML = `
        <div class="col-md-6" id="passwordFieldContainer">
          <label class="form-label fw-semibold mb-1 small">Password (optional):</label>
          <div class="input-group input-group-sm">
            <input type="password" class="form-control form-control-sm border-primary" id="passwordFieldStaff" name="user_password" placeholder="Enter new password (leave blank to keep current)">
            <button class="btn btn-outline-secondary" type="button" id="togglePasswordStaff" title="Show/Hide Password">
              <i class="bi bi-eye" id="togglePasswordIconStaff"></i>
            </button>
          </div>
          <small class="text-muted">Leave blank to keep current password</small>
        </div>
      `;
      lastRow.insertAdjacentHTML('beforeend', passwordFieldHTML);
      
      // Add password toggle functionality
      const togglePasswordBtn = modalBody.querySelector('#togglePasswordStaff');
      const passwordField = modalBody.querySelector('#passwordFieldStaff');
      const togglePasswordIcon = modalBody.querySelector('#togglePasswordIconStaff');
      
      if (togglePasswordBtn && passwordField && togglePasswordIcon) {
        togglePasswordBtn.addEventListener('click', function() {
          if (passwordField.type === 'password') {
            passwordField.type = 'text';
            togglePasswordIcon.classList.remove('bi-eye');
            togglePasswordIcon.classList.add('bi-eye-slash');
          } else {
            passwordField.type = 'password';
            togglePasswordIcon.classList.remove('bi-eye-slash');
            togglePasswordIcon.classList.add('bi-eye');
          }
        });
      }
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
      <button type="button" class="btn btn-primary" onclick="saveStaffChanges(${staffId})">
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

  // Function to save staff changes
  window.saveStaffChanges = async function(staffId) {
    try {
      const modal = document.getElementById('staffDetailsModal');
      if (!modal) return;
      
      const modalBody = modal.querySelector('.modal-body');
      
      // Check if there's an image file to upload
      const imageInput = document.getElementById('staffDetailsImageInput');
      const imageFile = imageInput && imageInput.files.length > 0 ? imageInput.files[0] : null;
      
      // Prepare data for API
      let requestBody;
      let headers = {
        'Authorization': `Bearer ${getAuthToken()}`,
        'Accept': 'application/json'
      };
      
      if (imageFile) {
        // Use FormData for file upload
        const formData = new FormData();
        
        // Collect all input values
        const inputs = modalBody.querySelectorAll('input:not([type="file"]):not([readonly]), select');
        
        inputs.forEach(input => {
          const name = input.getAttribute('name');
          if (name) {
            let value = input.value.trim();
            // Only include password if it's not empty
            if (name === 'user_password') {
              if (value !== '') {
                formData.append(name, value);
              }
            } else if (value !== '') {
              formData.append(name, value);
            }
          }
        });
        
        // Add image file
        formData.append('user_img', imageFile);
        requestBody = formData;
        // Don't set Content-Type for FormData, browser will set it with boundary
      } else {
        // Use JSON for regular update
        const staffData = {};
        const inputs = modalBody.querySelectorAll('input:not([readonly]), select');
        
        inputs.forEach(input => {
          const name = input.getAttribute('name');
          if (name) {
            let value = input.value.trim();
            // Convert empty values to null, except for password
            if (name === 'user_password') {
              // Only include password if it's not empty (user wants to change it)
              if (value !== '') {
                staffData[name] = value;
              }
            } else {
              staffData[name] = value !== '' ? value : null;
            }
          }
        });
        
        requestBody = JSON.stringify(staffData);
        headers['Content-Type'] = 'application/json';
        
        // Validate required fields
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
      }
      
      // Disable save button and show loading state
      const saveButton = event.target;
      const originalButtonText = saveButton.innerHTML;
      saveButton.disabled = true;
      saveButton.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Saving...';
      
      // Make PUT request to update staff profile
      const response = await fetch(`https://mwms.megacess.com/api/v1/profile`, {
        method: 'PUT',
        headers: headers,
        body: requestBody
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication failed. Please log in again.');
        } else if (response.status === 403) {
          throw new Error('Access denied. You can only edit your own profile.');
        } else if (response.status === 404) {
          throw new Error('Profile not found.');
        } else if (response.status === 422) {
          const errorData = await response.json();
          const errorMessages = Object.values(errorData.errors || {}).flat().join(', ');
          throw new Error(errorMessages || 'Validation failed. Please check your input.');
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      }
      
      const result = await response.json();
      
      console.log('Save response:', result);
      
      // Show success message
      alert('Staff profile updated successfully!');
      
      // Close the modal
      const modalInstance = bootstrap.Modal.getInstance(modal);
      if (modalInstance) {
        modalInstance.hide();
      }
      
      // Refresh the staff list to show updated data including image
      setTimeout(() => {
        fetchStaffList(currentSearch, currentRoleFilter);
      }, 300);
      
    } catch (error) {
      console.error('Error saving staff changes:', error);
      alert(`Failed to save changes: ${error.message}`);
      
      // Re-enable save button
      const saveButton = event.target;
      if (saveButton) {
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