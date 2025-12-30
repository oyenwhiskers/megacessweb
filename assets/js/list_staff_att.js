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
                            <div class="d-flex justify-content-between align-items-center">
                                <div>
                                    <h6 class="mb-1 fw-semibold">${record.user_name}</h6>
                                    <div class="d-flex align-items-start gap-3 text-muted small">
                                        <span>In: ${formatTime(record.check_in)} ${record.checkedin_by ? `<br>by: ${record.checkedin_by}` : ''}</span>
                                        <span>Out: ${formatTime(record.check_out)} ${record.checkedout_by ? `<br>by: ${record.checkedout_by}` : ''}</span>
                                    </div>
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
            </div>
            ${paginationHtml}
        `;
    }
    
    // Create pagination HTML (matching salary management style)
    function createStaffPaginationHtml(currentPage, lastPage, total, from, to, perPage) {
        // Ensure currentPage and lastPage are numbers
        currentPage = parseInt(currentPage) || 1;
        lastPage = parseInt(lastPage) || Math.ceil(total / perPage) || 1;
        
        // Don't show pagination if only 1 page
        if (lastPage <= 1) return '';
        
        let paginationItems = '';
        
        // Previous button with chevron icon
        paginationItems += `
            <button class="btn btn-sm btn-outline-success mx-1" ${currentPage <= 1 ? 'disabled' : ''} 
                    onclick="window.fetchStaffAttendanceList('${currentSearch}', ${currentPage - 1}, ${currentDateAttendanceId}, ${DEFAULT_PER_PAGE}, '${currentStatusFilter}')">
                <i class="bi bi-chevron-left"></i>
            </button>
        `;
        
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
                paginationItems += `<span class="btn btn-sm btn-outline-success mx-1 disabled">...</span>`;
            } else {
                // Page button - ensure type match for comparison
                const btnClass = parseInt(page) === parseInt(currentPage) ? 'btn-success' : 'btn-outline-success';
                paginationItems += `
                    <button class="btn btn-sm ${btnClass} mx-1" 
                            onclick="window.fetchStaffAttendanceList('${currentSearch}', ${page}, ${currentDateAttendanceId}, ${DEFAULT_PER_PAGE}, '${currentStatusFilter}')">
                        ${page}
                    </button>
                `;
            }
        });
        
        // Next button with chevron icon
        paginationItems += `
            <button class="btn btn-sm btn-outline-success mx-1" ${currentPage >= lastPage ? 'disabled' : ''} 
                    onclick="window.fetchStaffAttendanceList('${currentSearch}', ${currentPage + 1}, ${currentDateAttendanceId}, ${DEFAULT_PER_PAGE}, '${currentStatusFilter}')">
                <i class="bi bi-chevron-right"></i>
            </button>
        `;
        
        return `
            <div class="mt-3 text-center">
                ${paginationItems}
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
            
            const response = await fetch(url, {
                method: 'GET',
                headers
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            if (result.success && result.data) {
                // Apply client-side filtering as fallback if API doesn't filter properly
                let filteredData = result.data;
                let clientSideFilterApplied = false;
                
                // If we have a search term but got all records, filter client-side
                if (search && search.trim() && filteredData.data && Array.isArray(filteredData.data)) {
                    const searchTerm = search.trim().toLowerCase();
                    
                    filteredData.data = filteredData.data.filter(record => {
                        return record.user_name && record.user_name.toLowerCase().includes(searchTerm);
                    });
                    clientSideFilterApplied = true;
                }
                
                // Apply client-side status filtering as fallback
                if (statusFilter && statusFilter !== 'all' && filteredData.data && Array.isArray(filteredData.data)) {
                    filteredData.data = filteredData.data.filter(record => {
                        if (!record.status) return false;
                        // Case-insensitive substring match
                        return record.status.toLowerCase().includes(statusFilter.toLowerCase());
                    });
                    clientSideFilterApplied = true;
                }
                
                // Only update pagination if we applied client-side filtering
                // Otherwise, use the API's pagination values directly
                if (clientSideFilterApplied && filteredData.data && Array.isArray(filteredData.data)) {
                    const recordCount = filteredData.data.length;
                    const perPageValue = filteredData.per_page || perPage || DEFAULT_PER_PAGE;
                    
                    // Calculate pagination values
                    filteredData.total = recordCount;
                    filteredData.last_page = Math.ceil(recordCount / perPageValue);
                    filteredData.current_page = page;
                    filteredData.per_page = perPageValue;
                    
                    // Calculate from and to based on current page
                    filteredData.from = recordCount > 0 ? ((page - 1) * perPageValue) + 1 : 0;
                    filteredData.to = Math.min(page * perPageValue, recordCount);
                    
                    // Slice the data to show only current page records
                    const startIndex = (page - 1) * perPageValue;
                    const endIndex = startIndex + perPageValue;
                    filteredData.data = filteredData.data.slice(startIndex, endIndex);
                }
                
                renderStaffAttendanceRecords(filteredData);
            } else {
                showError(result.message || 'Failed to load staff attendance records');
            }
            
        } catch (error) {
            showError(error.message || 'Failed to connect to the server. Please try again.');
        }
    }
    
    window.markStaffOvertime = function(userId) {
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
            
            // Navigate to overtime details page with user data
            const params = new URLSearchParams({
                userId: userId,
                userName: staffData.user_name || 'Staff Member',
                userRole: 'Staff',
                userImage: cleanImageUrl,
                userType: 'staff'
            });
            window.location.href = `/megacessweb/pages/manage-overtime-details.html?${params.toString()}`;
        } else {
            // Fallback if data not found
            const params = new URLSearchParams({
                userId: userId,
                userName: 'Staff Member',
                userRole: 'Staff',
                userImage: '',
                userType: 'staff'
            });
            window.location.href = `/megacessweb/pages/manage-overtime-details.html?${params.toString()}`;
        }
    };

    // Helper function to get current staff data
    function getCurrentStaffData(userId) {
        // Find the record in the current data
        const staff = currentRecordsData.find(record => record.user_id == userId);
        return staff || null;
    }
    
    // Expose main function globally so it can be called from manage-attendance.html
    window.fetchStaffAttendanceList = fetchStaffAttendanceList;
    
    // Ensure showStaffAttendanceAnalytics is globally available
    window.showStaffAttendanceAnalytics = showStaffAttendanceAnalytics;

    // Show Staff Leave Details - Navigate to dedicated leave page
    window.showStaffLeaveModal = function(userId) {
        const staffData = getCurrentStaffData(userId);
        const staffName = staffData && staffData.user_name ? staffData.user_name : 'Staff Member';
        const staffImage = staffData && staffData.user_img ? staffData.user_img : '';
        
        // Navigate to leave details page with user data
        const params = new URLSearchParams({
            userId: userId,
            userName: staffName,
            userType: 'staff',
            userImage: staffImage
        });
        window.location.href = `/megacessweb/pages/manage-leave-details.html?${params.toString()}`;
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

    // View staff attendance details - Navigate to dedicated page
    function showStaffAttendanceAnalytics(userId, year, month, status) {
        // Find the record data for this staff member
        const staffData = getCurrentStaffData(userId);
        
        if (staffData) {
            // Clean up the image URL
            let cleanImageUrl = '';
            if (staffData.user_img && typeof staffData.user_img === 'string') {
                cleanImageUrl = staffData.user_img.replace(/:\d+$/, '').trim();
                if (cleanImageUrl.length < 5 || cleanImageUrl.includes('null') || cleanImageUrl.includes('undefined')) {
                    cleanImageUrl = '';
                }
            }
            
            // Navigate to attendance details page with user data
            const params = new URLSearchParams({
                userId: userId,
                userName: staffData.user_name || 'Staff Member',
                userRole: 'Staff',
                userImage: cleanImageUrl,
                userType: 'staff'
            });
            window.location.href = `/megacessweb/pages/view-attendance-details.html?${params.toString()}`;
        } else {
            // Fallback if data not found
            const params = new URLSearchParams({
                userId: userId,
                userName: 'Staff Member',
                userRole: 'Staff',
                userImage: '',
                userType: 'staff'
            });
            window.location.href = `/megacessweb/pages/view-attendance-details.html?${params.toString()}`;
        }
    }

})();
