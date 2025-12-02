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
                <div class="spinner-border text-primary" role="status">
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
                                            <button type="button" class="btn btn-outline-primary" 
                                                    title="View Attendance" data-view-user-id="${record.user_id}">
                                                <i class="bi bi-eye"></i>
                                            </button>
                                            <button type="button" class="btn btn-outline-warning" 
                                                    onclick="markStaffOvertime(${record.user_id})" 
                                                    title="Overtime">
                                                <i class="bi bi-clock"></i>
                                            </button>
                                            <button type="button" class="btn btn-outline-info" 
                                                    title="On-Leave" disabled>
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

    // Helper to show analytics modal
    function showStaffAnalyticsModal(data) {
        const staffData = getCurrentStaffData(data.user_id);
        let avatar = '';
        if (staffData && staffData.user_img) {
            let img = staffData.user_img.trim();
            if (img.startsWith('http')) {
                avatar = img;
            } else if (img.startsWith('/')) {
                avatar = `https://mwms.megacess.com${img}`;
            } else if (img.length > 4) {
                avatar = `https://mwms.megacess.com/storage/user-images/${img}`;
            } else {
                avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(staffData.user_name)}&background=0d6efd&color=fff&size=128&bold=true&rounded=true`;
            }
        } else {
            avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(staffData ? staffData.user_name : 'Staff')}&background=0d6efd&color=fff&size=128&bold=true&rounded=true`;
        }
        const staffName = staffData ? staffData.user_name : 'Staff';
        const userId = data.user_id; // <-- Fix: get userId from data
        const currentYear = (data.month || '').split('-')[0] || new Date().getFullYear();
        const currentMonth = (data.month || '').split('-')[1] || (new Date().getMonth()+1).toString().padStart(2, '0');
        const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
        const years = [];
        const thisYear = new Date().getFullYear();
        for (let y = thisYear - 5; y <= thisYear + 1; y++) years.push(y);
        // Attendance records (dummy for now, replace with API if available)
        let attendanceList = '';
        if (data.attendance_days && Array.isArray(data.attendance_days)) {
            attendanceList = data.attendance_days.map(day => {
                let badgeClass = '';
                let badgeText = '';
                switch(day.status) {
                    case 'Present': badgeClass = 'bg-success'; badgeText = 'Present'; break;
                    case 'Absent': badgeClass = 'bg-danger'; badgeText = 'Absent'; break;
                    case 'Sick Leave': badgeClass = 'bg-info'; badgeText = 'Sick Leave'; break;
                    case 'Unpaid Leave': badgeClass = 'bg-secondary'; badgeText = 'Unpaid Leave'; break;
                    case 'Annual Leave': badgeClass = 'bg-primary'; badgeText = 'Annual Leave'; break;
                    case 'Late': badgeClass = 'bg-warning text-dark'; badgeText = 'Late'; break;
                    default: badgeClass = 'bg-secondary'; badgeText = day.status;
                }
                return `<div style='display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;background:#fff;border-radius:6px;padding:8px 12px;'>
                    <span>${day.date}</span>
                    <span class='badge ${badgeClass}' style='font-size:1rem;'>${badgeText}</span>
                </div>`;
            }).join('');
        } else {
            attendanceList = '<div class="text-center text-muted">No daily records available.</div>';
        }
        // Modal HTML
        const modalHtml = `
        <div id='staffAnalyticsModal' class='modal' style='display:block;position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.5);z-index:9999;'>
          <div style='background:#e6fae6;width:800px;height:auto;margin:40px auto 0 auto;position:relative;border-radius:24px;box-shadow:0 4px 32px rgba(0,0,0,0.15);display:flex;flex-direction:column;'>
            <div style='padding:32px 32px 0 32px;'>
              <div style='font-size:1.4rem;font-weight:700;margin-bottom:18px;color:#226622;'>Manage Attendance &gt; View Attendance</div>
              <button onclick="document.getElementById('staffAnalyticsModal').remove()" style='position:absolute;top:24px;right:24px;background:none;border:none;font-size:1.5rem;color:#333;cursor:pointer;'>&times;</button>
              <div style='background:#fff;border-radius:16px;padding:18px 24px;display:flex;align-items:center;gap:18px;margin-bottom:18px;'>
                <img src='${avatar}' alt='${staffName}' style='width:48px;height:48px;border-radius:50%;object-fit:cover;background:#fff;border:2px solid #b2f5b2;'>
                <div style='font-size:1.1rem;font-weight:600;'>${staffName}</div>
              </div>
              <div style='display:flex;gap:12px;margin-bottom:18px;'>
                <select id='analyticsYear' style='padding:6px 12px;border-radius:6px;border:1px solid #ccc;font-size:1rem;width:100px;'>
                  ${years.map(y => `<option value='${y}' ${y==currentYear?'selected':''}>${y}</option>`).join('')}
                </select>
                <select id='analyticsMonth' style='padding:6px 12px;border-radius:6px;border:1px solid #ccc;font-size:1rem;width:140px;'>
                  ${months.map((m,i) => `<option value='${(i+1).toString().padStart(2,'0')}' ${parseInt(currentMonth)==(i+1)?'selected':''}>${m}</option>`).join('')}
                </select>
              </div>
              <div style='display:flex;gap:32px;margin-bottom:0;'>
                <div style='flex:1;background:#fff;border-radius:10px;padding:24px 0;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,0.04);'>
                  <div style='font-size:1.1rem;color:#888;margin-bottom:8px;'>Attendance Rate</div>
                  <div style='font-size:2rem;font-weight:700;color:#2e7d32;'>${data.attendance_rate || 0}%</div>
                </div>
                <div style='flex:1;background:#fff;border-radius:10px;padding:24px 0;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,0.04);'>
                  <div style='font-size:1.1rem;color:#888;margin-bottom:8px;'>Punctuality Rate</div>
                  <div style='font-size:2rem;font-weight:700;color:#2e7d32;'>${data.punctuality_rate || 0}%</div>
                </div>
                <div style='flex:1;background:#fff;border-radius:10px;padding:24px 0;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,0.04);'>
                  <div style='font-size:1.1rem;color:#888;margin-bottom:8px;'>Number of days absence</div>
                  <div style='font-size:2rem;font-weight:700;color:#2e7d32;'>${data.number_absent || 0}</div>
                </div>
              </div>
              <!-- Static display below analytics -->
              <div style='margin-top:32px;'>
                <div style='display:flex;gap:12px;margin-bottom:18px;'>
                  <button style='padding:8px 18px;border-radius:8px;border:none;background:#fff;font-weight:600;font-size:1rem;box-shadow:0 1px 4px rgba(0,0,0,0.04);color:#222;'>All</button>
                  <select style='padding:8px 18px;border-radius:8px;border:none;background:#fff;font-weight:500;font-size:1rem;box-shadow:0 1px 4px rgba(0,0,0,0.04);color:#222;'>
                    <option>Month</option>
                  </select>
                  <select style='padding:8px 18px;border-radius:8px;border:none;background:#fff;font-weight:500;font-size:1rem;box-shadow:0 1px 4px rgba(0,0,0,0.04);color:#222;'>
                    <option>Status</option>
                  </select>
                </div>
                <div style='display:flex;flex-direction:column;gap:12px;'>
                  <div style='display:flex;align-items:center;justify-content:space-between;background:#fff;border-radius:10px;padding:12px 24px;'>
                    <span style='font-size:1.1rem;'>19/10/25</span>
                    <span style='background:#e2cfc7;color:#7c5e57;font-weight:600;padding:6px 18px;border-radius:8px;display:flex;align-items:center;gap:6px;font-size:1rem;'><i class='bi bi-calendar2-x' style='font-size:1.1rem;'></i> Unpaid Leave</span>
                  </div>
                  <div style='display:flex;align-items:center;justify-content:space-between;background:#fff;border-radius:10px;padding:12px 24px;'>
                    <span style='font-size:1.1rem;'>20/10/25</span>
                    <span style='background:#2e7d32;color:#fff;font-weight:600;padding:6px 18px;border-radius:8px;display:flex;align-items:center;gap:6px;font-size:1rem;'><i class='bi bi-check-circle' style='font-size:1.1rem;'></i> Present</span>
                  </div>
                  <div style='display:flex;align-items:center;justify-content:space-between;background:#fff;border-radius:10px;padding:12px 24px;'>
                    <span style='font-size:1.1rem;'>21/10/25</span>
                    <span style='background:#1da1f2;color:#fff;font-weight:600;padding:6px 18px;border-radius:8px;display:flex;align-items:center;gap:6px;font-size:1rem;'><i class='bi bi-thermometer-half' style='font-size:1.1rem;'></i> Sick Leave</span>
                  </div>
                  <div style='display:flex;align-items:center;justify-content:space-between;background:#fff;border-radius:10px;padding:12px 24px;'>
                    <span style='font-size:1.1rem;'>22/10/25</span>
                    <span style='background:#e53935;color:#fff;font-weight:600;padding:6px 18px;border-radius:8px;display:flex;align-items:center;gap:6px;font-size:1rem;'><i class='bi bi-x-circle' style='font-size:1.1rem;'></i> Absent</span>
                  </div>
                  <div style='display:flex;align-items:center;justify-content:space-between;background:#fff;border-radius:10px;padding:12px 24px;'>
                    <span style='font-size:1.1rem;'>23/10/25</span>
                    <span style='background:#bfa46f;color:#fff;font-weight:600;padding:6px 18px;border-radius:8px;display:flex;align-items:center;gap:6px;font-size:1rem;'><i class='bi bi-clock-history' style='font-size:1.1rem;'></i> Late</span>
                  </div>
                  <div style='display:flex;align-items:center;justify-content:space-between;background:#fff;border-radius:10px;padding:12px 24px;'>
                    <span style='font-size:1.1rem;'>24/10/25</span>
                    <span style='background:#1a4d7a;color:#fff;font-weight:600;padding:6px 18px;border-radius:8px;display:flex;align-items:center;gap:6px;font-size:1rem;'><i class='bi bi-calendar2-week' style='font-size:1.1rem;'></i> Annual Leave</span>
                  </div>
                </div>
              </div>
              <!-- End static display -->
            </div>
          </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // Year/month dropdown listeners
        const yearSelect = document.getElementById('analyticsYear');
        const monthSelect = document.getElementById('analyticsMonth');
        if (yearSelect && monthSelect) {
            yearSelect.addEventListener('change', function() {
                const selectedYear = this.value;
                const selectedMonth = monthSelect.value;
                updateStaffAnalytics(userId, selectedYear, selectedMonth); // <-- use userId from above
            });
            monthSelect.addEventListener('change', function() {
                const selectedYear = yearSelect.value;
                const selectedMonth = this.value;
                updateStaffAnalytics(userId, selectedYear, selectedMonth); // <-- use userId from above
            });
        }
        
        // Add custom dropdown arrow styling
        const dropdownStyle = `
          <style id='staffAnalyticsModalDropdownStyle'>
            #staffAnalyticsModal select {
              appearance: none;
              -webkit-appearance: none;
              -moz-appearance: none;
              background: #fff url("data:image/svg+xml,%3Csvg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M4 6L8 10L12 6' stroke='%23333' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") no-repeat right 12px center/18px 18px;
              padding-right: 36px !important;
              border: 1px solid #ccc;
            }
            #staffAnalyticsModal select:focus {
              border-color: #2e7d32;
              outline: none;
            }
          </style>
        `;
        if (!document.getElementById('staffAnalyticsModalDropdownStyle')) {
          document.head.insertAdjacentHTML('beforeend', dropdownStyle);
        }
    }

    // Update staff analytics data
    async function updateStaffAnalytics(userId, year, month) {
        const token = getAuthToken();
        if (!token) return;
        // Ensure month is always two digits
        const monthInt = parseInt(month, 10);
        const monthStr = monthInt < 10 ? '0' + monthInt : '' + monthInt;
        const apiMonth = `${year}-${monthStr}`;
        const url = new URL(`https://mwms.megacess.com/api/v1/user-attendance/${userId}/analytics`);
        url.searchParams.append('month', apiMonth);
        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
        try {
            const response = await fetch(url, { method: 'GET', headers });
            const result = await response.json();
            if (result.success && result.data) {
                document.getElementById('staffAnalyticsModal').remove();
                showStaffAnalyticsModal(result.data);
            } else {
                alert(result.message || 'Failed to load analytics');
            }
        } catch (err) {
            alert('Error fetching analytics: ' + err.message);
        }
    }

})();
