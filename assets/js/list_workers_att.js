// Worker Attendance List Management
(function() {
    // Configuration
    const API_BASE_URL = 'https://mwms.megacess.com/api/v1';
    const DEFAULT_PER_PAGE = 10;
    let currentPage = 1;
    let currentSearch = '';
    let currentDateAttendanceId = 1;
    let currentStatusFilter = 'all';
    let currentRecordsData = []; // Store current records for easy access
    
    // Get the workers attendance view container
    const workersAttendanceView = document.getElementById('workersAttendanceView');
    
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

// Helper to build month string for API
function getMonthString(year, month) {
    if (!year || !month) return '';
    return `${year}-${month}`;
}

// Fetch leave records from API
async function fetchLeavesFromAPI(staffId, year, month, type) {
    const token = localStorage.getItem('auth_token') || 
                sessionStorage.getItem('auth_token') || 
                localStorage.getItem('authToken') || 
                sessionStorage.getItem('authToken');
    if (!token) return {leaves: [], leaveTypes: []};
    let url = `https://mwms.megacess.com/api/v1/staff-attendance/${staffId}/leaves?`;
    const params = [];
    if (year && month) {
        params.push(`month=${year}-${month}`);
    }
    if (type && type !== '') {
        params.push(`status=\"${type}\"`);
    }
    params.push('page=1');
    params.push('per_page=10');
    url += params.join('&');
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });
        if (!response.ok) return {leaves: [], leaveTypes: []};
        const data = await response.json();
        const leaves = (data && data.data && data.data.data) ? data.data.data : [];
        const leaveTypes = Array.from(new Set(leaves.map(l => l.status)));
        return {leaves, leaveTypes};
    } catch (err) {
        return {leaves: [], leaveTypes: []};
    }
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
            'Late': { class: 'bg-warning text-dark', text: 'Late' },
            'Annual_Leave': { class: 'bg-info', text: 'Annual Leave' },
            'Sick_Leave': { class: 'bg-secondary', text: 'Sick Leave' },
            'Unpaid_Leave': { class: 'bg-dark', text: 'Unpaid Leave' }
        };
        
        const statusInfo = statusMap[status] || { class: 'bg-secondary', text: status };
        return `<span class="badge ${statusInfo.class}">${statusInfo.text}</span>`;
    }
    
    // Highlight search terms in text
    function highlightSearchTerm(text, searchTerm) {
        if (!searchTerm || !searchTerm.trim() || !text) {
            return text;
        }
        
        const escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(${escapedTerm})`, 'gi');
        return text.replace(regex, '<mark class="bg-warning text-dark">$1</mark>');
    }
    
    // Show loading state
    function showLoading() {
        if (!workersAttendanceView) return;
        
        workersAttendanceView.innerHTML = `
            <div class="text-center py-4">
                <div class="spinner-border text-success" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-2">Loading worker attendance...</p>
            </div>
        `;
    }
    
    // Show error message
    function showError(message) {
        if (!workersAttendanceView) return;
        
        workersAttendanceView.innerHTML = `
            <div class="alert alert-danger" role="alert">
                <i class="bi bi-exclamation-triangle me-2"></i>
                <strong>Error:</strong> ${message}
                <button class="btn btn-outline-danger btn-sm ms-3" onclick="window.retryWorkerAttendanceList()">
                    <i class="bi bi-arrow-clockwise me-1"></i>Retry
                </button>
            </div>
        `;
    }
    
    // Show empty state
    function showEmpty(message) {
        if (!workersAttendanceView) return;
        
        const searchMessage = currentSearch ? 
            `No attendance records found matching "${currentSearch}".` : 
            'No attendance records found for the selected criteria.';
        
        const finalMessage = message || searchMessage;
        
        workersAttendanceView.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h5 class="mb-0">Worker Attendance Records</h5>
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
    function renderAttendanceRecords(data) {
        if (!workersAttendanceView) return;
        
        const { data: records, current_page, per_page, total, last_page, from, to } = data;
        
        if (!records || records.length === 0) {
            showEmpty();
            return;
        }

        // Store current records data for overtime modal
        currentRecordsData = records;
        
        const recordsHtml = records.map(record => {
            // Generate avatar placeholder from worker name
            const workerName = record.staff_name || 'Worker';
            const placeholderImage = `https://ui-avatars.com/api/?name=${encodeURIComponent(workerName)}&background=6c757d&color=fff&size=128&bold=true&rounded=true`;

            // Clean up the image URL to remove problematic suffixes
            let workerImage = '';
            if (record.staff_img && typeof record.staff_img === 'string') {
                workerImage = record.staff_img.replace(/:\d+$/, '').trim(); // Remove :1, :2, etc. suffixes
                workerImage = workerImage.replace(/\.jpg:.*$/, '.jpg'); // Clean up malformed jpg URLs
                workerImage = workerImage.replace(/\.png:.*$/, '.png');
                workerImage = workerImage.replace(/\.jpeg:.*$/, '.jpeg');
                workerImage = workerImage.replace(/\.gif:.*$/, '.gif');

                // Check if the cleaned URL is still valid
                if (workerImage.length < 5 || workerImage.includes('null') || workerImage.includes('undefined') || workerImage.includes('…')) {
                    workerImage = '';
                } else if (!workerImage.startsWith('http') && !workerImage.startsWith('/')) {
                    // Construct full URL if it's just a filename
                    workerImage = `https://mwms.megacess.com/storage/user-images/${workerImage}`;
                } else if (workerImage.startsWith('/')) {
                    // Add domain if it starts with /
                    workerImage = `https://mwms.megacess.com${workerImage}`;
                }
            }

            const imgSrc = (workerImage && workerImage.trim() !== '') ? workerImage : placeholderImage;

            return `
                <div class="list-group-item worker-attendance-item">
                    <div class="d-flex align-items-center">
                        <div style="width:50px;height:50px;flex:0 0 50px;">
                            <img src="${imgSrc}" 
                                 alt="${workerName}" 
                                 class="rounded-circle" 
                                 style="width:50px;height:50px;object-fit:cover" 
                                 onerror="if(this.src!=='${placeholderImage}'){this.src='${placeholderImage}';}">
                        </div>
                        <div class="flex-grow-1 ms-3">
                            <div class="d-flex justify-content-between align-items-center">
                                <div>
                                    <h6 class="mb-1 fw-semibold">${record.staff_name}</h6>
                                    <div class="d-flex align-items-start gap-3 text-muted small">
                                        <span>In: ${formatTime(record.check_in)} ${record.checkedin_by ? `<br>by: ${record.checkedin_by}` : ''}</span>
                                        <span>Out: ${formatTime(record.check_out)} ${record.checkedout_by ? `<br>by: ${record.checkedout_by}` : ''}</span>
                                    </div>
                                </div>
                                <div class="text-end">
                                    ${getStatusBadge(record.status)}
                                    <div class="mt-2">
                                        <div class="btn-group btn-group-sm" role="group">
                                            <button type="button" class="btn btn-outline-primary" 
                                                    onclick="viewAttendanceDetails(${record.staff_id})" 
                                                    title="View">
                                                <i class="bi bi-eye"></i>
                                            </button>
                                            <button type="button" class="btn btn-outline-warning" 
                                                    onclick="markOvertime(${record.staff_id})" 
                                                    title="Overtime">
                                                <i class="bi bi-clock"></i>
                                            </button>
                                            <button type="button" class="btn btn-outline-info" 
                                                    title="Leave" onclick="showWorkerNameAsImage(${record.staff_id})">
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
        const paginationHtml = createPaginationHtml(current_page, last_page, total, from, to, per_page);
        
        // Render the attendance list with pagination
        workersAttendanceView.innerHTML = `
            <div class="card">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <h5 class="mb-0">Worker Attendance Records</h5>
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
    
    // Display worker leave details - Navigate to dedicated leave page
    window.showWorkerNameAsImage = function(staffId) {
        const staffData = getCurrentStaffData(staffId);
        const workerName = staffData && staffData.staff_name ? staffData.staff_name : 'Worker';
        const workerRole = staffData && staffData.staff_role ? staffData.staff_role : 'Worker';
        const workerImage = staffData && staffData.staff_img ? staffData.staff_img : '';
        
        // Navigate to leave details page with user data
        const params = new URLSearchParams({
            userId: staffId,
            userName: workerName,
            userRole: workerRole,
            userType: 'worker',
            userImage: workerImage
        });
        window.location.href = `/megacessweb/pages/manage-leave-details.html?${params.toString()}`;
    };
    
    // Create pagination HTML (matching salary management style)
    function createPaginationHtml(currentPage, lastPage, total, from, to, perPage) {
        // Ensure currentPage and lastPage are numbers
        currentPage = parseInt(currentPage) || 1;
        lastPage = parseInt(lastPage) || Math.ceil(total / perPage) || 1;
        
        // Don't show pagination if only 1 page
        if (lastPage <= 1) return '';
        
        let paginationItems = '';
        
        // Previous button with chevron icon
        paginationItems += `
            <button class="btn btn-sm btn-outline-success mx-1" ${currentPage <= 1 ? 'disabled' : ''} 
                    onclick="window.retryWorkerAttendanceList(${currentPage - 1})">
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
                            onclick="window.retryWorkerAttendanceList(${page})">
                        ${page}
                    </button>
                `;
            }
        });
        
        // Next button with chevron icon
        paginationItems += `
            <button class="btn btn-sm btn-outline-success mx-1" ${currentPage >= lastPage ? 'disabled' : ''} 
                    onclick="window.retryWorkerAttendanceList(${currentPage + 1})">
                <i class="bi bi-chevron-right"></i>
            </button>
        `;
        
        return `
            <div class="mt-3 text-center">
                ${paginationItems}
            </div>
        `;
    }
    
    // Check if date has an attendance ID
    async function checkDateAttendanceId(dateString) {
        try {
            const token = getAuthToken();
            if (!token) return null;
            
            // Use GET method as per API documentation
            const url = new URL(`${API_BASE_URL}/attendance/check`);
            url.searchParams.append('date', dateString);
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                console.error(`Attendance check failed: ${response.status} ${response.statusText}`);
                return null;
            }
            
            const result = await response.json();
            
            // Backend returns success: true with data: null when attendance ID doesn't exist
            if (result.success && result.data && result.data.id) {
                return result.data.id;
            }
            
            // If data is null, it means no attendance ID exists for this date
            return null;
        } catch (error) {
            console.error('Error checking date attendance ID:', error);
            return null;
        }
    }
    
    // Main fetch function
    async function fetchWorkerAttendanceList(search = '', page = 1, dateAttendanceId = 1, perPage = DEFAULT_PER_PAGE, statusFilter = 'all') {
        if (!workersAttendanceView) {
            return;
        }
        
        currentSearch = search;
        currentPage = page;
        currentDateAttendanceId = dateAttendanceId;
        currentStatusFilter = statusFilter;
        
        showLoading();
        
        // Check if we should verify the date first
        const dateInput = document.getElementById('attendanceDate');
        if (dateInput && dateInput.value && dateAttendanceId === 1) {
            // Check if the selected date has an attendance ID
            const checkedId = await checkDateAttendanceId(dateInput.value);
            
            if (checkedId === null) {
                // No attendance ID exists for this date
                showNoAttendanceMessage(dateInput.value);
                return;
            }
            
            // Use the checked ID
            currentDateAttendanceId = checkedId;
            dateAttendanceId = checkedId;
        }
        
        try {
            // Try using staff-attendance endpoint for workers
            const url = new URL(`${API_BASE_URL}/staff-attendance`);
            
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
                let filteredData = result.data;
                
                // Apply client-side search filtering if search term provided
                if (search && search.trim() && filteredData.data && Array.isArray(filteredData.data)) {
                    const searchTerm = search.trim().toLowerCase();
                    const allRecords = filteredData.data;
                    
                    filteredData.data = allRecords.filter(record => {
                        return record.staff_name && record.staff_name.toLowerCase().includes(searchTerm);
                    });
                    
                    // Update pagination for filtered results
                    const recordCount = filteredData.data.length;
                    filteredData.total = recordCount;
                    filteredData.last_page = Math.ceil(recordCount / perPage);
                    filteredData.from = recordCount > 0 ? 1 : 0;
                    filteredData.to = Math.min(recordCount, perPage);
                }
                
                renderAttendanceRecords(filteredData);
            } else {
                showError(result.message || 'Failed to load attendance records');
            }
            
        } catch (error) {
            showError(error.message || 'Failed to connect to the server. Please try again.');
        }
    }
    
    // Show no attendance message
    function showNoAttendanceMessage(dateFilter) {
        if (!workersAttendanceView) return;
        
        let dateText = 'this date';
        if (dateFilter) {
            if (dateFilter.length === 10) {
                // Full date format YYYY-MM-DD
                const date = new Date(dateFilter);
                dateText = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
            } else if (dateFilter.length === 7) {
                // Month format YYYY-MM
                const [year, month] = dateFilter.split('-');
                const date = new Date(year, parseInt(month) - 1);
                dateText = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
            }
        }
        
        workersAttendanceView.innerHTML = `
            <div class="text-center py-5">
                <div class="mb-4">
                    <i class="bi bi-calendar-x" style="font-size: 4rem; color: #dee2e6;"></i>
                </div>
                <h5 class="text-muted mb-3">No Attendance Records</h5>
                <p class="text-muted mb-0">There are no attendance records taken for <strong>${dateText}</strong>.</p>
                <p class="text-muted small mt-2">Try selecting a different date or month to view attendance records.</p>
            </div>
        `;
    }
    
    // Helper function to convert date to date_attendance_id (deprecated but kept for compatibility)
    function getDateAttendanceId(dateString) {
        if (!dateString) return 1;
        return 1;
    }
    
    // View attendance details - Navigate to dedicated page
    window.viewAttendanceDetails = function(staffId) {
        // Find the record data for this staff member
        const staffData = getCurrentStaffData(staffId);
        
        if (staffData) {
            // Clean up the image URL
            let cleanImageUrl = '';
            if (staffData.staff_img && typeof staffData.staff_img === 'string') {
                cleanImageUrl = staffData.staff_img.replace(/:\d+$/, '').trim();
                if (cleanImageUrl.length < 5 || cleanImageUrl.includes('null') || cleanImageUrl.includes('undefined')) {
                    cleanImageUrl = '';
                }
            }
            
            // Navigate to attendance details page with user data
            const params = new URLSearchParams({
                userId: staffId,
                userName: staffData.staff_name || 'Worker',
                userRole: staffData.staff_role || 'Worker',
                userImage: cleanImageUrl,
                userType: 'worker'
            });
            window.location.href = `/megacessweb/pages/view-attendance-details.html?${params.toString()}`;
        } else {
            // Fallback if data not found
            const params = new URLSearchParams({
                userId: staffId,
                userName: 'Worker',
                userRole: 'Worker',
                userImage: '',
                userType: 'worker'
            });
            window.location.href = `/megacessweb/pages/view-attendance-details.html?${params.toString()}`;
        }
    };
    
    window.markOvertime = function(staffId) {
        // Find the record data for this staff member
        const staffData = getCurrentStaffData(staffId);
        
        if (staffData) {
            // Clean up the image URL to remove any problematic suffixes
            let cleanImageUrl = '';
            if (staffData.staff_img && typeof staffData.staff_img === 'string') {
                cleanImageUrl = staffData.staff_img.replace(/:\d+$/, '').trim(); // Remove :1, :2, etc. suffixes
                // Check if the cleaned URL is still valid
                if (cleanImageUrl.length < 5 || cleanImageUrl.includes('null') || cleanImageUrl.includes('undefined')) {
                    cleanImageUrl = '';
                }
            }
            
            // Navigate to overtime details page with user data
            const params = new URLSearchParams({
                userId: staffId,
                userName: staffData.staff_name || 'Worker',
                userRole: staffData.staff_role || 'Worker',
                userImage: cleanImageUrl,
                userType: 'worker'
            });
            window.location.href = `/megacessweb/pages/manage-overtime-details.html?${params.toString()}`;
        } else {
            // Fallback if data not found
            const params = new URLSearchParams({
                userId: staffId,
                userName: 'Worker',
                userRole: 'Worker',
                userImage: '',
                userType: 'worker'
            });
            window.location.href = `/megacessweb/pages/manage-overtime-details.html?${params.toString()}`;
        }
    };

    // Helper function to get current staff data
    function getCurrentStaffData(staffId) {
        // Find the record in the current data
        return currentRecordsData.find(record => record.staff_id == staffId) || null;
    }
    
    // Helper function to get current worker data (alias for getCurrentStaffData)
    function getCurrentWorkerData(staffId) {
        // Find the record in the current data
        const worker = currentRecordsData.find(record => record.staff_id == staffId);
        return worker || null;
    }
    
    // Retry function that preserves current filter state
    window.retryWorkerAttendanceList = function(page = null) {
        const pageToUse = page !== null ? page : currentPage;
        fetchWorkerAttendanceList(currentSearch, pageToUse, currentDateAttendanceId, DEFAULT_PER_PAGE, currentStatusFilter);
    };
    
    // Expose functions globally FIRST before initialization
    window.fetchWorkerAttendanceList = fetchWorkerAttendanceList;
    
    // Fetch attendance by date (checks date attendance ID first)
    window.fetchWorkerAttendanceByDate = async function(dateString, search = '', statusFilter = 'all') {
        if (!dateString) {
            showError('Please select a date');
            return;
        }
        
        showLoading();
        
        // Check if the date has an attendance ID
        const attendanceId = await checkDateAttendanceId(dateString);
        
        if (attendanceId === null) {
            // No attendance ID exists for this date - show appropriate message
            showNoAttendanceMessage(dateString);
            return;
        }
        
        // Fetch attendance using the found ID
        await fetchWorkerAttendanceList(search, 1, attendanceId, DEFAULT_PER_PAGE, statusFilter);
    };
    
    // Initialize on page load if we're on the right page - BUT DON'T auto-fetch
    // Let the HTML manage-attendance.html script control the initial load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            // Just make sure the view exists, but don't fetch automatically
            // The manage-attendance.html script will call fetchWorkerAttendanceByDate
        });
    }
    
})();