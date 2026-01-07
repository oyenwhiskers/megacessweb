(function() {
    'use strict';

    const API_BASE_URL = 'https://mwms.megacess.com/api/v1';

    // Get URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('userId');
    const userType = urlParams.get('userType'); // 'worker' or 'staff'
    const userName = urlParams.get('userName') || 'User';
    const userImage = urlParams.get('userImage') || '';
    const userRole = urlParams.get('userRole') || '';

    // Pagination state
    let currentPage = 1;
    const itemsPerPage = 10;
    let lastPage = 1;
    let allRecords = [];

    // Token management
    function getAuthToken() {
        return localStorage.getItem('authToken') || 
               localStorage.getItem('auth_token') ||
               sessionStorage.getItem('authToken') ||
               sessionStorage.getItem('auth_token') ||
               '';
    }

    // Initialize the page
    function initializePage() {
        if (!userId || !userType) {
            // No user data in URL, show error
            document.querySelector('.container-fluid').innerHTML = `
                <div class="text-center py-5">
                    <i class="bi bi-exclamation-triangle text-warning" style="font-size: 3rem;"></i>
                    <p class="mt-3 text-muted">No user selected. Please go back to the attendance page and select a user.</p>
                    <a href="/pages/manage-attendance.html" class="btn btn-secondary">
                        <i class="bi bi-arrow-left me-2"></i>Back to Attendance
                    </a>
                </div>
            `;
            return;
        }

        // Display user information
        document.getElementById('userName').textContent = decodeURIComponent(userName);
        document.getElementById('userRole').textContent = userRole ? decodeURIComponent(userRole) : (userType === 'staff' ? 'Staff' : 'Worker');

        // Set user avatar
        const avatar = document.getElementById('userAvatar');
        if (userImage && userImage !== 'null' && userImage !== 'undefined') {
            let cleanImageUrl = decodeURIComponent(userImage).replace(/:\d+$/, '').trim();
            
            if (!cleanImageUrl.startsWith('http') && !cleanImageUrl.startsWith('/')) {
                cleanImageUrl = `https://mwms.megacess.com/storage/user-images/${cleanImageUrl}`;
            } else if (cleanImageUrl.startsWith('/')) {
                cleanImageUrl = `https://mwms.megacess.com${cleanImageUrl}`;
            }
            
            avatar.src = cleanImageUrl;
            avatar.onerror = function() {
                this.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=cccccc&color=fff&size=96`;
                this.onerror = null;
            };
        } else {
            avatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=cccccc&color=fff&size=96`;
        }

        // Populate year dropdowns
        populateYearDropdowns();

        // Set current month and year
        const now = new Date();
        document.getElementById('analyticsMonth').value = String(now.getMonth() + 1).padStart(2, '0');
        document.getElementById('recordsMonth').value = String(now.getMonth() + 1).padStart(2, '0');
        
        const currentYear = now.getFullYear();
        document.getElementById('analyticsYear').value = currentYear;
        document.getElementById('recordsYear').value = currentYear;

        // Load initial data
        loadAnalytics();
        loadAttendanceRecords();

        // Add event listeners for filters
        document.getElementById('analyticsYear').addEventListener('change', loadAnalytics);
        document.getElementById('analyticsMonth').addEventListener('change', loadAnalytics);
        document.getElementById('recordsYear').addEventListener('change', loadAttendanceRecords);
        document.getElementById('recordsMonth').addEventListener('change', loadAttendanceRecords);
        document.getElementById('recordsStatus').addEventListener('change', loadAttendanceRecords);
    }

    // Populate year dropdowns
    function populateYearDropdowns() {
        const now = new Date();
        const currentYear = now.getFullYear();
        let yearOptions = '';
        
        for (let y = currentYear - 5; y <= currentYear + 1; y++) {
            yearOptions += `<option value="${y}">${y}</option>`;
        }
        
        document.getElementById('analyticsYear').innerHTML = yearOptions;
        document.getElementById('recordsYear').innerHTML = yearOptions;
    }

    // Show loading spinner on metrics cards
    function showMetricsLoading() {
        const spinner = '<div class="spinner-border spinner-border-sm text-success" role="status"><span class="visually-hidden">Loading...</span></div>';
        document.getElementById('attendanceRateValue').innerHTML = spinner;
        document.getElementById('punctualityRateValue').innerHTML = spinner;
        document.getElementById('numberAbsentValue').innerHTML = spinner;
    }

    // Hide loading spinner and show values
    function hideMetricsLoading() {
        // This will be called after data is loaded
    }

    // Load analytics data
    async function loadAnalytics() {
        const year = document.getElementById('analyticsYear').value;
        const month = document.getElementById('analyticsMonth').value;
        const monthStr = `${year}-${month}`;

        // Show loading spinners
        showMetricsLoading();

        const token = getAuthToken();
        if (!token) {
            Swal.fire({
                icon: 'error',
                title: 'Authentication Required',
                text: 'Please log in to view attendance details',
                confirmButtonColor: '#dc3545'
            }).then(() => {
                window.location.href = '/pages/log-in.html';
            });
            return;
        }

        try {
            // Determine API endpoint based on user type
            const endpoint = userType === 'staff' 
                ? `${API_BASE_URL}/user-attendance/${userId}/analytics`
                : `${API_BASE_URL}/staff-attendance/${userId}/analytics`;

            const url = new URL(endpoint);
            url.searchParams.append('month', monthStr);

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();

            if (result.success && result.data) {
                const data = result.data;
                document.getElementById('attendanceRateValue').textContent = `${data.attendance_rate ?? 0}%`;
                document.getElementById('punctualityRateValue').textContent = `${data.punctuality_rate ?? 0}%`;
                document.getElementById('numberAbsentValue').textContent = data.number_absent ?? 0;
            } else {
                throw new Error(result.message || 'Failed to load analytics');
            }
        } catch (error) {
            console.error('Error loading analytics:', error);
            document.getElementById('attendanceRateValue').textContent = 'N/A';
            document.getElementById('punctualityRateValue').textContent = 'N/A';
            document.getElementById('numberAbsentValue').textContent = 'N/A';
        }
    }

    // Load attendance records
    async function loadAttendanceRecords() {
        const year = document.getElementById('recordsYear').value;
        const month = document.getElementById('recordsMonth').value;
        const status = document.getElementById('recordsStatus').value;
        const monthStr = `${year}-${month}`;

        const token = getAuthToken();
        if (!token) return;

        // Show loading
        document.getElementById('attendanceRecordsTable').innerHTML = `
            <div class="text-center py-5">
                <div class="spinner-border text-success" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-3 text-muted">Loading attendance records...</p>
            </div>
        `;

        try {
            // Determine API endpoint based on user type
            const endpoint = userType === 'staff' 
                ? `${API_BASE_URL}/user-attendance/${userId}/records`
                : `${API_BASE_URL}/staff-attendance/${userId}/records`;

            const url = new URL(endpoint);
            url.searchParams.append('month', monthStr);

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();

            if (result.success && result.data && result.data.data) {
                let records = result.data.data;

                // Apply client-side status filter
                if (status && status !== 'all') {
                    const selectedStatus = status.trim().toLowerCase();
                    records = records.filter(r => {
                        if (!r.status) return false;
                        let recordStatus = r.status.trim().toLowerCase();
                        // Normalize status for comparison
                        if (recordStatus === 'annual_leave') recordStatus = 'annual leave';
                        if (recordStatus === 'sick_leave') recordStatus = 'sick leave';
                        if (recordStatus === 'unpaid_leave') recordStatus = 'unpaid leave';
                        if (recordStatus === 'check_in') recordStatus = 'check in';
                        return recordStatus === selectedStatus.replace('_', ' ');
                    });
                }

                // Store records and reset to first page
                allRecords = records;
                currentPage = 1;
                lastPage = Math.ceil(allRecords.length / itemsPerPage);
                renderAttendanceRecords();
            } else {
                allRecords = [];
                currentPage = 1;
                lastPage = 1;
                document.getElementById('attendanceRecordsTable').innerHTML = `
                    <div class="text-muted text-center py-4">No attendance records found for this month.</div>
                `;
                // Remove pagination if exists
                const existingPagination = document.getElementById('recordsPagination');
                if (existingPagination) existingPagination.remove();
            }
        } catch (error) {
            console.error('Error loading attendance records:', error);
            document.getElementById('attendanceRecordsTable').innerHTML = `
                <div class="text-danger text-center py-4">Error loading attendance records.</div>
            `;
        }
    }

    // Render attendance records with pagination
    function renderAttendanceRecords() {
        if (!allRecords || allRecords.length === 0) {
            document.getElementById('attendanceRecordsTable').innerHTML = `
                <div class="text-muted text-center py-4">No attendance records found for this month.</div>
            `;
            const existingPagination = document.getElementById('recordsPagination');
            if (existingPagination) existingPagination.remove();
            return;
        }

        // Calculate pagination
        const startIdx = (currentPage - 1) * itemsPerPage;
        const endIdx = Math.min(startIdx + itemsPerPage, allRecords.length);
        const recordsToShow = allRecords.slice(startIdx, endIdx);

        // Render records
        let listHtml = '<div>';
        recordsToShow.forEach((rec, idx) => {
            const actualIdx = startIdx + idx;
            const statusInfo = getStatusInfo(rec.status);
            
            listHtml += `
                <div style="display: flex; align-items: center; background: #fff; border-radius: 12px; margin-bottom: 12px; border-left: 10px solid ${statusInfo.color}; padding: 0 16px 0 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                    <div style="flex: 1; min-width: 0; padding: 18px 0 18px 18px;">
                        <div style="font-size: 1.05rem; font-weight: 600; color: #222;">${rec.date || 'N/A'}</div>
                    </div>
                    <div style="flex-shrink: 0;">
                        <button type="button" class="attendance-record-detail-btn" data-record-idx="${actualIdx}" 
                                style="background: ${statusInfo.bgColor}; color: ${statusInfo.textColor}; border: none; border-radius: 10px; font-size: 1rem; font-weight: 600; padding: 0 24px; height: 38px; display: inline-flex; align-items: center; gap: 8px; min-width: 140px; justify-content: center; cursor: pointer;">
                            ${statusInfo.icon} <span style="font-size: 1rem; font-weight: 500;">${statusInfo.label}</span>
                        </button>
                    </div>
                </div>
            `;
        });
        listHtml += '</div>';
        
        document.getElementById('attendanceRecordsTable').innerHTML = listHtml;

        // Add event listeners for detail buttons
        const detailBtns = document.querySelectorAll('.attendance-record-detail-btn');
        detailBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                const idx = parseInt(this.getAttribute('data-record-idx'));
                if (allRecords[idx]) showRecordDetailModal(allRecords[idx]);
            });
        });

        // Render pagination controls
        renderPagination();
    }

    // Render pagination controls (matching salary management style)
    function renderPagination() {
        // Remove existing pagination if any
        const existingPagination = document.getElementById('recordsPagination');
        if (existingPagination) existingPagination.remove();

        if (lastPage <= 1) return;

        const container = document.getElementById('attendanceRecordsTable').parentElement;
        const paginationDiv = document.createElement('div');
        paginationDiv.id = 'recordsPagination';
        paginationDiv.className = 'mt-3 text-center';

        // Previous button
        const prevBtn = document.createElement('button');
        prevBtn.className = 'btn btn-sm btn-outline-success mx-1';
        prevBtn.innerHTML = '<i class="bi bi-chevron-left"></i>';
        prevBtn.disabled = currentPage === 1;
        prevBtn.addEventListener('click', () => goToPage(currentPage - 1));
        paginationDiv.appendChild(prevBtn);

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
                const ellipsis = document.createElement('span');
                ellipsis.className = 'btn btn-sm btn-outline-success mx-1 disabled';
                ellipsis.textContent = '...';
                paginationDiv.appendChild(ellipsis);
            } else {
                // Page button
                const pageBtn = document.createElement('button');
                pageBtn.className = `btn btn-sm mx-1 ${page === currentPage ? 'btn-success' : 'btn-outline-success'}`;
                pageBtn.textContent = page;
                pageBtn.addEventListener('click', () => goToPage(page));
                paginationDiv.appendChild(pageBtn);
            }
        });

        // Next button
        const nextBtn = document.createElement('button');
        nextBtn.className = 'btn btn-sm btn-outline-success mx-1';
        nextBtn.innerHTML = '<i class="bi bi-chevron-right"></i>';
        nextBtn.disabled = currentPage === lastPage;
        nextBtn.addEventListener('click', () => goToPage(currentPage + 1));
        paginationDiv.appendChild(nextBtn);

        container.appendChild(paginationDiv);
    }

    // Go to specific page
    function goToPage(page) {
        if (page < 1 || page > lastPage) return;
        currentPage = page;
        renderAttendanceRecords();
        // Scroll to top of records
        document.getElementById('attendanceRecordsTable').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // Get status information (color, icon, label)
    function getStatusInfo(status) {
        let color = '#888';
        let bgColor = '#adb5bd';
        let textColor = '#222';
        let icon = '';
        let label = status || '';

        switch (status) {
            case 'Present':
                color = '#198754'; bgColor = '#198754'; textColor = '#fff'; icon = '<i class="bi bi-check-lg"></i>'; label = 'Present';
                break;
            case 'Absent':
                color = '#dc3545'; bgColor = '#dc3545'; textColor = '#fff'; icon = '<i class="bi bi-x-lg"></i>'; label = 'Absent';
                break;
            case 'Check_in':
                color = '#0d6efd'; bgColor = '#0d6efd'; textColor = '#fff'; icon = '<i class="bi bi-record-circle"></i>'; label = 'Check In';
                break;
            case 'Late':
                color = '#ffc107'; bgColor = '#ffc107'; textColor = '#222'; icon = '<i class="bi bi-clock-history"></i>'; label = 'Late';
                break;
            case 'Annual_Leave':
            case 'annual_leave':
                color = '#0dcaf0'; bgColor = '#0dcaf0'; textColor = '#222'; icon = '<i class="bi bi-umbrella"></i>'; label = 'Annual Leave';
                break;
            case 'Sick_Leave':
            case 'sick_leave':
                color = '#6c757d'; bgColor = '#6c757d'; textColor = '#fff'; icon = '<i class="bi bi-emoji-dizzy"></i>'; label = 'Sick Leave';
                break;
            case 'Unpaid_Leave':
            case 'unpaid_leave':
                color = '#212529'; bgColor = '#212529'; textColor = '#fff'; icon = '<i class="bi bi-cash"></i>'; label = 'Unpaid Leave';
                break;
        }

        return { color, bgColor, textColor, icon, label };
    }

    // Show record detail modal
    function showRecordDetailModal(record) {
        const statusInfo = getStatusInfo(record.status);
        
        const badgeHtml = `<span style="display: inline-flex; align-items: center; gap: 6px; background: ${statusInfo.bgColor}; color: ${statusInfo.textColor}; font-weight: 600; padding: 6px 18px; border-radius: 8px; font-size: 1rem;">
            <span style="font-size: 1.2em;">${statusInfo.icon}</span> ${statusInfo.label}
        </span>`;

        document.getElementById('detailStatusBadge').innerHTML = badgeHtml;
        document.getElementById('detailCheckedBy').textContent = record.checkedin_by || record.checkedout_by || 'N/A';
        document.getElementById('detailDate').textContent = record.date || 'N/A';
        
        // Format check-in time
        let checkInTime = 'N/A';
        if (record.check_in) {
            try {
                const date = new Date(record.check_in);
                checkInTime = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).replace(/^0/, '');
            } catch (e) {
                checkInTime = record.check_in;
            }
        }
        document.getElementById('detailCheckIn').textContent = checkInTime;

        const modalEl = document.getElementById('attendanceRecordDetailModal');
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
    }

    // Initialize page when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializePage);
    } else {
        initializePage();
    }

})();


