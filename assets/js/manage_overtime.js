(function() {
    'use strict';

    // API configuration
    const API_BASE_URL = 'https://mwms.megacess.com/api/v1';
    
    // Get auth token from localStorage
    function getAuthToken() {
        return localStorage.getItem('authToken') || '';
    }

    // Format date for display (convert from YYYY-MM-DD to DD/MM/YY)
    function formatDisplayDate(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = String(date.getFullYear()).slice(-2);
        return `${day}/${month}/${year}`;
    }

    // Format duration (minutes to hours and minutes)
    function formatDuration(minutes) {
        if (!minutes) return 'N/A';
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        if (hours > 0) {
            return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
        }
        return `${remainingMinutes}m`;
    }

    // Get status badge class
    function getStatusBadgeClass(status) {
        switch (status) {
            case 'approved':
                return 'bg-success';
            case 'pending':
                return 'bg-warning';
            case 'rejected':
                return 'bg-danger';
            default:
                return 'bg-secondary';
        }
    }

    // Fetch overtime data from API
    async function fetchOvertimeData(userId, userType, filters = {}) {
        try {
            const token = getAuthToken();
            if (!token) {
                throw new Error('No authentication token found');
            }

            // Build query parameters
            const params = new URLSearchParams();
            
            // Set user_id or staff_id based on user type
            if (userType === 'worker') {
                params.append('staff_id', userId);
            } else {
                params.append('user_id', userId);
            }

            // Add optional filters
            if (filters.status) {
                params.append('status', filters.status);
            }
            if (filters.dateAttendanceId) {
                params.append('date_attendance_id', filters.dateAttendanceId);
            }
            if (filters.dateFrom) {
                params.append('date_from', filters.dateFrom);
            }
            if (filters.dateTo) {
                params.append('date_to', filters.dateTo);
            }
            if (filters.perPage) {
                params.append('per_page', filters.perPage);
            } else {
                params.append('per_page', 50); // Default to 50 records
            }

            const response = await fetch(`${API_BASE_URL}/overtimes?${params.toString()}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching overtime data:', error);
            throw error;
        }
    }

    // Render overtime records
    function renderOvertimeRecords(overtimeData) {
        const overtimeList = document.getElementById('overtimeList');
        
        if (!overtimeData || !overtimeData.data || overtimeData.data.length === 0) {
            overtimeList.innerHTML = `
                <div class="text-center py-4">
                    <i class="bi bi-clock text-muted" style="font-size: 3rem;"></i>
                    <p class="mt-3 text-muted">No overtime records found for this user.</p>
                </div>
            `;
            return;
        }

        const overtimeHtml = overtimeData.data.map(record => {
            const createdByName = record.user?.user_fullname || record.staff?.staff_fullname || 'Unknown';
            const statusBadgeClass = getStatusBadgeClass(record.status);
            const displayDate = formatDisplayDate(record.date_attendance?.date);
            const duration = formatDuration(record.duration);
            
            return `
                <div class="bg-white rounded p-3 mb-2">
                    <div class="d-flex align-items-start">
                        <div class="${statusBadgeClass} rounded me-3" style="width: 8px; height: 40px;"></div>
                        <div class="flex-grow-1">
                            <div class="d-flex justify-content-between align-items-start mb-2">
                                <div>
                                    <h6 class="mb-1 fw-bold">${displayDate}</h6>
                                    <small class="text-muted">Created by: ${createdByName}</small>
                                </div>
                                <div class="text-end">
                                    <span class="badge ${statusBadgeClass} text-white">${record.status}</span>
                                </div>
                            </div>
                            <div class="row">
                                <div class="col-md-6">
                                    <small class="text-muted d-block">Duration: <strong>${duration}</strong></small>
                                </div>
                                <div class="col-md-6">
                                    <small class="text-muted d-block">Date: <strong>${record.date_attendance?.date || 'N/A'}</strong></small>
                                </div>
                            </div>
                            ${record.remark ? `
                                <div class="mt-2">
                                    <small class="text-muted">Remark:</small>
                                    <p class="mb-0 small">${record.remark}</p>
                                </div>
                            ` : ''}
                        </div>
                        <div class="dropdown ms-2">
                            <button class="btn btn-sm btn-outline-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                                <i class="bi bi-three-dots-vertical"></i>
                            </button>
                            <ul class="dropdown-menu">
                                <li><a class="dropdown-item" href="#" onclick="editOvertimeRecord(${record.id})">
                                    <i class="bi bi-pencil me-2"></i>Edit
                                </a></li>
                                <li><a class="dropdown-item text-danger" href="#" onclick="deleteOvertimeRecord(${record.id})">
                                    <i class="bi bi-trash me-2"></i>Delete
                                </a></li>
                            </ul>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Add pagination info if available
        const paginationInfo = overtimeData.meta ? `
            <div class="mt-3 text-center">
                <small class="text-muted">
                    Showing ${overtimeData.data.length} of ${overtimeData.meta.total} records 
                    (Page ${overtimeData.meta.current_page} of ${overtimeData.meta.last_page})
                </small>
            </div>
        ` : '';

        overtimeList.innerHTML = overtimeHtml + paginationInfo;
    }

    // Load user overtime data
    async function loadUserOvertimeData(userId, userType, filters = {}) {
        const overtimeList = document.getElementById('overtimeList');
        
        // Show loading state
        overtimeList.innerHTML = `
            <div class="text-center py-4">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-2">Loading overtime records...</p>
            </div>
        `;

        try {
            const overtimeData = await fetchOvertimeData(userId, userType, filters);
            renderOvertimeRecords(overtimeData);
        } catch (error) {
            console.error('Failed to load overtime data:', error);
            overtimeList.innerHTML = `
                <div class="text-center py-4">
                    <i class="bi bi-exclamation-triangle text-danger" style="font-size: 3rem;"></i>
                    <p class="mt-3 text-danger">Failed to load overtime records.</p>
                    <p class="text-muted">${error.message}</p>
                    <button class="btn btn-outline-primary btn-sm" onclick="retryLoadOvertimeData()">
                        <i class="bi bi-arrow-clockwise me-1"></i>Retry
                    </button>
                </div>
            `;
        }
    }

    // Filter overtime records by month
    function filterOvertimeByMonth(month) {
        const currentUserId = window.currentOvertimeUserId;
        const currentUserType = window.currentOvertimeUserType;
        
        if (!currentUserId || !currentUserType) {
            console.error('No user context available for filtering');
            return;
        }

        // Calculate date range for the selected month
        const currentYear = new Date().getFullYear();
        const dateFrom = `${currentYear}-${String(month).padStart(2, '0')}-01`;
        
        // Get last day of the month
        const lastDay = new Date(currentYear, month, 0).getDate();
        const dateTo = `${currentYear}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

        const filters = {
            dateFrom: dateFrom,
            dateTo: dateTo
        };

        loadUserOvertimeData(currentUserId, currentUserType, filters);
    }

    // Show all overtime records (remove date filter)
    function showAllOvertimeRecords() {
        const currentUserId = window.currentOvertimeUserId;
        const currentUserType = window.currentOvertimeUserType;
        
        if (!currentUserId || !currentUserType) {
            console.error('No user context available for filtering');
            return;
        }

        loadUserOvertimeData(currentUserId, currentUserType);
    }

    // Retry loading overtime data
    window.retryLoadOvertimeData = function() {
        const currentUserId = window.currentOvertimeUserId;
        const currentUserType = window.currentOvertimeUserType;
        
        if (!currentUserId || !currentUserType) {
            console.error('No user context available for retry');
            return;
        }

        loadUserOvertimeData(currentUserId, currentUserType);
    };

    // Edit overtime record (placeholder)
    window.editOvertimeRecord = function(recordId) {
        alert(`Edit overtime functionality will be implemented for record ID: ${recordId}`);
    };

    // Delete overtime record (placeholder)
    window.deleteOvertimeRecord = function(recordId) {
        if (confirm('Are you sure you want to delete this overtime record?')) {
            alert(`Delete overtime functionality will be implemented for record ID: ${recordId}`);
        }
    };

    // Export the main function to global scope
    window.loadUserOvertimeData = loadUserOvertimeData;
    window.filterOvertimeByMonth = filterOvertimeByMonth;
    window.showAllOvertimeRecords = showAllOvertimeRecords;

    // Initialize event listeners when DOM is ready
    document.addEventListener('DOMContentLoaded', function() {
        // Filter functionality for "All" button
        const allFilterBtn = document.getElementById('overtimeFilterAll');
        if (allFilterBtn) {
            allFilterBtn.addEventListener('click', function() {
                this.classList.add('active');
                // Remove active class from month filter
                const monthBtn = document.getElementById('overtimeFilterMonth');
                if (monthBtn) {
                    monthBtn.textContent = 'Month';
                }
                showAllOvertimeRecords();
            });
        }

        // Month filter functionality
        const monthFilterItems = document.querySelectorAll('#overtimeFilterMonth + .dropdown-menu a');
        monthFilterItems.forEach(item => {
            item.addEventListener('click', function(e) {
                e.preventDefault();
                const month = parseInt(this.dataset.month);
                const monthName = this.textContent;
                
                // Update button text
                document.getElementById('overtimeFilterMonth').textContent = monthName;
                
                // Remove active class from "All" button
                const allBtn = document.getElementById('overtimeFilterAll');
                if (allBtn) {
                    allBtn.classList.remove('active');
                }
                
                // Filter by month
                filterOvertimeByMonth(month);
            });
        });
    });

})();
