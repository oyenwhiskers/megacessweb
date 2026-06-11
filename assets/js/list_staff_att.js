// Staff Attendance List Management
(function () {
    // Configuration
    const API_BASE_URL = API_URL; // Using global API_URL from config.js
    const DEFAULT_PER_PAGE = 10;
    let currentPage = 1;
    let currentDateAttendanceId = 1;
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
            window.location.href = '../pages/log-in.html';
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
                <button class="btn btn-outline-danger btn-sm ms-3" onclick="window.retryStaffAttendanceList()">
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

        const { data: records, current_page, per_page, total, last_page, from, to } = data.data || data;

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
                    userImage = `${STORAGE_DOMAIN}/storage/user-images/${userImage}`;
                } else if (userImage.startsWith('/')) {
                    // Add domain if it starts with /
                    userImage = `${STORAGE_DOMAIN}${userImage}`;
                }
            }

            const imgSrc = (userImage && userImage.trim() !== '') ? userImage : placeholderImage;

            return `
                <div class="list-group-item staff-attendance-item">
                    <div class="d-flex align-items-center">
                        <div style="width:50px;height:50px;flex:0 0 50px;">
                            <img loading="lazy" src="${imgSrc}" 
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

        // Render the attendance list with pagination holder
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
            <div id="staffAttPaginationContainer"></div>
        `;

        // Render standardized pagination
        renderPagination('staffAttPaginationContainer', {
            current_page: current_page,
            last_page: last_page
        }, (newPage) => window.retryStaffAttendanceList(newPage));
    }



    // Check if date has an attendance ID
    async function checkDateAttendanceId(dateString) {
        try {
            const token = getAuthToken();
            if (!token) return null;

            // Use POST method as per backend route configuration
            const url = new URL(`${API_BASE_URL}/attendance/check`);

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    date: dateString
                })
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

    // Show no attendance message
    function showNoAttendanceMessage(dateString) {
        if (!staffAttendanceView) return;

        const date = new Date(dateString);
        const dateText = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

        staffAttendanceView.innerHTML = `
            <div class="text-center py-5">
                <div class="mb-4">
                    <i class="bi bi-calendar-x" style="font-size: 4rem; color: #dee2e6;"></i>
                </div>
                <h5 class="text-muted mb-3">No Attendance Records</h5>
                <p class="text-muted mb-0">There are no attendance records taken for <strong>${dateText}</strong>.</p>
                <p class="text-muted small mt-2">Try selecting a different date to view attendance records.</p>
            </div>
        `;
    }

    // Main fetch function
    async function fetchStaffAttendanceList(page = 1, dateAttendanceId = 1, perPage = DEFAULT_PER_PAGE) {
        if (!staffAttendanceView) return;

        currentPage = page;
        currentDateAttendanceId = dateAttendanceId;

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
            let endpoint = `/user-attendance?date_attendance_id=${dateAttendanceId}&page=${page}&per_page=${perPage}`;

            // Cache for 5 minutes
            const data = await apiFetchWithCache(endpoint, { method: 'GET' }, 5 * 60 * 1000);
            renderStaffAttendanceRecords(data);
        } catch (err) {
            console.error('Error fetching staff attendance:', err);
            showError('Failed to load attendance records. Please try again.');
        }
    }

    window.markStaffOvertime = function (userId) {
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
            window.location.href = `../pages/manage-overtime-details.html?${params.toString()}`;
        } else {
            // Fallback if data not found
            const params = new URLSearchParams({
                userId: userId,
                userName: 'Staff Member',
                userRole: 'Staff',
                userImage: '',
                userType: 'staff'
            });
            window.location.href = `../pages/manage-overtime-details.html?${params.toString()}`;
        }
    };

    // Helper function to get current staff data
    function getCurrentStaffData(userId) {
        // Find the record in the current data
        const staff = currentRecordsData.find(record => record.user_id == userId);
        return staff || null;
    }

    // Fetch attendance by date (checks date attendance ID first)
    window.fetchStaffAttendanceByDate = async function (dateString) {
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
        await fetchStaffAttendanceList(1, attendanceId, DEFAULT_PER_PAGE);
    };

    // Expose main function globally so it can be called from manage-attendance.html
    window.fetchStaffAttendanceList = fetchStaffAttendanceList;

    // Ensure showStaffAttendanceAnalytics is globally available
    window.showStaffAttendanceAnalytics = showStaffAttendanceAnalytics;

    // Show Staff Leave Details - Navigate to dedicated leave page
    window.showStaffLeaveModal = function (userId) {
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
        window.location.href = `../pages/manage-leave-details.html?${params.toString()}`;
    };

    // Add delegated event listener for View button
    if (staffAttendanceView) {
        staffAttendanceView.addEventListener('click', async function (e) {
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
                const url = new URL(`${API_URL}/user-attendance/${userId}/analytics`);
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
            window.location.href = `../pages/view-attendance-details.html?${params.toString()}`;
        } else {
            // Fallback if data not found
            const params = new URLSearchParams({
                userId: userId,
                userName: 'Staff Member',
                userRole: 'Staff',
                userImage: '',
                userType: 'staff'
            });
            window.location.href = `../pages/view-attendance-details.html?${params.toString()}`;
        }
    }

    // Retry function that preserves current filter state
    window.retryStaffAttendanceList = function (page = null) {
        const pageToUse = page !== null ? page : currentPage;
        fetchStaffAttendanceList(pageToUse, currentDateAttendanceId, DEFAULT_PER_PAGE);
    };

})();

