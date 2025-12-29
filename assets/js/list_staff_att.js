// Staff Attendance List Management
(function() {
    // Configuration
    const API_BASE_URL = 'https://mwms.megacess.com/api/v1';
    const DEFAULT_PER_PAGE = 10;
    let currentPage = 1;
    let currentSearch = '';
    let currentDateAttendanceId = 1;
    let currentStatusFilter = 'all';
    let currentRecordsData = []; // Store current records for easy access
    
    // Get the staff attendance view container
    const staffAttendanceView = document.getElementById('staffAttendanceView');
    
    // Token management
    function getAuthToken() {
        const token = localStorage.getItem('auth_token') || 
                     sessionStorage.getItem('auth_token') || 
                     localStorage.getItem('authToken') ||
                     sessionStorage.getItem('authToken');
        
        if (!token) {
            console.error('No authentication token found. Please log in.');
            window.location.href = '/megacessweb/pages/log-in.html';
            return null;
        }
        
        return token;
    }
    
    // Format date for display
    function formatDateTime(dateTimeString) {
        if (!dateTimeString) return 'N/A';
        const date = new Date(dateTimeString);
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    
    // Format time only
    function formatTime(dateTimeString) {
        if (!dateTimeString) return 'N/A';
        const date = new Date(dateTimeString);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    
    // Get status badge HTML
    function getStatusBadge(status) {
        const statusMap = {
            'Present': { class: 'bg-success', text: 'Present' },
            'Check_in': { class: 'bg-primary', text: 'Check In' },
            'Absent': { class: 'bg-danger', text: 'Absent' },
            'Late': { class: 'bg-warning text-dark', text: 'Late' },
            'Annual_Leave': { class: 'bg-info', text: 'Annual Leave' },
            'Sick_Leave': { class: 'bg-secondary', text: 'Sick Leave' },
            'Unpaid_Leave': { class: 'bg-dark', text: 'Unpaid Leave' }
        };
        
        const statusInfo = statusMap[status] || { class: 'bg-secondary', text: status };
        return `<span class="badge ${statusInfo.class}">${statusInfo.text}</span>`;
    }
    
    // Helper function to convert date to date_attendance_id
    function getDateAttendanceId(dateString) {
        if (!dateString) return 1;
        
        try {
            const date = new Date(dateString);
            const year = date.getFullYear();
            const month = date.getMonth() + 1;
            const day = date.getDate();
            
            // Create a simple ID based on date components
            return parseInt(`${year}${month.toString().padStart(2, '0')}${day.toString().padStart(2, '0')}`) % 1000 || 1;
        } catch (error) {
            console.warn('Error parsing date:', dateString, error);
            return 1;
        }
    }
    
    // Show loading state
    function showLoading() {
        if (!staffAttendanceView) return;
        
        staffAttendanceView.innerHTML = `
            <div class="text-center py-4">
                <div class="spinner-border text-success" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-2">Loading staff attendance...</p>
            </div>
        `;
    }
    
    // Show error message
    function showError(message) {
        if (!staffAttendanceView) return;
        
        staffAttendanceView.innerHTML = `
            <div class="alert alert-danger" role="alert">
                <i class="bi bi-exclamation-triangle me-2"></i>
                <strong>Error:</strong> ${message}
                <button class="btn btn-outline-danger btn-sm ms-3" onclick="window.fetchStaffAttendanceList('${currentSearch}', 1, ${currentDateAttendanceId}, ${DEFAULT_PER_PAGE}, '${currentStatusFilter}')">
                    <i class="bi bi-arrow-clockwise me-1"></i>Retry
                </button>
            </div>
        `;
    }
    
    // Show empty state
    function showEmpty(message) {
        if (!staffAttendanceView) return;
        
        const searchMessage = currentSearch ? 
            `No staff attendance records found matching "${currentSearch}".` : 
            'No staff attendance records found for the selected criteria.';
        
        const finalMessage = message || searchMessage;
        
        staffAttendanceView.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h5 class="mb-0">Staff Attendance Records</h5>
                </div>
                <div class="card-body">
                    <div class="text-center py-4">
                        <i class="bi bi-calendar-x text-muted" style="font-size: 3rem;"></i>
                        <p class="mt-3 text-muted">${finalMessage}</p>
                    </div>
                </div>
            </div>
        `;
    }
    
    // Render attendance records
    function renderStaffAttendanceRecords(data) {
        if (!staffAttendanceView) return;
        
        const { data: records, current_page, per_page, total, last_page, from, to } = data;
        
        if (!records || records.length === 0) {
            showEmpty();
            return;
        }

        // Store current records data for overtime modal
        currentRecordsData = records;
        
        const recordsHtml = records.map(record => {
            // Generate avatar placeholder from user name
            const userName = record.user_name || 'Staff';
            const placeholderImage = `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=0d6efd&color=fff&size=128&bold=true&rounded=true`;
            
            // Clean up the image URL to remove problematic suffixes
            let userImage = '';
            if (record.user_img && typeof record.user_img === 'string') {
                userImage = record.user_img.replace(/:\d+$/, '').trim(); // Remove :1, :2, etc. suffixes
                userImage = userImage.replace(/\.jpg:.*$/, '.jpg'); // Clean up malformed jpg URLs
                userImage = userImage.replace(/\.png:.*$/, '.png');
                userImage = userImage.replace(/\.jpeg:.*$/, '.jpeg');
                userImage = userImage.replace(/\.gif:.*$/, '.gif');
                
                // Check if the cleaned URL is still valid
                if (userImage.length < 5 || userImage.includes('null') || userImage.includes('undefined') || userImage.includes('…')) {
                    userImage = '';
                } else if (!userImage.startsWith('http') && !userImage.startsWith('/')) {
                    // Construct full URL if it's just a filename
                    userImage = `https://mwms.megacess.com/storage/user-images/${userImage}`;
                } else if (userImage.startsWith('/')) {
                    // Add domain if it starts with /
                    userImage = `https://mwms.megacess.com${userImage}`;
                }
            }
            
            const imgSrc = (userImage && userImage.trim() !== '') ? userImage : placeholderImage;
            
            return `
                <div class="list-group-item staff-attendance-item">
                    <div class="d-flex align-items-center">
                        <div style="width:50px;height:50px;flex:0 0 50px;">
                            <img src="${imgSrc}" 
                                 alt="${userName}" 
                                 class="rounded-circle" 
                                 style="width:50px;height:50px;object-fit:cover" 
                                 onerror="if(this.src!=='${placeholderImage}'){this.src='${placeholderImage}';}">
                        </div>
                        <div class="flex-grow-1 ms-3">
                            <div class="d-flex justify-content-between align-items-start">
                                <div>
                                    <h6 class="mb-1 fw-semibold">${record.user_name}</h6>
                                    <div class="d-flex align-items-center gap-3 text-muted small">
                                        <span><i class="bi bi-box-arrow-in-right me-1"></i>In: ${formatTime(record.check_in)}</span>
                                        <span><i class="bi bi-box-arrow-right me-1"></i>Out: ${formatTime(record.check_out)}</span>
                                    </div>
                                    ${record.checkedin_by || record.checkedout_by ? `
                                        <div class="mt-1 text-muted" style="font-size: 0.8rem;">
                                            ${record.checkedin_by ? `In by: ${record.checkedin_by}` : ''}
                                            ${record.checkedin_by && record.checkedout_by ? ' | ' : ''}
                                            ${record.checkedout_by ? `Out by: ${record.checkedout_by}` : ''}
                                        </div>
                                    ` : ''}
                                </div>
                                <div class="text-end">
                                    ${getStatusBadge(record.status)}
                                    <div class="mt-2">
                                        <div class="btn-group btn-group-sm" role="group">
                                            <button type="button" class="btn btn-outline-primary" title="View Attendance" onclick="window.showStaffAttendanceAnalytics(${record.user_id})">
                                                <i class="bi bi-eye"></i>
                                            </button>
                                            <button type="button" class="btn btn-outline-warning" 
                                                    onclick="markStaffOvertime(${record.user_id})" 
                                                    title="Overtime">
                                                <i class="bi bi-clock"></i>
                                            </button>
                                            <button type="button" class="btn btn-outline-info" 
                                                title="On-Leave" 
                                                onclick="window.showStaffLeaveModal(${record.user_id})">
                                              <i class="bi bi-door-open"></i>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        // Create pagination
        console.log('Staff Pagination data:', { current_page, last_page, total, from, to, per_page });
        const paginationHtml = createStaffPaginationHtml(current_page, last_page, total, from, to, per_page);
        console.log('Staff Pagination HTML length:', paginationHtml ? paginationHtml.length : 0);
        
        staffAttendanceView.innerHTML = `
            <div class="card">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <h5 class="mb-0">Staff Attendance Records</h5>
                    <small class="text-muted">Showing ${from}-${to} of ${total} records</small>
                </div>
                <div class="card-body p-0">
                    <div class="list-group list-group-flush">
                        ${recordsHtml}
                    </div>
                </div>
                ${paginationHtml}
            </div>
        `;
    }
    
    // Create pagination HTML
    function createStaffPaginationHtml(currentPage, lastPage, total, from, to, perPage) {
        // Calculate last page if not provided or invalid
        if (!lastPage || lastPage < 1) {
            lastPage = Math.ceil(total / perPage) || 1;
        }
        
        let paginationItems = '';
        
        // Previous button
        paginationItems += `
            <li class="page-item ${currentPage <= 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="window.fetchStaffAttendanceList('${currentSearch}', ${currentPage - 1}, ${currentDateAttendanceId}, ${DEFAULT_PER_PAGE}, '${currentStatusFilter}')">Previous</a>
            </li>
        `;
        
        // Page numbers
        const startPage = Math.max(1, currentPage - 2);
        const endPage = Math.min(lastPage, currentPage + 2);
        
        if (startPage > 1) {
            paginationItems += `<li class="page-item"><a class="page-link" href="#" onclick="window.fetchStaffAttendanceList('${currentSearch}', 1, ${currentDateAttendanceId}, ${DEFAULT_PER_PAGE}, '${currentStatusFilter}')">1</a></li>`;
            if (startPage > 2) {
                paginationItems += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
            }
        }
        
        for (let i = startPage; i <= endPage; i++) {
            paginationItems += `
                <li class="page-item ${i === currentPage ? 'active' : ''}">
                    <a class="page-link" href="#" onclick="window.fetchStaffAttendanceList('${currentSearch}', ${i}, ${currentDateAttendanceId}, ${DEFAULT_PER_PAGE}, '${currentStatusFilter}')">${i}</a>
                </li>
            `;
        }
        
        if (endPage < lastPage) {
            if (endPage < lastPage - 1) {
                paginationItems += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
            }
            paginationItems += `<li class="page-item"><a class="page-link" href="#" onclick="window.fetchStaffAttendanceList('${currentSearch}', ${lastPage}, ${currentDateAttendanceId}, ${DEFAULT_PER_PAGE}, '${currentStatusFilter}')">${lastPage}</a></li>`;
        }
        
        // Next button
        paginationItems += `
            <li class="page-item ${currentPage >= lastPage ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="window.fetchStaffAttendanceList('${currentSearch}', ${currentPage + 1}, ${currentDateAttendanceId}, ${DEFAULT_PER_PAGE}, '${currentStatusFilter}')">Next</a>
            </li>
        `;
        
        return `
            <div class="card-footer">
                <nav aria-label="Staff Attendance pagination">
                    <ul class="pagination pagination-sm justify-content-center mb-0">
                        ${paginationItems}
                    </ul>
                </nav>
            </div>
        `;
    }
    
    // Main fetch function
    async function fetchStaffAttendanceList(search = '', page = 1, dateAttendanceId = 1, perPage = DEFAULT_PER_PAGE, statusFilter = 'all') {
        if (!staffAttendanceView) return;
        
        currentSearch = search;
        currentPage = page;
        currentDateAttendanceId = dateAttendanceId;
        currentStatusFilter = statusFilter;
        
        showLoading();
        
        try {
            const url = new URL(`${API_BASE_URL}/user-attendance`);
            
            // Add query parameters
            const params = {
                date_attendance_id: dateAttendanceId.toString(),
                page: page.toString(),
                per_page: perPage.toString()
            };
            
            // Add search parameter if provided
            if (search && search.trim()) {
                params.search = search.trim();
            }
            
            // Add status filter if not 'all'
            if (statusFilter && statusFilter !== 'all') {
                params.status = statusFilter;
            }
            
            Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
            
            const headers = {
                'Authorization': `Bearer ${getAuthToken()}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            };
            
            console.log('Fetching staff attendance from:', url.toString());
            console.log('Search parameters:', params);
            
            const response = await fetch(url, {
                method: 'GET',
                headers
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            console.log('Staff Attendance API Response:', result);
            
            if (result.success && result.data) {
                // Apply client-side filtering as fallback if API doesn't filter properly
                let filteredData = result.data;
                
                // If we have a search term but got all records, filter client-side
                if (search && search.trim() && filteredData.data && Array.isArray(filteredData.data)) {
                    const searchTerm = search.trim().toLowerCase();
                    console.log('Applying client-side search filter for:', searchTerm);
                    
                    filteredData.data = filteredData.data.filter(record => {
                        return record.user_name && record.user_name.toLowerCase().includes(searchTerm);
                    });
                }
                
                // Apply client-side status filtering as fallback
                if (statusFilter && statusFilter !== 'all' && filteredData.data && Array.isArray(filteredData.data)) {
                    console.log('Applying client-side status filter for:', statusFilter);
                    filteredData.data = filteredData.data.filter(record => {
                        if (!record.status) return false;
                        // Case-insensitive substring match
                        return record.status.toLowerCase().includes(statusFilter.toLowerCase());
                    });
                }
                
                // Update the totals to reflect filtered results
                if (filteredData.data && Array.isArray(filteredData.data)) {
                    filteredData.total = filteredData.data.length;
                    filteredData.to = Math.min(filteredData.from + filteredData.data.length - 1, filteredData.total);
                    filteredData.last_page = Math.ceil(filteredData.total / filteredData.per_page);
                }
                
                renderStaffAttendanceRecords(filteredData);
            } else {
                showError(result.message || 'Failed to load staff attendance records');
            }
            
        } catch (error) {
            console.error('Error fetching staff attendance:', error);
            showError(error.message || 'Failed to connect to the server. Please try again.');
        }
    }
    
    window.markStaffOvertime = function(userId) {
        console.log('Mark overtime for staff user ID:', userId);
        
        // Find the record data for this staff member
        const staffData = getCurrentStaffData(userId);
        
        if (staffData) {
            // Clean up the image URL to remove any problematic suffixes
            let cleanImageUrl = '';
            // Use user_img for staff (not staff_img)
            if (staffData.user_img && typeof staffData.user_img === 'string') {
                cleanImageUrl = staffData.user_img.replace(/:\d+$/, '').trim(); // Remove :1, :2, etc. suffixes
                // Check if the cleaned URL is still valid
                if (cleanImageUrl.length < 5 || cleanImageUrl.includes('null') || cleanImageUrl.includes('undefined')) {
                    cleanImageUrl = '';
                }
            }
            
            // Show the overtime modal with user data
            window.showOvertimeModal(
                userId, 
                staffData.user_name || 'Staff Member', 
                'Staff', 
                cleanImageUrl, 
                'staff'
            );
        } else {
            // Fallback if data not found
            window.showOvertimeModal(userId, 'Staff Member', 'Staff', '', 'staff');
        }
    };

    // Helper function to get current staff data
    function getCurrentStaffData(userId) {
        console.log('getCurrentStaffData called with userId:', userId);
        console.log('Available staff records:', currentRecordsData.length);
        
        // Find the record in the current data
        const staff = currentRecordsData.find(record => record.user_id == userId);
        console.log('Found staff data:', staff);
        return staff || null;
    }
    
    // Expose main function globally so it can be called from manage-attendance.html
    window.fetchStaffAttendanceList = fetchStaffAttendanceList;
    
    // Ensure showStaffAttendanceAnalytics is globally available
    window.showStaffAttendanceAnalytics = showStaffAttendanceAnalytics;

    // Show Staff Leave Modal function
    window.showStaffLeaveModal = function(userId) {
            // Add Leave button handler and modal
            // Attach Add Leave button event directly after modal is rendered
            document.addEventListener('click', function(e) {
              const addBtn = e.target.closest('#addLeaveBtn');
              if (addBtn) {
                // Remove any existing modal
                let oldModal = document.getElementById('addLeaveModal');
                if (oldModal) oldModal.remove();
                // Show form modal
                document.body.insertAdjacentHTML('beforeend', `
                  <div id='addLeaveModal' style='position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:10001;'>
                    <div style='background:#fff;padding:32px 40px;border-radius:14px;max-width:420px;width:100%;box-shadow:0 2px 16px rgba(0,0,0,0.15);text-align:left;position:relative;'>
                      <div style='font-size:1.3rem;font-weight:700;margin-bottom:8px;'>Add Leave</div>
                      <hr style='margin:0 0 18px 0;'>
                      <form id='addLeaveForm'>
                        <div class='mb-3'>
                          <label class='form-label'>Type of Leave</label>
                          <select class='form-select' name='status' required>
                            <option value=''>Select type</option>
                            <option value='annual_leave'>Annual Leave</option>
                            <option value='sick_leave'>Sick Leave</option>
                            <option value='unpaid_leave'>Unpaid Leave</option>
                          </select>
                        </div>
                        <div class='mb-3'>
                          <label class='form-label'>From Date</label>
                          <input type='date' class='form-control' name='from_date' required>
                        </div>
                        <div class='mb-3'>
                          <label class='form-label'>To Date</label>
                          <input type='date' class='form-control' name='to_date' required>
                        </div>
                        <div class='mb-3'>
                          <label class='form-label'>Notes</label>
                          <textarea class='form-control' name='notes' rows='2'></textarea>
                        </div>
                        <div class='d-flex justify-content-end gap-2'>
                          <button type='button' class='btn btn-secondary' id='closeAddLeaveModal'>Cancel</button>
                          <button type='submit' class='btn btn-success'>Submit</button>
                        </div>
                      </form>
                    </div>
                  </div>
                `);
                setTimeout(() => {
                  document.getElementById('closeAddLeaveModal').onclick = function() {
                    document.getElementById('addLeaveModal').remove();
                  };
                  document.getElementById('addLeaveForm').onsubmit = async function(e) {
                    e.preventDefault();
                    const form = e.target;
                    const status = form.status.value;
                    const from_date = form.from_date.value;
                    const to_date = form.to_date.value;
                    const notes = form.notes.value;
                    const token = getAuthToken();
                    if (!token) return;
                    const payload = {
                      user_id: userId,
                      from_date,
                      to_date,
                      status,
                      notes
                    };
                    try {
                      const resp = await fetch(`${API_BASE_URL}/user-attendance/mark-leave`, {
                        method: 'POST',
                        headers: {
                          'Authorization': `Bearer ${token}`,
                          'Content-Type': 'application/json',
                          'Accept': 'application/json'
                        },
                        body: JSON.stringify(payload)
                      });
                      const result = await resp.json();
                      if (result.success) {
                        document.getElementById('addLeaveModal').remove();
                        fetchAndRenderLeaves();
                        alert(result.message || 'Leave added successfully');
                      } else {
                        alert(result.message || 'Failed to add leave');
                      }
                    } catch (err) {
                      alert('Error adding leave: ' + err.message);
                    }
                  };
                }, 0);
              }
            });
      // Find the record data for this staff member
      const staffData = getCurrentStaffData(userId);
      let staffName = staffData && staffData.user_name ? staffData.user_name : 'Staff Member';
      let staffImg = '';
      if (staffData && staffData.user_img && staffData.user_img.trim() !== '') {
        let userImage = staffData.user_img.replace(/:\d+$/, '').trim();
        userImage = userImage.replace(/\.jpg:.*$/, '.jpg');
        userImage = userImage.replace(/\.png:.*$/, '.png');
        userImage = userImage.replace(/\.jpeg:.*$/, '.jpeg');
        userImage = userImage.replace(/\.gif:.*$/, '.gif');
        if (userImage.length < 5 || userImage.includes('null') || userImage.includes('undefined') || userImage.includes('…')) {
          staffImg = `https://ui-avatars.com/api/?name=${encodeURIComponent(staffName)}&background=0d6efd&color=fff&size=128&bold=true&rounded=true`;
        } else if (!userImage.startsWith('http') && !userImage.startsWith('/')) {
          staffImg = `https://mwms.megacess.com/storage/user-images/${userImage}`;
        } else if (userImage.startsWith('/')) {
          staffImg = `https://mwms.megacess.com${userImage}`;
        } else {
          staffImg = userImage;
        }
      } else {
        staffImg = `https://ui-avatars.com/api/?name=${encodeURIComponent(staffName)}&background=0d6efd&color=fff&size=128&bold=true&rounded=true`;
      }
      // Remove any existing modal first
      const oldModal = document.getElementById('staffLeaveModal');
      if (oldModal) oldModal.remove();
      // Filter state
      let filterYear, filterMonth, filterType = '';
      const now = new Date();
      filterYear = now.getFullYear();
      filterMonth = String(now.getMonth()+1).padStart(2,'0');
      // Modal shell with filter UI
      document.body.insertAdjacentHTML('beforeend', `
        <div id="staffLeaveModal" style="position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999;">
          <div style="background:#fff;padding:24px 32px;border-radius:12px;box-shadow:0 2px 16px rgba(0,0,0,0.15);position:relative;max-width:900px;width:100%;">
            <button type="button" class="btn-close" style="position:absolute;top:18px;right:18px;z-index:2;" onclick="document.getElementById('staffLeaveModal').remove();"></button>
            <div class="d-flex align-items-center mb-3">
              <img src="${staffImg}" alt="${staffName}" class="rounded-circle me-3" style="width:80px;height:80px;object-fit:cover;"
                onerror="this.onerror=null;this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(staffName)}&background=0d6efd&color=fff&size=128&bold=true&rounded=true';">
              <div class="d-flex align-items-center">
                <h4 class="fw-bold mb-1 me-3">${staffName}</h4>
                <button type="button" class="btn btn-success btn-sm" id="addLeaveBtn" style="margin-left:4px;">
                  <i class="bi bi-plus-lg me-1"></i> Add Leave
                </button>
              </div>
             
            </div>
            <div id="staffLeaveFilterContainer" class="mb-3"></div>
            <div id="staffLeaveModalBody">
              <div class="py-3 text-center"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div></div>
            </div>
            <button type="button" class="btn btn-secondary mt-3" onclick="document.getElementById('staffLeaveModal').remove();">Close</button>
          </div>
        </div>
      `);

      // Fetch and render leave records with filter
      async function fetchAndRenderLeaves() {
        const token = getAuthToken();
        if (!token) return;
        const page = 1;
        const perPage = 10;
        const url = new URL(`${API_BASE_URL}/user-attendance/${userId}/leaves`);
        url.searchParams.append('month', `${filterYear}-${filterMonth}`);
        if (filterType) {
          // Map display value to API value
          let apiType = filterType;
          if (apiType === 'Sick Leave') apiType = 'sick_leave';
          else if (apiType === 'Annual Leave') apiType = 'annual_leave';
          else if (apiType === 'Unpaid Leave') apiType = 'unpaid_leave';
          url.searchParams.append('status', apiType);
        }
        url.searchParams.append('page', page);
        url.searchParams.append('per_page', perPage);
        const headers = {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        };
        const bodyDiv = document.getElementById('staffLeaveModalBody');
        if (bodyDiv) bodyDiv.innerHTML = `<div class='py-3 text-center'><div class='spinner-border text-primary' role='status'><span class='visually-hidden'>Loading...</span></div></div>`;
        try {
          const resp = await fetch(url, { method: 'GET', headers });
          const result = await resp.json();
          if (result.success && result.data && Array.isArray(result.data.data)) {
            const leaves = result.data.data;
            // Get unique leave types for filter
            const leaveTypes = Array.from(new Set(leaves.map(l => l.type_of_leave))).filter(Boolean);
            // Render filter UI
            const filterDiv = document.getElementById('staffLeaveFilterContainer');
            if (filterDiv) {
              let yearOptions = '';
              for (let y = now.getFullYear() - 5; y <= now.getFullYear() + 1; y++) {
                  yearOptions += `<option value='${y}' ${y==filterYear?'selected':''}>${y}</option>`;
              }
              const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
              let monthOptions = '';
              for (let m = 1; m <= 12; m++) {
                  monthOptions += `<option value='${m}' ${String(m).padStart(2,'0')==filterMonth?'selected':''}>${months[m-1]}</option>`;
              }
              let typeOptions = `<option value=''>All Types</option>`;
              const allowedTypes = ['Annual Leave','Sick Leave','Unpaid Leave'];
              for (const t of allowedTypes) {
                  typeOptions += `<option value='${t}'>${t}</option>`;
              }
              filterDiv.innerHTML = `
                  <div class='d-flex gap-2 align-items-center'>
                    <select id='staffLeaveFilterYear' class='form-select form-select-sm' style='max-width:100px;'>${yearOptions}</select>
                    <select id='staffLeaveFilterMonth' class='form-select form-select-sm' style='max-width:120px;'>${monthOptions}</select>
                    <select id='staffLeaveFilterType' class='form-select form-select-sm' style='max-width:140px;'>${typeOptions}</select>
                  </div>
                `;
                setTimeout(() => {
                  document.getElementById('staffLeaveFilterYear').onchange = e => { filterYear = e.target.value; fetchAndRenderLeaves(); };
                  document.getElementById('staffLeaveFilterMonth').onchange = e => { filterMonth = String(e.target.value).padStart(2,'0'); fetchAndRenderLeaves(); };
                  document.getElementById('staffLeaveFilterType').onchange = e => { filterType = e.target.value; fetchAndRenderLeaves(); };
                }, 0);
            }
            // Render leave list (same as before)
            if (leaves.length === 0) {
              bodyDiv.innerHTML = `<p class='text-muted mt-3'>No leave records found for this staff.</p>`;
              return;
            }
            let leaveHtml = `<div style='max-height:340px;overflow-y:auto;'>`;
            for (const leave of leaves) {
              let color = '#0d6efd';
              let icon = '';
              let label = leave.type_of_leave || 'Leave';
              if (label.toLowerCase().includes('annual')) { color = '#0dcaf0'; icon = '<i class="bi bi-calendar-heart me-1"></i>'; }
              else if (label.toLowerCase().includes('sick')) { color = '#6c757d'; icon = '<i class="bi bi-emoji-frown me-1"></i>'; }
              else if (label.toLowerCase().includes('unpaid')) { color = '#212529'; icon = '<i class="bi bi-cash me-1"></i>'; }
              else if (label.toLowerCase().includes('late')) { color = '#ffc107'; icon = '<i class="bi bi-clock-history me-1"></i>'; }
              else if (label.toLowerCase().includes('absent')) { color = '#dc3545'; icon = '<i class="bi bi-x-circle me-1"></i>'; }

              leaveHtml += `
                <div class='d-flex align-items-center mb-2' style='background:#fff;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.04);border-left:8px solid ${color};min-height:54px;'>
                  <div class='px-3 py-2 flex-grow-1 d-flex align-items-center'>
                    <div class='fw-bold' style='font-size:1.1rem;min-width:110px;'>${leave.date || leave.start_date || '-'}</div>
                    <div class='ms-3 text-muted small'>${leave.remarks || ''}</div>
                  </div>
                  <div class='px-3'>
                    <span style='cursor:pointer;display:inline-flex;align-items:center;justify-content:center;background:${color};color:#fff;font-weight:600;min-width:130px;height:36px;border-radius:8px;box-shadow:0 2px 6px rgba(0,0,0,0.08);font-size:1rem;vertical-align:middle;letter-spacing:0.01em;white-space:nowrap;padding:0 18px;' onclick='window.showStaffLeaveDetailsModal(${JSON.stringify(leave).replace(/'/g,"&#39;")})'>${icon}${label}</span>
                  </div>
                </div>
              `;
            }
            leaveHtml += `</div>`;
            bodyDiv.innerHTML = leaveHtml;
          } else {
            bodyDiv.innerHTML = `<p class='text-danger mt-3'>Failed to load leave records.</p>`;
          }
        } catch {
          if (bodyDiv) bodyDiv.innerHTML = `<p class='text-danger mt-3'>Error loading leave records.</p>`;
        }
      }
      fetchAndRenderLeaves();

      // Details modal function
      window.showStaffLeaveDetailsModal = function(leave) {
        // Remove any existing details modal
        let detailsModal = document.getElementById('staffLeaveDetailsModal');
        if (detailsModal) detailsModal.remove();
        // Render details
        document.body.insertAdjacentHTML('beforeend', `
          <div id='staffLeaveDetailsModal' style='position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:10000;'>
            <div style='background:#e5e5e5;padding:32px 40px;border-radius:14px;max-width:540px;width:100%;box-shadow:0 2px 16px rgba(0,0,0,0.15);text-align:left;position:relative;'>
              <div style='font-size:1.4rem;font-weight:700;margin-bottom:8px;'>Leave Details</div>
              <hr style='margin:0 0 18px 0;'>
              <div style='margin-bottom:18px;'>
                <div style='color:#666;font-size:1.05rem;margin-bottom:6px;'>Type of leave:</div>
                <span style='display:inline-flex;align-items:center;justify-content:center;background:#0d6efd;color:#fff;font-weight:600;min-width:150px;height:38px;border-radius:10px;box-shadow:0 2px 6px rgba(0,0,0,0.08);font-size:1.08rem;vertical-align:middle;letter-spacing:0.01em;white-space:nowrap;padding:0 18px;'>${leave.type_of_leave}</span>
              </div>
              <div class='row' style='display:flex;flex-wrap:wrap;margin-bottom:12px;'>
                <div style='flex:1 1 180px;margin-bottom:10px;'>
                  <div style='color:#666;font-size:1.01rem;'>Created by:</div>
                  <div style='font-size:1.08rem;'>${leave.created_by || '-'}</div>
                </div>
                <div style='flex:1 1 180px;margin-bottom:10px;'>
                  <div style='color:#666;font-size:1.01rem;'>Created at:</div>
                  <div style='font-size:1.08rem;'>${leave.created_at ? leave.created_at.split('T')[0] : leave.date || leave.start_date || '-'}</div>
                </div>
                <div style='flex:1 1 180px;margin-bottom:10px;'>
                  <div style='color:#666;font-size:1.01rem;'>Start Date:</div>
                  <div style='font-size:1.08rem;'>${leave.start_date || leave.date || '-'}</div>
                </div>
                <div style='flex:1 1 180px;margin-bottom:10px;'>
                  <div style='color:#666;font-size:1.01rem;'>End Date:</div>
                  <div style='font-size:1.08rem;'>${leave.end_date || '-'}</div>
                </div>
              </div>
              <div style='color:#666;font-size:1.01rem;'>Remarks:</div>
              <div style='font-size:1.08rem;'>${leave.remarks || '-'}</div>
              <button id='closeStaffLeaveDetailsModal' class='btn btn-secondary mt-3' style='min-width:100px;margin-top:24px;'>Close</button>
            </div>
          </div>
        `);
        setTimeout(() => {
          const closeBtn = document.getElementById('closeStaffLeaveDetailsModal');
          if (closeBtn) closeBtn.onclick = function() { document.getElementById('staffLeaveDetailsModal').remove(); };
        }, 0);
      };
    };

    // Add delegated event listener for View button
    if (staffAttendanceView) {
        staffAttendanceView.addEventListener('click', async function(e) {
            const viewBtn = e.target.closest('button[data-view-user-id]');
            if (viewBtn) {
                const userId = viewBtn.getAttribute('data-view-user-id');
                // Ensure month is always YYYY-MM
                let month = new Date().toISOString().slice(0, 7); // Default to current month
                // If staff data is available, try to use their attendance month if present
                const staffData = getCurrentStaffData(userId);
                if (staffData && staffData.month) {
                    // Only use if matches YYYY-MM
                    const match = /^\d{4}-\d{2}$/.test(staffData.month) ? staffData.month : null;
                    if (match) month = staffData.month;
                }
                const token = getAuthToken();
                if (!token) return;
                // Use userId in API URL
                const url = new URL(`https://mwms.megacess.com/api/v1/user-attendance/${userId}/analytics`);
                url.searchParams.append('month', month);
                const headers = {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                };
                try {
                    const response = await fetch(url, { method: 'GET', headers });
                    const result = await response.json();
                    if (result.success && result.data) {
                        showStaffAnalyticsModal(result.data);
                    } else {
                        alert(result.message || 'Failed to load analytics');
                    }
                } catch (err) {
                    alert('Error fetching analytics: ' + err.message);
                }
            }
        });
    }

    // Define the function outside and assign to window
    async function showStaffAttendanceAnalytics(userId, year, month, status) {
        const token = getAuthToken();
        if (!token) return;
        const now = new Date();
        // Always default to current year/month if not provided
        const currentYear = year || now.getFullYear();
        const currentMonth = month || String(now.getMonth() + 1).padStart(2, '0');
        const currentStatus = status || 'all';
        const url = new URL(`https://mwms.megacess.com/api/v1/user-attendance/${userId}/analytics`);
        url.searchParams.append('month', `${currentYear}-${currentMonth}`);
        if (currentStatus && currentStatus !== 'all') url.searchParams.append('status', currentStatus);
        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
        try {
            const response = await fetch(url, { method: 'GET', headers });
            const result = await response.json();
            if (result.success && result.data) {
                const data = result.data;
                const staffData = getCurrentStaffData(userId);
                let avatar = '';
                if (staffData && staffData.user_img && staffData.user_img.trim() !== '') {
                    let img = staffData.user_img.trim();
                    if (img.startsWith('http')) {
                        avatar = img;
                    } else if (img.startsWith('/')) {
                        avatar = `https://mwms.megacess.com${img}`;
                    } else {
                        avatar = `https://mwms.megacess.com/storage/user-images/${img}`;
                    }
                } else {
                    avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(staffData ? staffData.user_name : 'User')}&background=cccccc&color=fff&size=96`;
                }
                const staffName = staffData ? staffData.user_name : 'User';
                const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
                let yearOptions = '';
                for (let y = now.getFullYear() - 5; y <= now.getFullYear() + 1; y++) {
                    yearOptions += `<option value='${y}' ${y==currentYear?'selected':''}>${y}</option>`;
                }
                let monthOptions = '';
                for (let i = 0; i < 12; i++) {
                    monthOptions += `<option value='${String(i+1).padStart(2,'0')}' ${(i+1)==parseInt(currentMonth)?'selected':''}>${months[i]}</option>`;
                }
                // Status options
                const statusOptionsArr = [
                  {value:'all',label:'All Status'},
                  {value:'Present',label:'Present'},
                  {value:'Absent',label:'Absent'},
                  {value:'Late',label:'Late'},
                  {value:'On_Leave',label:'On Leave'}
                ];
                let statusOptions = '';
                for (const opt of statusOptionsArr) {
                  statusOptions += `<option value='${opt.value}' ${opt.value==currentStatus?'selected':''}>${opt.label}</option>`;
                }
                // Modal HTML (cleaned layout)
                const modalHtml = `
                <div class='modal fade' id='staffAttendanceAnalyticsModal' tabindex='-1' aria-labelledby='staffAttendanceAnalyticsModalLabel' aria-hidden='true'>
                  <div class='modal-dialog modal-lg'>
                    <div class='modal-content' style='background:#e6fae6;border-radius:16px;'>
                      <div class='modal-header' style='border-bottom:none;background:#e6fae6;'>
                        <h5 class='modal-title fw-bold' id='staffAttendanceAnalyticsModalLabel' style='color:#226622;'>Manage Attendance &gt; View Attendance</h5>
                        <button type='button' class='btn-close' data-bs-dismiss='modal' aria-label='Close'></button>
                      </div>
                      <div class='modal-body' style='background:#e6fae6;padding:32px 32px 24px 32px;'>
                        <div style='background:#fff;border-radius:16px;padding:18px 24px;display:flex;align-items:center;gap:18px;margin-bottom:24px;box-shadow:0 2px 8px rgba(0,0,0,0.04);'>
                          <img src='${avatar}' alt='${staffName}' style='width:56px;height:56px;border-radius:50%;object-fit:cover;background:#fff;border:2px solid #b2f5b2;'>
                          <div style='font-size:1.15rem;font-weight:600;'>${staffName}</div>
                        </div>
                        <div class='row g-3 align-items-center mb-3'>
                          <div class='col-auto'>
                            <select id='analyticsYear' class='form-select form-select-sm' style='min-width:90px;'>${yearOptions}</select>
                          </div>
                          <div class='col-auto'>
                            <select id='analyticsMonth' class='form-select form-select-sm' style='min-width:120px;'>${monthOptions}</select>
                          </div>
                        </div>
                        <div class='row g-3 mb-4'>
                          <div class='col-md-4'>
                            <div style='background:#fff;border-radius:10px;padding:20px 0;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,0.04);'>
                              <div style='font-size:1.05rem;color:#888;margin-bottom:8px;'>Attendance Rate</div>
                              <div style='font-size:1.7rem;font-weight:700;color:#2e7d32;'>${data.attendance_rate ?? 0}%</div>
                            </div>
                          </div>
                          <div class='col-md-4'>
                            <div style='background:#fff;border-radius:10px;padding:20px 0;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,0.04);'>
                              <div style='font-size:1.05rem;color:#888;margin-bottom:8px;'>Punctuality Rate</div>
                              <div style='font-size:1.7rem;font-weight:700;color:#2e7d32;'>${data.punctuality_rate ?? 0}%</div>
                            </div>
                          </div>
                          <div class='col-md-4'>
                            <div style='background:#fff;border-radius:10px;padding:20px 0;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,0.04);'>
                              <div style='font-size:1.05rem;color:#888;margin-bottom:8px;'>Number of days absence</div>
                              <div style='font-size:1.7rem;font-weight:700;color=#2e7d32;'>${data.number_absent ?? 0}</div>
                            </div>
                          </div>
                        </div>
                        <div style='border-radius:12px;padding:18px 18px 8px 18px;box-shadow:0 2px 8px rgba(0,0,0,0.03);margin-top:24px;'>
                          <div style='font-weight:600;font-size:1.1rem;margin-bottom:12px;'>Attendance Records</div>
                          <div class="row g-2 align-items-center mb-2">
                            <div class="col-auto">
                              <select id="recordsYear" class="form-select form-select-sm" style="min-width:90px;"></select>
                            </div>
                            <div class="col-auto">
                              <select id="recordsMonth" class="form-select form-select-sm" style="min-width:120px;"></select>
                            </div>
                            <div class="col-auto">
                              <select id="recordsStatus" class="form-select form-select-sm" style="min-width:120px;"></select>
                            </div>
                          </div>
                          <div id='staffAttendanceRecordsTable'><div class='text-center text-muted py-3'>Loading records...</div></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>`;
                // Remove any existing modal
                var oldModal = document.getElementById('staffAttendanceAnalyticsModal');
                if (oldModal) oldModal.remove();
                document.body.insertAdjacentHTML('beforeend', modalHtml);
                var modalElem = document.getElementById('staffAttendanceAnalyticsModal');
                var modal = new bootstrap.Modal(modalElem, { backdrop: 'static', keyboard: true });
                // Add smooth fade-in by adding 'show' class after a short delay
                setTimeout(() => {
                  modalElem.classList.add('show');
                  modalElem.style.display = 'block';
                  modalElem.style.opacity = '1';
                }, 10);
                modal.show();
                // Smooth fade-out and remove modal from DOM after hidden
                modalElem.addEventListener('hidden.bs.modal', function () {
                  modalElem.classList.remove('show');
                  modalElem.style.opacity = '0';
                  setTimeout(() => {
                    // Remove modal from DOM
                    if (modalElem) modalElem.remove();
                    // Remove any lingering Bootstrap modal backdrop
                    document.querySelectorAll('.modal-backdrop').forEach(function(backdrop) {
                      backdrop.remove();
                    });
                    document.body.classList.remove('modal-open');
                    document.body.style.overflow = '';
                  }, 300); // Wait for fade-out
                });
                // Add dropdown listeners for year/month/status (both summary and records)
                setTimeout(() => {
                  const yearSelect = document.getElementById('analyticsYear');
                  const monthSelect = document.getElementById('analyticsMonth');
                  const recYear = document.getElementById('recordsYear');
                  const recMonth = document.getElementById('recordsMonth');
                  const recStatus = document.getElementById('recordsStatus');
                  // Populate records filter dropdowns
                  if (recYear && recMonth && recStatus) {
                    // Years: 5 years back to next year
                    let recYearOptions = '';
                    for (let y = now.getFullYear() - 5; y <= now.getFullYear() + 1; y++) {
                      recYearOptions += `<option value='${y}' ${y==now.getFullYear()?'selected':''}>${y}</option>`;
                    }
                    recYear.innerHTML = recYearOptions;
                    // Months
                    let recMonthOptions = '';
                    for (let i = 0; i < 12; i++) {
                      recMonthOptions += `<option value='${String(i+1).padStart(2,'0')}' ${(i+1)==(now.getMonth()+1)?'selected':''}>${months[i]}</option>`;
                    }
                    recMonth.innerHTML = recMonthOptions;
                    // Status
                    const recStatusOptionsArr = [
                      {value:'all',label:'All Status'},
                      {value:'Present',label:'Present'},
                      {value:'Absent',label:'Absent'},
                      {value:'Late',label:'Late'},
                      {value:'Check_in',label:'Check In'},
                      {value:'Annual_Leave',label:'Annual Leave'},
                      {value:'Sick_Leave',label:'Sick Leave'},
                      {value:'Unpaid_Leave',label:'Unpaid Leave'}
                    ];
                    let recStatusOptions = '';
                    for (const opt of recStatusOptionsArr) {
                      recStatusOptions += `<option value='${opt.value}' ${opt.value=='all'?'selected':''}>${opt.label}</option>`;
                    }
                    recStatus.innerHTML = recStatusOptions;
                    // Set dropdowns to current year/month/status on first open
                    recYear.value = now.getFullYear();
                    recMonth.value = String(now.getMonth()+1).padStart(2, '0');
                    recStatus.value = 'all';
                  }
                  // Set analytics dropdowns to current year/month
                  if (yearSelect) yearSelect.value = now.getFullYear();
                  if (monthSelect) monthSelect.value = String(now.getMonth()+1).padStart(2, '0');
                  // Analytics filter: reload only analytics summary (not records)
                  async function reloadAnalyticsOnly() {
                    // Fetch analytics summary for selected year/month/status, update only the summary section
                    const selectedYear = yearSelect.value;
                    const selectedMonth = monthSelect.value;
                    const selectedStatus = currentStatus; // keep status as before, or add a status dropdown if needed
                    const analyticsUrl = new URL(`https://mwms.megacess.com/api/v1/user-attendance/${userId}/analytics`);
                    analyticsUrl.searchParams.append('month', `${selectedYear}-${selectedMonth}`);
                    if (selectedStatus && selectedStatus !== 'all') analyticsUrl.searchParams.append('status', selectedStatus);
                    try {
                      const analyticsResponse = await fetch(analyticsUrl, { method: 'GET', headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                      }});
                      const analyticsResult = await analyticsResponse.json();
                      if (analyticsResult.success && analyticsResult.data) {
                        // Update only the analytics summary section
                        const data = analyticsResult.data;
                        // Update the summary cards
                        const summaryCards = modalElem.querySelectorAll('.row.g-3.mb-4 .col-md-4');
                        if (summaryCards.length === 3) {
                          summaryCards[0].querySelector('div > div:last-child').innerHTML = `${data.attendance_rate ?? 0}%`;
                          summaryCards[1].querySelector('div > div:last-child').innerHTML = `${data.punctuality_rate ?? 0}%`;
                          summaryCards[2].querySelector('div > div:last-child').innerHTML = `${data.number_absent ?? 0}`;
                        }
                      }
                    } catch (err) {
                      // Optionally show error in summary section
                    }
                  }
                  // Records filter: only reload records, not analytics
                  function reloadRecordsOnly() {
                    fetchAndRenderAttendanceRecords();
                  }
                  if (yearSelect && monthSelect) {
                    yearSelect.addEventListener('change', reloadAnalyticsOnly);
                    monthSelect.addEventListener('change', reloadAnalyticsOnly);
                  }
                  if (recYear && recMonth && recStatus) {
                    recYear.addEventListener('change', reloadRecordsOnly);
                    recMonth.addEventListener('change', reloadRecordsOnly);
                    recStatus.addEventListener('change', reloadRecordsOnly);
                  }
                  // Fetch records for current month on first open
                  fetchAndRenderAttendanceRecords();
                }, 300);
                // Fetch and render attendance records for this user and month
                async function fetchAndRenderAttendanceRecords() {
                  const recordsUrl = new URL(`https://mwms.megacess.com/api/v1/user-attendance/${userId}/records`);
                  // Use selected filters if available
                  let recYearVal = currentYear, recMonthVal = String(currentMonth).padStart(2, '0'), recStatusVal = currentStatus;
                  const recYear = document.getElementById('recordsYear');
                  const recMonth = document.getElementById('recordsMonth');
                  const recStatus = document.getElementById('recordsStatus');
                  if (recYear && recMonth && recStatus) {
                    recYearVal = recYear.value;
                    recMonthVal = recMonth.value;
                    recStatusVal = recStatus.value;
                  }
                  recordsUrl.searchParams.append('month', `${recYearVal}-${recMonthVal}`);
                  const recordsHeaders = {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                  };
                  try {
                    const recordsResponse = await fetch(recordsUrl, { method: 'GET', headers: recordsHeaders });
                    const recordsResult = await recordsResponse.json();
                    let recordsArr = [];
                    if (recordsResult.success && recordsResult.data && Array.isArray(recordsResult.data.data)) {
                      recordsArr = recordsResult.data.data;
                      // Client-side status filter
                      if (recStatusVal && recStatusVal !== 'all') {
                        const selectedStatus = recStatusVal.trim().toLowerCase();
                        recordsArr = recordsArr.filter(r => {
                          if (!r.status) return false;
                          let recordStatus = r.status.trim().toLowerCase();
                          if (recordStatus === 'annual_leave') recordStatus = 'annual leave';
                          if (recordStatus === 'sick_leave') recordStatus = 'sick leave';
                          if (recordStatus === 'unpaid_leave') recordStatus = 'unpaid leave';
                          if (recordStatus === 'check_in') recordStatus = 'check in';
                          return recordStatus === selectedStatus;
                        });
                      }
                      renderAttendanceRecordsTable({data: recordsArr});
                    } else {
                      document.getElementById('staffAttendanceRecordsTable').innerHTML = `<div class='text-muted py-3'>No attendance records found for this month.</div>`;
                    }
                  } catch (err) {
                    document.getElementById('staffAttendanceRecordsTable').innerHTML = `<div class='text-danger py-3'>Error loading attendance records.</div>`;
                  }
                }
                // Render records in card/list style (matching Worker Option, with button style as pasted image)
                function renderAttendanceRecordsTable(recordsData) {
                  const records = recordsData.data;
                  if (!records || records.length === 0) {
                    document.getElementById('staffAttendanceRecordsTable').innerHTML = `<div class='text-muted py-3'>No attendance records found for this month.</div>`;
                    return;
                  }
                  let listHtml = `<div style='max-height:340px;overflow-y:auto;padding-right:2px;'>`;
                  records.forEach((rec, idx) => {
                    // Worker-style color and badge logic (Bootstrap icons)
                    let statusColor = '#888';
                    let btnBg = '#adb5bd';
                    let btnText = '#222';
                    let btnIcon = '';
                    let btnLabel = rec.status || '';
                    if (rec.status === 'Present') {
                      statusColor = '#198754'; btnBg = '#198754'; btnText = '#fff'; btnIcon = '<i class="bi bi-check-lg"></i>'; btnLabel = 'Present';
                    } else if (rec.status === 'Absent') {
                      statusColor = '#dc3545'; btnBg = '#dc3545'; btnText = '#fff'; btnIcon = '<i class="bi bi-x-lg"></i>'; btnLabel = 'Absent';
                    } else if (rec.status === 'Check_in') {
                      statusColor = '#0d6efd'; btnBg = '#0d6efd'; btnText = '#fff'; btnIcon = '<i class="bi bi-record-circle"></i>'; btnLabel = 'Check In';
                    } else if (rec.status === 'Late') {
                      statusColor = '#ffc107'; btnBg = '#ffc107'; btnText = '#222'; btnIcon = '<i class="bi bi-clock-history"></i>'; btnLabel = 'Late';
                    } else if (rec.status === 'Annual_Leave') {
                      statusColor = '#0dcaf0'; btnBg = '#0dcaf0'; btnText = '#222'; btnIcon = '<i class="bi bi-umbrella"></i>'; btnLabel = 'Annual Leave';
                    } else if (rec.status === 'Sick_Leave') {
                      statusColor = '#6c757d'; btnBg = '#6c757d'; btnText = '#fff'; btnIcon = '<i class="bi bi-emoji-dizzy"></i>'; btnLabel = 'Sick Leave';
                    } else if (rec.status === 'Unpaid_Leave') {
                      statusColor = '#212529'; btnBg = '#212529'; btnText = '#fff'; btnIcon = '<i class="bi bi-cash"></i>'; btnLabel = 'Unpaid Leave';
                    }
                    listHtml += `
                      <div style='display:flex;align-items:center;background:#fff;border-radius:12px;margin-bottom:12px;border-left:10px solid ${statusColor};padding:0 16px 0 0;'>
                        <div style='flex:1;min-width:0;padding:18px 0 18px 18px;'>
                          <div style='font-size:1.05rem;font-weight:600;color:#222;'>${rec.date || ''}</div>
                        </div>
                        <div style='flex-shrink:0;'>
                          <button type='button' class='attendance-record-detail-btn' data-record-idx='${idx}' style='background:${btnBg};color:${btnText};border:none;border-radius:10px;font-size:1rem;font-weight:600;padding:0 24px;height:38px;display:inline-flex;align-items:center;gap:8px;box-shadow:none;outline:none;min-width:110px;justify-content:center;'>
                            ${btnIcon} <span style="font-size:1rem;">${btnLabel}</span>
                          </button>
                        </div>
                      </div>
                    `;
                  });
                  listHtml += `</div>`;
                  document.getElementById('staffAttendanceRecordsTable').innerHTML = listHtml;

                  // Add event listeners for detail buttons
                  const detailBtns = document.querySelectorAll('.attendance-record-detail-btn');
                  detailBtns.forEach(btn => {
                    btn.addEventListener('click', function() {
                      const idx = this.getAttribute('data-record-idx');
                      if (records[idx]) showAttendanceRecordDetailModal(records[idx]);
                    });
                  });
                }
                
                // Show modal with attendance record details
                function showAttendanceRecordDetailModal(record) {
                  // Remove any existing modal
                  let oldModal = document.getElementById('attendanceRecordDetailModal');
                  if (oldModal) oldModal.remove();

                  // Badge for type of leave/status
                  let badgeHtml = '';
                  let badgeColor = '#adb5bd';
                  let badgeText = record.status || '';
                  let badgeIcon = '';
                  if (record.status === 'Present') {
                    badgeColor = '#198754'; badgeIcon = '<i class="bi bi-check-lg"></i>'; badgeText = 'Present';
                  } else if (record.status === 'Absent') {
                    badgeColor = '#dc3545'; badgeIcon = '<i class="bi bi-x-lg"></i>'; badgeText = 'Absent';
                  } else if (record.status === 'Check_in') {
                    badgeColor = '#0d6efd'; badgeIcon = '<i class="bi bi-record-circle"></i>'; badgeText = 'Check In';
                  } else if (record.status === 'Late') {
                    badgeColor = '#ffc107'; badgeIcon = '<i class="bi bi-clock-history"></i>'; badgeText = 'Late';
                  } else if (record.status === 'Annual_Leave') {
                    badgeColor = '#0dcaf0'; badgeIcon = '<i class="bi bi-umbrella"></i>'; badgeText = 'Annual Leave';
                  } else if (record.status === 'Sick_Leave') {
                    badgeColor = '#6c757d'; badgeIcon = '<i class="bi bi-emoji-dizzy"></i>'; badgeText = 'Sick Leave';
                  } else if (record.status === 'Unpaid_Leave') {
                    badgeColor = '#212529'; badgeIcon = '<i class="bi bi-cash"></i>'; badgeText = 'Unpaid Leave';
                  }
                  badgeHtml = `<span style="display:inline-flex;align-items:center;gap:6px;background:${badgeColor};color:#fff;font-weight:600;padding:4px 16px;border-radius:8px;font-size:1rem;"><span style='font-size:1.2em;'>${badgeIcon}</span> ${badgeText}</span>`;

                  // Build modal HTML
                  const modalHtml = `
                    <div class='modal fade' id='attendanceRecordDetailModal' tabindex='-1' aria-labelledby='attendanceRecordDetailModalLabel' aria-hidden='true'>
                      <div class='modal-dialog'>
                        <div class='modal-content' style='border-radius:12px;background:#f4f4f4;'>
                          <div class='modal-header' style='background:#ededed;border-bottom:none;'>
                            <h5 class='modal-title fw-semibold' id='attendanceRecordDetailModalLabel'>View Attendance Details</h5>
                            <button type='button' class='btn-close' data-bs-dismiss='modal' aria-label='Close'></button>
                          </div>
                          <div class='modal-body' style='padding:28px 24px 24px 24px;'>
                            <div class='container-fluid'>
                              <div class='row mb-3'>
                                <div class='col-6'><span style='font-weight:500;'>Type of leave:</span></div>
                                <div class='col-6'><span style='font-weight:500;'>Checked by:</span></div>
                              </div>
                              <div class='row align-items-center mb-3'>
                                <div class='col-6'>${badgeHtml}</div>
                                <div class='col-6'>${record.checkedin_by || ''}</div>
                              </div>
                              <div class='row mb-2'>
                                <div class='col-6'><span style='font-weight:500;'>Date:</span></div>
                                <div class='col-6'><span style='font-weight:500;'>Check in time:</span></div>
                              </div>
                              <div class='row'>
                                <div class='col-6'>${record.date || ''}</div>
                                <div class='col-6'>${record.check_in || ''}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  `;
                  document.body.insertAdjacentHTML('beforeend', modalHtml);
                  const modalElem = document.getElementById('attendanceRecordDetailModal');
                  var modal = new bootstrap.Modal(modalElem, { backdrop: 'static', keyboard: true });
                  setTimeout(() => {
                    modalElem.classList.add('show');
                    modalElem.style.display = 'block';
                    modalElem.style.opacity = '1';
                  }, 10);
                  modal.show();
                  modalElem.addEventListener('hidden.bs.modal', function () {
                    modalElem.classList.remove('show');
                    modalElem.style.opacity = '0';
                    setTimeout(() => {
                      if (modalElem) modalElem.remove();
                      document.querySelectorAll('.modal-backdrop').forEach(function(backdrop) {
                        backdrop.remove();
                      });
                      document.body.classList.remove('modal-open');
                      document.body.style.overflow = '';
                    }, 300);
                  });
                }
            } else {
                alert(result.message || 'Failed to load analytics');
            }
        } catch (err) {
            alert('Error fetching analytics: ' + err.message);
        }
    }

})();
