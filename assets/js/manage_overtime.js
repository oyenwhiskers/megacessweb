(function () {
    'use strict';

    // API configuration (using global API_URL from config.js)
    const API_BASE_URL = API_URL;

    // Get auth token from localStorage
    function getAuthToken() {
        // Check multiple possible token storage locations
        return localStorage.getItem('authToken') ||
            localStorage.getItem('auth_token') ||
            sessionStorage.getItem('authToken') ||
            sessionStorage.getItem('auth_token') ||
            '';
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
        // Since there's only "Approved" status, always return success badge
        return 'bg-success';
    }

    // Format status for display
    function formatStatus(status) {
        // Since there's only "Approved" status, always return "Approved"
        return 'Approved';
    }

    // Track selected year and month for filtering
    let selectedYear = new Date().getFullYear();
    let selectedMonth = null;

    // Create new overtime record
    async function createOvertimeRecord(overtimeData) {
        try {
            const token = getAuthToken();
            if (!token) {
                throw new Error('No authentication token found');
            }

            // Prepare the request payload according to API specification
            const payload = {
                date: overtimeData.date,
                duration: overtimeData.duration, // Should be in minutes
                remark: overtimeData.remark || '',
                status: 'approved'
            };

            // Add user_id or staff_id based on user type
            if (overtimeData.user_id) {
                payload.user_id = overtimeData.user_id;
                payload.staff_id = null; // Explicitly set to null for staff
            } else if (overtimeData.staff_id) {
                payload.staff_id = overtimeData.staff_id;
                payload.user_id = null; // Explicitly set to null for workers
            } else {
                throw new Error('Either user_id or staff_id must be provided');
            }

            console.log('Sending overtime data:', payload);

            const response = await fetch(`${API_BASE_URL}/overtimes`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            let responseData;
            try {
                responseData = await response.json();
            } catch (parseError) {
                throw new Error('Invalid response format from server');
            }

            if (!response.ok) {
                // Handle API errors
                const errorMessage = responseData.message ||
                    responseData.error ||
                    `HTTP error! status: ${response.status}`;
                throw new Error(errorMessage);
            }

            console.log('Overtime record created successfully:', responseData);
            return responseData;
        } catch (error) {
            console.error('Error creating overtime record:', error);
            throw error;
        }
    }

    // Update overtime record
    async function updateOvertimeRecord(overtimeData) {
        try {
            const token = getAuthToken();
            if (!token) {
                throw new Error('No authentication token found');
            }

            // Prepare the request payload according to API specification
            const payload = {
                date: overtimeData.date,
                duration: overtimeData.duration, // Should be in minutes
                remark: overtimeData.remark || ''
            };

            // Add user_id or staff_id based on user type
            if (overtimeData.user_id) {
                payload.user_id = overtimeData.user_id;
                payload.staff_id = null; // Explicitly set to null for staff
            } else if (overtimeData.staff_id) {
                payload.staff_id = overtimeData.staff_id;
                payload.user_id = null; // Explicitly set to null for workers
            } else {
                throw new Error('Either user_id or staff_id must be provided');
            }

            console.log('Updating overtime data:', payload);

            const response = await fetch(`${API_BASE_URL}/overtimes/${overtimeData.id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            let responseData;
            try {
                responseData = await response.json();
            } catch (parseError) {
                throw new Error('Invalid response format from server');
            }

            if (!response.ok) {
                // Handle API errors
                const errorMessage = responseData.message ||
                    responseData.error ||
                    `HTTP error! status: ${response.status}`;
                throw new Error(errorMessage);
            }

            console.log('Overtime record updated successfully:', responseData);
            return responseData;
        } catch (error) {
            console.error('Error updating overtime record:', error);
            throw error;
        }
    }

    // Delete overtime record
    async function deleteOvertimeRecord(recordId) {
        try {
            const token = getAuthToken();
            if (!token) {
                throw new Error('No authentication token found');
            }

            console.log('Deleting overtime record ID:', recordId);

            const response = await fetch(`${API_BASE_URL}/overtimes/${recordId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });

            let responseData;
            try {
                responseData = await response.json();
            } catch (parseError) {
                // Some DELETE APIs might not return JSON
                if (response.ok) {
                    responseData = { success: true, message: 'Overtime record deleted successfully' };
                } else {
                    throw new Error('Invalid response format from server');
                }
            }

            if (!response.ok) {
                // Handle API errors
                const errorMessage = responseData.message ||
                    responseData.error ||
                    `HTTP error! status: ${response.status}`;
                throw new Error(errorMessage);
            }

            console.log('Overtime record deleted successfully:', responseData);
            return responseData;
        } catch (error) {
            console.error('Error deleting overtime record:', error);
            throw error;
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
            // Clear stored records when no data
            window.currentOvertimeRecords = [];
            overtimeList.innerHTML = `
                <div class="text-center py-4">
                    <i class="bi bi-clock text-muted" style="font-size: 3rem;"></i>
                    <p class="mt-3 text-muted">No overtime records found for this user.</p>
                </div>
            `;
            return;
        }

        // Store current records for edit functionality
        window.currentOvertimeRecords = overtimeData.data;

        const overtimeHtml = overtimeData.data.map(record => {
            const createdByName = record.user?.user_fullname || record.staff?.staff_fullname || 'Unknown';
            const statusBadgeClass = getStatusBadgeClass(record.status);
            const formattedStatus = formatStatus(record.status);
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
                                <div class="d-flex align-items-center gap-2">
                                    <span class="btn btn-sm ${statusBadgeClass} text-white border-0" style="min-width: 70px; pointer-events: none;">${formattedStatus}</span>
                                    <button class="btn btn-sm btn-outline-primary" onclick="editOvertimeRecord(${record.id})" title="Edit" style="min-width: 35px; height: 31px;">
                                        <i class="bi bi-pencil"></i>
                                    </button>
                                    <button class="btn btn-sm btn-outline-danger" onclick="deleteOvertimeRecord(${record.id})" title="Delete" style="min-width: 35px; height: 31px;">
                                        <i class="bi bi-trash"></i>
                                    </button>
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
                <div class="spinner-border text-success" role="status">
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

        // Store selected month
        selectedMonth = month;

        // Calculate date range for the selected month using selected year
        const dateFrom = `${selectedYear}-${String(month).padStart(2, '0')}-01`;

        // Get last day of the month
        const lastDay = new Date(selectedYear, month, 0).getDate();
        const dateTo = `${selectedYear}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

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

        // Reset selected month
        selectedMonth = null;

        // Reset filter button texts
        const yearBtn = document.getElementById('overtimeFilterYear');
        const monthBtn = document.getElementById('overtimeFilterMonth');
        if (yearBtn) yearBtn.textContent = 'Year';
        if (monthBtn) monthBtn.textContent = 'Month';

        loadUserOvertimeData(currentUserId, currentUserType);
    }

    // Retry loading overtime data
    window.retryLoadOvertimeData = function () {
        const currentUserId = window.currentOvertimeUserId;
        const currentUserType = window.currentOvertimeUserType;

        if (!currentUserId || !currentUserType) {
            console.error('No user context available for retry');
            return;
        }

        loadUserOvertimeData(currentUserId, currentUserType);
    };

    // Populate year dropdown with years from 2020 to current year + 1
    function populateYearDropdown() {
        const yearDropdown = document.getElementById('overtimeYearDropdown');
        if (!yearDropdown) return;

        const currentYear = new Date().getFullYear();
        const startYear = 2020;
        const endYear = currentYear + 1;

        yearDropdown.innerHTML = '';

        for (let year = endYear; year >= startYear; year--) {
            const li = document.createElement('li');
            const a = document.createElement('a');
            a.className = 'dropdown-item';
            a.href = '#';
            a.dataset.year = year;
            a.textContent = year;
            li.appendChild(a);
            yearDropdown.appendChild(li);
        }
    }

    // Edit overtime record (placeholder)
    window.editOvertimeRecord = function (recordId) {
        // Find the record data from the current overtime records
        const currentRecords = window.currentOvertimeRecords || [];
        const record = currentRecords.find(r => r.id == recordId);

        if (!record) {
            Swal.fire({
                icon: 'error',
                title: 'Record Not Found',
                text: 'The record was not found. Please refresh the list and try again.',
                confirmButtonColor: '#dc3545'
            });
            return;
        }

        // Populate the edit form with current data
        document.getElementById('editOvertimeId').value = record.id;
        document.getElementById('editOvertimeDate').value = record.date_attendance?.date || '';

        // Convert duration from minutes to hours for display
        const durationInHours = record.duration ? (record.duration / 60).toFixed(1) : '';
        document.getElementById('editOvertimeDuration').value = durationInHours;

        document.getElementById('editOvertimeRemarks').value = record.remark || '';

        // Show the edit modal
        const editModal = new bootstrap.Modal(document.getElementById('editOvertimeModal'));
        editModal.show();
    };

    // Delete overtime record with API integration
    window.deleteOvertimeRecord = async function (recordId) {
        // Show confirmation dialog with SweetAlert2
        const result = await Swal.fire({
            title: 'Are you sure?',
            text: 'Do you want to delete this overtime record? This action cannot be undone.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc3545',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Yes, delete it!',
            cancelButtonText: 'Cancel'
        });

        if (!result.isConfirmed) {
            return;
        }

        try {
            // Show loading state
            const deleteButton = document.querySelector(`button[onclick="deleteOvertimeRecord(${recordId})"]`);
            if (deleteButton) {
                const originalContent = deleteButton.innerHTML;
                deleteButton.disabled = true;

                try {
                    // Call the API delete function
                    await window.deleteOvertimeRecordAPI(recordId);

                    // Show success message
                    await Swal.fire({
                        icon: 'success',
                        title: 'Deleted!',
                        text: 'Overtime record has been deleted successfully',
                        confirmButtonColor: '#198754',
                        timer: 2000,
                        showConfirmButton: false
                    });

                    // Refresh the overtime list to remove the deleted record
                    if (window.loadUserOvertimeData && window.currentOvertimeUserId && window.currentOvertimeUserType) {
                        window.loadUserOvertimeData(window.currentOvertimeUserId, window.currentOvertimeUserType);
                    }
                } finally {
                    // Restore button state
                    deleteButton.innerHTML = originalContent;
                    deleteButton.disabled = false;
                }
            } else {
                // If button not found, still call the API
                await window.deleteOvertimeRecordAPI(recordId);

                await Swal.fire({
                    icon: 'success',
                    title: 'Deleted!',
                    text: 'Overtime record has been deleted successfully',
                    confirmButtonColor: '#198754',
                    timer: 2000,
                    showConfirmButton: false
                });

                // Refresh the overtime list
                if (window.loadUserOvertimeData && window.currentOvertimeUserId && window.currentOvertimeUserType) {
                    window.loadUserOvertimeData(window.currentOvertimeUserId, window.currentOvertimeUserType);
                }
            }
        } catch (error) {
            console.error('Error deleting overtime record:', error);

            // Provide specific error messages
            let errorMessage = 'Failed to delete overtime record.';
            if (error.message.includes('token')) {
                errorMessage = 'Authentication failed. Please login again.';
            } else if (error.message.includes('network') || error.message.includes('fetch')) {
                errorMessage = 'Network error. Please check your connection and try again.';
            } else if (error.message.includes('404')) {
                errorMessage = 'Overtime record not found or already deleted.';
            } else if (error.message.includes('403')) {
                errorMessage = 'You do not have permission to delete this overtime record.';
            } else if (error.message) {
                errorMessage = error.message;
            }

            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: errorMessage,
                confirmButtonColor: '#dc3545'
            });
        }
    };

    // Show overtime modal with user information
    function showOvertimeModal(userId, userName, userRole, userImage, userType) {
        // Store current user context for filtering
        window.currentOvertimeUserId = userId;
        window.currentOvertimeUserType = userType;

        // Set user information
        const userNameEl = document.getElementById('overtimeUserName');
        const userRoleEl = document.getElementById('overtimeUserRole');
        if (userNameEl) userNameEl.textContent = userName || 'Unknown User';
        if (userRoleEl) userRoleEl.textContent = userRole || 'Unknown Role';

        // Set user avatar with comprehensive error handling
        const avatar = document.getElementById('overtimeUserAvatar');
        if (avatar) {
            // Clean and validate the image URL
            let cleanImageUrl = '';
            if (userImage && typeof userImage === 'string' && userImage.trim() !== '') {
                // Remove problematic suffixes like :1, :2, etc.
                cleanImageUrl = userImage.replace(/:\d+$/, '').trim();

                // Additional cleaning for malformed URLs
                cleanImageUrl = cleanImageUrl.replace(/\.jpg:.*$/, '.jpg');
                cleanImageUrl = cleanImageUrl.replace(/\.png:.*$/, '.png');
                cleanImageUrl = cleanImageUrl.replace(/\.jpeg:.*$/, '.jpeg');
                cleanImageUrl = cleanImageUrl.replace(/\.gif:.*$/, '.gif');

                // Check if the cleaned URL is still valid
                if (cleanImageUrl.length < 5 ||
                    cleanImageUrl.includes('null') ||
                    cleanImageUrl.includes('undefined') ||
                    cleanImageUrl.includes('…') || // Sometimes URLs get truncated with ellipsis
                    cleanImageUrl.endsWith(':')) {
                    cleanImageUrl = '';
                }
            }

            if (cleanImageUrl && cleanImageUrl.trim() !== '') {
                // Try to construct the full URL
                let imageSrc = cleanImageUrl;

                // If it's not a full URL, construct the proper path
                if (!cleanImageUrl.startsWith('http') && !cleanImageUrl.startsWith('/')) {
                    imageSrc = `${STORAGE_DOMAIN}/storage/user-images/${cleanImageUrl}`;
                } else if (cleanImageUrl.startsWith('/')) {
                    imageSrc = `${STORAGE_DOMAIN}${cleanImageUrl}`;
                }

                // Set the image with error fallback
                avatar.src = imageSrc;
                avatar.onerror = function () {
                    // Fallback to placeholder if image fails to load
                    const placeholderImage = `https://ui-avatars.com/api/?name=${encodeURIComponent(userName || 'User')}&background=cccccc&color=fff&size=96`;
                    this.src = placeholderImage;
                    this.onerror = null; // Prevent infinite loop
                };
            } else {
                // Generate placeholder avatar for invalid or missing images
                const placeholderImage = `https://ui-avatars.com/api/?name=${encodeURIComponent(userName || 'User')}&background=cccccc&color=fff&size=96`;
                avatar.src = placeholderImage;
                avatar.onerror = null; // Clear any previous error handler
            }
        }

        // Reset filter buttons
        const allFilterBtn = document.getElementById('overtimeFilterAll');
        const monthFilterBtn = document.getElementById('overtimeFilterMonth');
        if (allFilterBtn) allFilterBtn.classList.add('active');
        if (monthFilterBtn) monthFilterBtn.textContent = 'Month';

        // Load overtime data for this user using the real API
        loadUserOvertimeData(userId, userType);

        // Show the modal
        const modalEl = document.getElementById('manageOvertimeModal');
        if (modalEl) {
            const modal = new bootstrap.Modal(modalEl);
            modal.show();
        }
    }

    // Save overtime record with UI feedback
    async function saveOvertimeRecord(overtimeData) {
        const saveButton = document.querySelector('#addOvertimeForm button[type="submit"]');

        try {
            // Show loading state
            if (saveButton) {
                const originalContent = saveButton.innerHTML;
                saveButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Saving...';
                saveButton.disabled = true;
            }

            // Use the API function
            const result = await createOvertimeRecord(overtimeData);

            // Close the add overtime modal first
            const addOvertimeModal = bootstrap.Modal.getInstance(document.getElementById('addOvertimeModal'));
            if (addOvertimeModal) {
                addOvertimeModal.hide();
            }

            // Success feedback with SweetAlert2
            await Swal.fire({
                icon: 'success',
                title: 'Success!',
                text: 'Overtime record has been saved successfully',
                confirmButtonColor: '#198754',
                timer: 2000,
                showConfirmButton: false
            });

            // Refresh the overtime list
            if (window.currentOvertimeUserId && window.currentOvertimeUserType) {
                loadUserOvertimeData(window.currentOvertimeUserId, window.currentOvertimeUserType);
            }
        } catch (error) {
            console.error('Error saving overtime:', error);

            // Provide specific error messages
            let errorMessage = 'Failed to save overtime record.';
            if (error.message.includes('token')) {
                errorMessage = 'Authentication failed. Please login again.';
            } else if (error.message.includes('network') || error.message.includes('fetch')) {
                errorMessage = 'Network error. Please check your connection and try again.';
            } else if (error.message) {
                errorMessage = error.message;
            }

            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: errorMessage,
                confirmButtonColor: '#dc3545'
            });
        } finally {
            // Reset button state
            if (saveButton) {
                saveButton.innerHTML = '<i class="bi bi-floppy me-2"></i>Save';
                saveButton.disabled = false;
            }
        }
    }

    // Update overtime record wrapper with UI feedback
    async function updateOvertimeRecordWithUI(overtimeData) {
        const updateButton = document.querySelector('#editOvertimeForm button[type="submit"]');

        try {
            // Show loading state
            if (updateButton) {
                const originalContent = updateButton.innerHTML;
                updateButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Updating...';
                updateButton.disabled = true;
            }

            // Use the API function
            const result = await updateOvertimeRecord(overtimeData);

            // Close the edit overtime modal first
            const editOvertimeModal = bootstrap.Modal.getInstance(document.getElementById('editOvertimeModal'));
            if (editOvertimeModal) {
                editOvertimeModal.hide();
            }

            // Success feedback with SweetAlert2
            await Swal.fire({
                icon: 'success',
                title: 'Success!',
                text: 'Overtime record has been updated successfully',
                confirmButtonColor: '#198754',
                timer: 2000,
                showConfirmButton: false
            });

            // Refresh the overtime list
            if (window.currentOvertimeUserId && window.currentOvertimeUserType) {
                loadUserOvertimeData(window.currentOvertimeUserId, window.currentOvertimeUserType);
            }
        } catch (error) {
            console.error('Error updating overtime:', error);

            // Provide specific error messages
            let errorMessage = 'Failed to update overtime record.';
            if (error.message.includes('token')) {
                errorMessage = 'Authentication failed. Please login again.';
            } else if (error.message.includes('network') || error.message.includes('fetch')) {
                errorMessage = 'Network error. Please check your connection and try again.';
            } else if (error.message) {
                errorMessage = error.message;
            }

            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: errorMessage,
                confirmButtonColor: '#dc3545'
            });
        } finally {
            // Reset button state
            if (updateButton) {
                updateButton.innerHTML = '<i class="bi bi-floppy me-2"></i>Update';
                updateButton.disabled = false;
            }
        }
    }

    // Export the main function to global scope
    window.loadUserOvertimeData = loadUserOvertimeData;
    window.filterOvertimeByMonth = filterOvertimeByMonth;
    window.showAllOvertimeRecords = showAllOvertimeRecords;
    window.showOvertimeModal = showOvertimeModal;
    window.createOvertimeRecord = createOvertimeRecord;
    window.updateOvertimeRecord = updateOvertimeRecord;
    window.saveOvertimeRecord = saveOvertimeRecord;
    window.updateOvertimeRecordWithUI = updateOvertimeRecordWithUI;
    window.deleteOvertimeRecordAPI = deleteOvertimeRecord; // Export the API function with different name

    // Initialize event listeners when DOM is ready
    document.addEventListener('DOMContentLoaded', function () {
        // Populate year dropdown on page load
        populateYearDropdown();

        // Filter functionality for "All" button
        const allFilterBtn = document.getElementById('overtimeFilterAll');
        if (allFilterBtn) {
            allFilterBtn.addEventListener('click', function () {
                this.classList.add('active');
                showAllOvertimeRecords();
            });
        }

        // Year filter functionality
        const yearFilterItems = document.querySelectorAll('#overtimeYearDropdown a');
        yearFilterItems.forEach(item => {
            item.addEventListener('click', function (e) {
                e.preventDefault();
                const year = parseInt(this.dataset.year);
                selectedYear = year;

                // Update button text
                document.getElementById('overtimeFilterYear').textContent = year;

                // Remove active class from "All" button
                const allBtn = document.getElementById('overtimeFilterAll');
                if (allBtn) {
                    allBtn.classList.remove('active');
                }

                // If a month is already selected, re-apply the filter with new year
                if (selectedMonth) {
                    filterOvertimeByMonth(selectedMonth);
                }
            });
        });

        // Month filter functionality
        const monthFilterItems = document.querySelectorAll('#overtimeFilterMonth + .dropdown-menu a');
        monthFilterItems.forEach(item => {
            item.addEventListener('click', function (e) {
                e.preventDefault();
                const month = parseInt(this.dataset.month);
                const monthName = this.textContent;

                // Update button text
                document.getElementById('overtimeFilterMonth').textContent = monthName;

                // Update year button to show selected year if not already shown
                const yearBtn = document.getElementById('overtimeFilterYear');
                if (yearBtn && yearBtn.textContent === 'Year') {
                    yearBtn.textContent = selectedYear;
                }

                // Remove active class from "All" button
                const allBtn = document.getElementById('overtimeFilterAll');
                if (allBtn) {
                    allBtn.classList.remove('active');
                }

                // Filter by month
                filterOvertimeByMonth(month);
            });
        });

        // Add overtime button functionality
        const addOvertimeBtn = document.getElementById('addOvertimeBtn');
        if (addOvertimeBtn) {
            addOvertimeBtn.addEventListener('click', function () {
                // Show the add overtime modal
                const addOvertimeModal = new bootstrap.Modal(document.getElementById('addOvertimeModal'));
                addOvertimeModal.show();

                // Set today's date as default
                const today = new Date().toISOString().split('T')[0];
                const overtimeDateInput = document.getElementById('overtimeDate');
                if (overtimeDateInput) overtimeDateInput.value = today;

                // Clear form fields
                const durationInput = document.getElementById('overtimeDuration');
                const remarksInput = document.getElementById('overtimeRemarks');
                if (durationInput) durationInput.value = '';
                if (remarksInput) remarksInput.value = '';
            });
        }

        // Add overtime form submission
        const addOvertimeForm = document.getElementById('addOvertimeForm');
        if (addOvertimeForm) {
            addOvertimeForm.addEventListener('submit', function (e) {
                e.preventDefault();

                const overtimeDate = document.getElementById('overtimeDate').value;
                const overtimeDuration = document.getElementById('overtimeDuration').value;
                const overtimeRemarks = document.getElementById('overtimeRemarks').value;

                // Validate form
                if (!overtimeDate) {
                    Swal.fire({
                        icon: 'warning',
                        title: 'Missing Information',
                        text: 'Please select an overtime date',
                        confirmButtonColor: '#198754'
                    });
                    return;
                }

                if (!overtimeDuration || overtimeDuration <= 0) {
                    Swal.fire({
                        icon: 'warning',
                        title: 'Invalid Duration',
                        text: 'Please enter a valid duration (greater than 0)',
                        confirmButtonColor: '#198754'
                    });
                    return;
                }

                // Get current user context
                const userId = window.currentOvertimeUserId;
                const userType = window.currentOvertimeUserType;

                if (!userId || !userType) {
                    Swal.fire({
                        icon: 'error',
                        title: 'User Context Not Found',
                        text: 'User context not found. Please go back to the attendance page and try again.',
                        confirmButtonColor: '#dc3545'
                    });
                    return;
                }

                // Prepare data for API
                const overtimeData = {
                    date: overtimeDate,
                    duration: parseFloat(overtimeDuration) * 60, // Convert hours to minutes
                    remark: overtimeRemarks || '',
                    status: 'approved'
                };

                // Add user_id or staff_id based on type
                if (userType === 'staff') {
                    overtimeData.user_id = parseInt(userId);
                } else if (userType === 'worker') {
                    overtimeData.staff_id = parseInt(userId);
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Invalid User Type',
                        text: 'Invalid user type. Please try again.',
                        confirmButtonColor: '#dc3545'
                    });
                    return;
                }

                console.log('Submitting overtime data:', overtimeData);

                // Call API to save overtime
                saveOvertimeRecord(overtimeData);
            });
        }

        // Edit overtime form submission
        const editOvertimeForm = document.getElementById('editOvertimeForm');
        if (editOvertimeForm) {
            editOvertimeForm.addEventListener('submit', function (e) {
                e.preventDefault();

                const overtimeId = document.getElementById('editOvertimeId').value;
                const overtimeDate = document.getElementById('editOvertimeDate').value;
                const overtimeDuration = document.getElementById('editOvertimeDuration').value;
                const overtimeRemarks = document.getElementById('editOvertimeRemarks').value;

                // Validate form
                if (!overtimeDate) {
                    Swal.fire({
                        icon: 'warning',
                        title: 'Missing Information',
                        text: 'Please select an overtime date',
                        confirmButtonColor: '#198754'
                    });
                    return;
                }

                if (!overtimeDuration || overtimeDuration <= 0) {
                    Swal.fire({
                        icon: 'warning',
                        title: 'Invalid Duration',
                        text: 'Please enter a valid duration (greater than 0)',
                        confirmButtonColor: '#198754'
                    });
                    return;
                }

                // Get current user context
                const userId = window.currentOvertimeUserId;
                const userType = window.currentOvertimeUserType;

                if (!userId || !userType) {
                    Swal.fire({
                        icon: 'error',
                        title: 'User Context Not Found',
                        text: 'User context not found. Please go back to the attendance page and try again.',
                        confirmButtonColor: '#dc3545'
                    });
                    return;
                }

                // Prepare data for API
                const overtimeData = {
                    id: parseInt(overtimeId),
                    date: overtimeDate,
                    duration: parseFloat(overtimeDuration) * 60, // Convert hours to minutes
                    remark: overtimeRemarks || ''
                };

                // Add user_id or staff_id based on type
                if (userType === 'staff') {
                    overtimeData.user_id = parseInt(userId);
                } else if (userType === 'worker') {
                    overtimeData.staff_id = parseInt(userId);
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Invalid User Type',
                        text: 'Invalid user type. Please try again.',
                        confirmButtonColor: '#dc3545'
                    });
                    return;
                }

                console.log('Updating overtime data:', overtimeData);

                // Call API to update overtime
                updateOvertimeRecordWithUI(overtimeData);
            });
        }
    });

})();
