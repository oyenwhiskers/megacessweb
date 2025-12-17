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
                        ${currentSearch ? `
                            <button class="btn btn-outline-primary" onclick="window.fetchStaffAttendanceList('', 1, ${currentDateAttendanceId}, ${DEFAULT_PER_PAGE}, '${currentStatusFilter}')">
                                <i class="bi bi-x-circle me-1"></i>Clear Search
                            </button>
                        ` : ''}
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
                                            <button type="button" class="btn btn-primary" title="View Attendance" onclick="window.location.href='/megacessweb/pages/view-attendance-details.html?id=' + ${record.user_id} + '&type=staff'">
                                                <i class="bi bi-eye"></i>
                                            </button>
                                            <button type="button" class="btn btn-warning" 
                                                    onclick="window.location.href='/megacessweb/pages/view-overtime-details.html?id=${record.user_id}&type=staff'" 
                                                    title="Overtime">
                                                <i class="bi bi-clock"></i>
                                            </button>
                                            <button type="button" class="btn btn-info" 
                                                    onclick="window.location.href='/megacessweb/pages/view-leave-details.html?id=${record.user_id}&type=staff'" 
                                                    title="On-Leave">
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
        const paginationHtml = createStaffPaginationHtml(current_page, last_page, total, from, to, per_page);
        
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
        if (lastPage <= 1) return '';
        
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
                        
                        // Normalize status for comparison
                        const recordStatus = record.status.toLowerCase();
                        const filterStatus = statusFilter.toLowerCase();
                        
                        // Map status values for better matching
                        const statusMapping = {
                            'present': ['present'],
                            'absent': ['absent'],
                            'check_in': ['check_in', 'checked_in'],
                            'late': ['late'],
                            'annual_leave': ['annual_leave', 'annual leave'],
                            'sick_leave': ['sick_leave', 'sick leave'],
                            'unpaid_leave': ['unpaid_leave', 'unpaid leave']
                        };
                        
                        if (statusMapping[filterStatus]) {
                            return statusMapping[filterStatus].includes(recordStatus);
                        }
                        
                        return recordStatus === filterStatus;
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
                      recYearOptions += `<option value='${y}' ${y==currentYear?'selected':''}>${y}</option>`;
                    }
                    recYear.innerHTML = recYearOptions;
                    // Months
                    let recMonthOptions = '';
                    for (let i = 0; i < 12; i++) {
                      recMonthOptions += `<option value='${String(i+1).padStart(2,'0')}' ${(i+1)==parseInt(currentMonth)?'selected':''}>${months[i]}</option>`;
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
                      recStatusOptions += `<option value='${opt.value}' ${opt.value==currentStatus?'selected':''}>${opt.label}</option>`;
                    }
                    recStatus.innerHTML = recStatusOptions;
                  }
                  // Set dropdowns to current year/month on first open
                  if (yearSelect) yearSelect.value = currentYear;
                  if (monthSelect) monthSelect.value = String(currentMonth).padStart(2, '0');
                  if (recYear) recYear.value = currentYear;
                  if (recMonth) recMonth.value = String(currentMonth).padStart(2, '0');
                  if (recStatus) recStatus.value = currentStatus;
                  // Analytics filter: reload using analyticsYear/analyticsMonth
                  function reloadAnalytics() {
                    window.showStaffAttendanceAnalytics(userId, yearSelect.value, monthSelect.value, currentStatus);
                  }
                  // Records filter: only reload records, not analytics
                  function reloadRecordsOnly() {
                    fetchAndRenderAttendanceRecords();
                  }
                  if (yearSelect && monthSelect) {
                    yearSelect.addEventListener('change', reloadAnalytics);
                    monthSelect.addEventListener('change', reloadAnalytics);
                  }
                  if (recYear && recMonth && recStatus) {
                    recYear.addEventListener('change', reloadRecordsOnly);
                    recMonth.addEventListener('change', reloadRecordsOnly);
                    recStatus.addEventListener('change', reloadRecordsOnly);
                  }
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
                  if (recStatusVal && recStatusVal !== 'all') recordsUrl.searchParams.append('status', recStatusVal);
                  const recordsHeaders = {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                  };
                  try {
                    const recordsResponse = await fetch(recordsUrl, { method: 'GET', headers: recordsHeaders });
                    const recordsResult = await recordsResponse.json();
                    if (recordsResult.success && recordsResult.data && Array.isArray(recordsResult.data.data)) {
                      renderAttendanceRecordsTable(recordsResult.data);
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
                  for (const rec of records) {
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
                          <button type='button' style='background:${btnBg};color:${btnText};border:none;border-radius:10px;font-size:1rem;font-weight:600;padding:0 24px;height:38px;display:inline-flex;align-items:center;gap:8px;box-shadow:none;outline:none;min-width:110px;justify-content:center;'>
                            ${btnIcon} <span style="font-size:1rem;">${btnLabel}</span>
                          </button>
                        </div>
                      </div>
                    `;
                  }
                  listHtml += `</div>`;
                  document.getElementById('staffAttendanceRecordsTable').innerHTML = listHtml;
                }
                // Fetch records for a specific page
                async function fetchAndRenderAttendanceRecordsPage(page) {
                  const recordsUrl = new URL(`https://mwms.megacess.com/api/v1/user-attendance/${userId}/records`);
                  recordsUrl.searchParams.append('month', `${currentYear}-${String(currentMonth).padStart(2, '0')}`);
                  recordsUrl.searchParams.append('page', page);
                  const recordsHeaders = {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                  };
                  try {
                    const recordsResponse = await fetch(recordsUrl, { method: 'GET', headers: recordsHeaders });
                    const recordsResult = await recordsResponse.json();
                    if (recordsResult.success && recordsResult.data && Array.isArray(recordsResult.data.data)) {
                      renderAttendanceRecordsTable(recordsResult.data);
                    } else {
                      document.getElementById('staffAttendanceRecordsTable').innerHTML = `<div class='text-muted py-3'>No attendance records found for this month.</div>`;
                    }
                  } catch (err) {
                    document.getElementById('staffAttendanceRecordsTable').innerHTML = `<div class='text-danger py-3'>Error loading attendance records.</div>`;
                  }
                }
                // After modal is inserted, fetch and render records
                setTimeout(() => {
                  fetchAndRenderAttendanceRecords();
                  // ...existing code for dropdown listeners...
                }, 300);
            } else {
                alert(result.message || 'Failed to load analytics');
            }
        } catch (err) {
            alert('Error fetching analytics: ' + err.message);
        }
    }

})();
