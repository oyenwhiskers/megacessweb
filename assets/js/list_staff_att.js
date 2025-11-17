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
                                                    onclick="viewStaffAttendanceDetails(${record.user_id})" 
                                                    title="View">
                                                <i class="bi bi-eye"></i>
                                            </button>
                                            <button type="button" class="btn btn-outline-warning" 
                                                    onclick="markStaffOvertime(${record.user_id})" 
                                                    title="Overtime">
                                                <i class="bi bi-clock"></i>
                                            </button>
                                            <button type="button" class="btn btn-outline-info" 
                                                    onclick="markStaffOnLeave(${record.user_id})" 
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
    
    // Global functions for staff attendance actions
    window.viewStaffAttendanceDetails = function(userId) {
        console.log('View staff attendance details for user ID:', userId);
        // Implement attendance details modal/page
        alert('View staff attendance details feature will be implemented');
    };
    
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
    
    window.markStaffOnLeave = function(userId) {
        console.log('markStaffOnLeave function called for user ID:', userId);
        
        // Check if showLeaveModal function exists
        if (typeof window.showLeaveModal !== 'function') {
            console.error('showLeaveModal function not found');
            alert('Leave management modal not available. Please refresh the page.');
            return;
        }
        
        // Get the staff data from current records
        const staffData = getCurrentStaffData(userId);
        if (!staffData) {
            console.error('Staff data not found for ID:', userId);
            alert('Staff information not found. Please refresh the attendance list.');
            return;
        }
        
        console.log('Staff data found:', staffData);
        
        // Extract staff information using correct property names
        const staffId = staffData.user_id;
        const staffName = staffData.user_name || 'Unknown Staff';
        const staffRole = staffData.position || 'Staff';
        const staffImage = staffData.user_img || '';
        const staffType = 'staff';
        
        console.log('Calling showLeaveModal with:', { staffId, staffName, staffRole, staffImage, staffType });
        
        // Call the leave modal function
        window.showLeaveModal(staffId, staffName, staffRole, staffImage, staffType);
    };
    
    // Expose main function globally so it can be called from manage-attendance.html
    window.fetchStaffAttendanceList = fetchStaffAttendanceList;
    
})();
