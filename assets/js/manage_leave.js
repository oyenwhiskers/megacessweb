// Leave Management for Workers and Staff
(function() {
    // Configuration
    const API_BASE_URL = 'https://mwms.megacess.com/api/v1';
    
    // Token management
    function getAuthToken() {
        const token = localStorage.getItem('auth_token') || 
                     sessionStorage.getItem('auth_token') || 
                     localStorage.getItem('authToken') ||
                     sessionStorage.getItem('authToken');
        
        if (!token) {
            console.error('No authentication token found. Please log in.');
            return null;
        }
        
        return token;
    }
    
    // Format date for display (DD/MM/YY)
    function formatDateShort(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear().toString().slice(-2);
        return `${day}/${month}/${year}`;
    }
    
    // Get leave type badge HTML
    function getLeaveTypeBadge(status) {
        const leaveTypes = {
            'annual_leave': {
                color: '#0d6efd',
                bgClass: 'bg-primary',
                icon: 'bi-calendar-check',
                text: 'Annual Leave'
            },
            'sick_leave': {
                color: '#20c997',
                bgClass: 'bg-info',
                icon: 'bi-thermometer-half',
                text: 'Sick Leave'
            },
            'unpaid_leave': {
                color: '#dc3545',
                bgClass: 'bg-danger',
                icon: 'bi-calendar-x',
                text: 'Unpaid Leave'
            }
        };
        
        const leaveType = leaveTypes[status] || {
            color: '#6c757d',
            bgClass: 'bg-secondary',
            icon: 'bi-calendar',
            text: status
        };
        
        return {
            borderColor: leaveType.color,
            badge: `<span class="badge ${leaveType.bgClass} px-3 py-2">
                <i class="${leaveType.icon} me-1"></i>${leaveType.text}
            </span>`
        };
    }
    
    // Load user leave data
    async function loadUserLeaveData(userId, userType) {
        console.log('Loading leave data for user with ID:', userId, 'userType:', userType);
        
        // Store current user context for form submission
        window.currentLeaveUserId = userId;
        window.currentLeaveUserType = userType;
        
        try {
            // Choose API endpoint based on user type
            let apiEndpoint, idParam;
            if (userType === 'worker') {
                apiEndpoint = 'staff-attendance';
                idParam = 'staff_id';
            } else if (userType === 'staff') {
                apiEndpoint = 'user-attendance';
                idParam = 'user_id';
            } else {
                throw new Error('Invalid user type: ' + userType);
            }
            
            // Fetch attendance records filtered by specific user ID
            const url = new URL(`${API_BASE_URL}/${apiEndpoint}`);
            
            // Add query parameters including user ID filter
            const params = {
                [idParam]: userId, // Filter by specific user's ID
                date_attendance_id: 1, // Current attendance period
                per_page: 100, // Get more records to find leaves
                page: 1
            };
            
            Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
            
            const headers = {
                'Authorization': `Bearer ${getAuthToken()}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            };
            
            console.log('Fetching leave data from:', url.toString());
            console.log('API parameters:', params);
            console.log('Using endpoint:', apiEndpoint, 'with ID parameter:', idParam);
            
            const response = await fetch(url, {
                method: 'GET',
                headers
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            console.log('Leave API Response for', userType, 'ID', userId, ':', result);
            
            if (result.success && result.data) {
                // Handle both paginated and non-paginated responses
                let records = [];
                if (result.data.data && Array.isArray(result.data.data)) {
                    records = result.data.data;
                } else if (Array.isArray(result.data)) {
                    records = result.data;
                }
                
                console.log('All attendance records for', userType, 'ID', userId, ':', records);
                
                // Filter records for leave types only (since we already filtered by user ID in API)
                const userLeaveRecords = records.filter(record => {
                    const hasLeaveStatus = record.status && 
                           ['annual_leave', 'sick_leave', 'unpaid_leave'].includes(record.status);
                    console.log('Record', record.id, 'status:', record.status, 'is leave:', hasLeaveStatus);
                    return hasLeaveStatus;
                });
                
                console.log('Filtered leave records for', userType, 'ID', userId, ':', userLeaveRecords);
                renderLeaveRecords(userLeaveRecords);
            } else {
                console.log('No leave data found for', userType, 'ID:', userId, 'API response:', result);
                renderLeaveRecords([]);
            }
            
        } catch (error) {
            console.error('Error loading leave data for', userType, 'ID', userId, ':', error);
            showLeaveError(`Failed to load leave records for ${userType} ID ${userId}. Please try again.`);
        }
    }
    
    // Render leave records in the modal
    function renderLeaveRecords(leaveRecords) {
        const leaveList = document.getElementById('leaveList');
        if (!leaveList) return;
        
        if (!leaveRecords || leaveRecords.length === 0) {
            leaveList.innerHTML = `
                <div class="text-center py-4">
                    <i class="bi bi-calendar-x text-muted" style="font-size: 3rem;"></i>
                    <p class="mt-3 text-muted">No leave records found for this user.</p>
                </div>
            `;
            return;
        }
        
        // Sort records by date (newest first)
        const sortedRecords = leaveRecords.sort((a, b) => {
            return new Date(b.created_at) - new Date(a.created_at);
        });
        
        const recordsHtml = sortedRecords.map(record => {
            const leaveInfo = getLeaveTypeBadge(record.status);
            const displayDate = record.date_attendance?.date || record.created_at;
            
            return `
                <div class="bg-white rounded p-3 mb-3 d-flex align-items-center justify-content-between">
                    <div class="d-flex align-items-center">
                        <div style="width: 4px; height: 60px; background-color: ${leaveInfo.borderColor}; border-radius: 2px;" class="me-3"></div>
                        <div>
                            <h6 class="mb-0 fw-semibold">${formatDateShort(displayDate)}</h6>
                            ${record.notes ? `<small class="text-muted">${record.notes}</small>` : ''}
                        </div>
                    </div>
                    ${leaveInfo.badge}
                </div>
            `;
        }).join('');
        
        leaveList.innerHTML = recordsHtml;
    }
    
    // Show error message in leave list
    function showLeaveError(message) {
        const leaveList = document.getElementById('leaveList');
        if (!leaveList) return;
        
        leaveList.innerHTML = `
            <div class="alert alert-danger" role="alert">
                <i class="bi bi-exclamation-triangle me-2"></i>
                <strong>Error:</strong> ${message}
            </div>
        `;
    }
    
    // Mark user as on leave (Workers and Staff)
    async function markStaffOnLeave(userId, fromDate, toDate, leaveType, notes = '') {
        console.log('Marking user on leave - ID:', userId, 'dates:', fromDate, 'to', toDate, 'type:', leaveType);
        
        const userType = window.currentLeaveUserType;
        console.log('User type:', userType);
        
        // Input validation
        if (!userId) {
            return {
                success: false,
                message: 'User ID is required.'
            };
        }
        
        if (!fromDate || !toDate) {
            return {
                success: false,
                message: 'From date and to date are required.'
            };
        }
        
        if (!leaveType || !['annual_leave', 'sick_leave', 'unpaid_leave'].includes(leaveType)) {
            return {
                success: false,
                message: 'Valid leave type is required.'
            };
        }
        
        if (!userType || !['worker', 'staff'].includes(userType)) {
            return {
                success: false,
                message: 'Invalid user type. Please refresh and try again.'
            };
        }
        
        // Date validation
        const fromDateObj = new Date(fromDate);
        const toDateObj = new Date(toDate);
        
        if (fromDateObj > toDateObj) {
            return {
                success: false,
                message: 'From date cannot be later than to date.'
            };
        }
        
        // Check for authentication token
        const authToken = getAuthToken();
        if (!authToken) {
            return {
                success: false,
                message: 'Authentication required. Please login again.'
            };
        }
        
        try {
            // Choose API endpoint and parameters based on user type
            let apiEndpoint, requestData;
            
            if (userType === 'worker') {
                apiEndpoint = `${API_BASE_URL}/staff-attendance/mark-leave`;
                requestData = {
                    staff_id: parseInt(userId),
                    from_date: fromDate,
                    to_date: toDate,
                    status: leaveType,
                    notes: notes || ''
                };
            } else if (userType === 'staff') {
                apiEndpoint = `${API_BASE_URL}/user-attendance/mark-leave`;
                requestData = {
                    user_id: parseInt(userId),
                    from_date: fromDate,
                    to_date: toDate,
                    status: leaveType,
                    notes: notes || ''
                };
            }
            
            const headers = {
                'Authorization': `Bearer ${getAuthToken()}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            };
            
            console.log('Sending leave request to:', apiEndpoint);
            console.log('Request data:', requestData);
            
            const response = await fetch(apiEndpoint, {
                method: 'POST',
                headers,
                body: JSON.stringify(requestData)
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Leave request failed:', errorText);
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            console.log('Leave request response:', result);
            
            if (result.success) {
                return {
                    success: true,
                    message: result.message,
                    data: result.data
                };
            } else {
                throw new Error(result.message || 'Failed to mark staff on leave');
            }
            
        } catch (error) {
            console.error('Error marking staff on leave:', error);
            
            // Provide specific error messages based on error type
            let errorMessage = 'Failed to submit leave request.';
            
            if (error.message && error.message.includes('401')) {
                errorMessage = 'Authentication failed. Please login again.';
            } else if (error.message && error.message.includes('403')) {
                errorMessage = 'You do not have permission to submit leave requests.';
            } else if (error.message && error.message.includes('404')) {
                errorMessage = 'Leave service not found. Please contact support.';
            } else if (error.message && error.message.includes('422')) {
                errorMessage = 'Invalid leave request data. Please check your inputs.';
            } else if (error.message && error.message.includes('network')) {
                errorMessage = 'Network error. Please check your connection.';
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            return {
                success: false,
                message: errorMessage
            };
        }
    }
    
    // Apply leave type filter
    function filterLeaveRecords(leaveType) {
        console.log('Filtering leave records by type:', leaveType);
        
        // Get current user context
        const userId = window.currentLeaveUserId;
        const userType = window.currentLeaveUserType;
        
        if (!userId || !userType) {
            console.error('User context not found for filtering');
            return;
        }
        
        // For now, reload all data and filter client-side
        // In a real implementation, you might want to pass filter to API
        loadUserLeaveData(userId, userType);
        
        // Update filter button states
        updateFilterButtons(leaveType);
    }
    
    // Update filter button states
    function updateFilterButtons(activeFilter) {
        // Reset all filter buttons
        document.getElementById('leaveFilterAll')?.classList.remove('active');
        
        // Set active button
        if (activeFilter === 'all') {
            document.getElementById('leaveFilterAll')?.classList.add('active');
            document.getElementById('leaveFilterMonth').textContent = 'Month';
            document.getElementById('leaveFilterType').textContent = 'Type of Leave';
        }
    }
    
    // Initialize leave management
    function initializeLeaveManagement() {
        console.log('Initializing leave management...');
        
        // Add filter event listeners
        const filterAllBtn = document.getElementById('leaveFilterAll');
        if (filterAllBtn) {
            filterAllBtn.addEventListener('click', () => {
                filterLeaveRecords('all');
            });
        }
        
        // Add leave type filter listeners
        const leaveTypeItems = document.querySelectorAll('#leaveFilterType + ul .dropdown-item');
        leaveTypeItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const leaveType = item.getAttribute('data-type');
                document.getElementById('leaveFilterType').textContent = item.textContent;
                filterLeaveRecords(leaveType);
            });
        });
        
        // Add month filter listeners (placeholder for now)
        const monthItems = document.querySelectorAll('#leaveFilterMonth + ul .dropdown-item');
        monthItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const month = item.getAttribute('data-month');
                document.getElementById('leaveFilterMonth').textContent = item.textContent;
                // Implement month filtering if needed
                filterLeaveRecords('month');
            });
        });
        
        console.log('Leave management initialized');
    }
    
    // Expose functions globally
    window.loadUserLeaveData = loadUserLeaveData;
    window.submitLeaveApplication = markStaffOnLeave;  // Use different name to avoid conflict
    window.filterLeaveRecords = filterLeaveRecords;
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeLeaveManagement);
    } else {
        initializeLeaveManagement();
    }
    
})();
