// Leave Management - Navigation and Details Page
(function() {
    const API_BASE_URL = 'https://mwms.megacess.com/api/v1';
    
    // ===========================
    // NAVIGATION FUNCTIONS
    // ===========================
    
    // Navigate to worker leave details page
    function showWorkerLeaveModal(staffId, staffName, staffImage) {
        const params = new URLSearchParams({
            userId: staffId,
            userType: 'worker',
            userName: encodeURIComponent(staffName || 'Worker'),
            userImage: encodeURIComponent(staffImage || '')
        });
        window.location.href = `/megacessweb/pages/manage-leave-details.html?${params.toString()}`;
    }
    
    // Navigate to staff leave details page
    function showStaffLeaveModal(userId, staffName, staffImage) {
        const params = new URLSearchParams({
            userId: userId,
            userType: 'staff',
            userName: encodeURIComponent(staffName || 'Staff Member'),
            userImage: encodeURIComponent(staffImage || '')
        });
        window.location.href = `/megacessweb/pages/manage-leave-details.html?${params.toString()}`;
    }
    
    // Expose navigation functions globally
    window.showWorkerLeaveModal = showWorkerLeaveModal;
    window.showStaffLeaveModal = showStaffLeaveModal;
    
    // ===========================
    // LEAVE DETAILS PAGE LOGIC
    // ===========================
    
    // Only run details page logic if we're on the details page
    if (window.location.pathname.includes('manage-leave-details')) {
        
        // Get URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const userId = urlParams.get('userId');
        const userType = urlParams.get('userType');
        const userName = urlParams.get('userName') || 'User';
        const userImage = urlParams.get('userImage') || '';
        
        let filterYear = new Date().getFullYear().toString();
        let filterMonth = String(new Date().getMonth() + 1).padStart(2, '0');
        let filterType = '';
        
        // Pagination state
        let currentPage = 1;
        let totalPages = 1;
        let perPage = 15;
        let totalRecords = 0;
        
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
        
        // Initialize page
        function initializePage() {
            // Check if user data is available
            if (!userId || !userType) {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Missing user information. Redirecting back...',
                    confirmButtonColor: '#dc3545'
                }).then(() => {
                    window.location.href = '/megacessweb/pages/manage-attendance.html';
                });
                return;
            }
            
            // Set user info
            const userNameEl = document.getElementById('userName');
            const userTypeEl = document.getElementById('userType');
            
            if (!userNameEl || !userTypeEl) return;
            
            userNameEl.textContent = decodeURIComponent(userName);
            userTypeEl.textContent = userType === 'worker' ? 'Worker' : 'Staff Member';
            
            // Set user avatar
            const avatarEl = document.getElementById('userAvatar');
            if (!avatarEl) return;
            
            let cleanImageUrl = '';
            if (userImage && userImage !== 'null' && userImage !== 'undefined') {
                cleanImageUrl = decodeURIComponent(userImage);
                cleanImageUrl = cleanImageUrl.replace(/:\d+$/, '').trim();
                cleanImageUrl = cleanImageUrl.replace(/\.jpg:.*$/, '.jpg');
                cleanImageUrl = cleanImageUrl.replace(/\.png:.*$/, '.png');
                cleanImageUrl = cleanImageUrl.replace(/\.jpeg:.*$/, '.jpeg');
                cleanImageUrl = cleanImageUrl.replace(/\.gif:.*$/, '.gif');
                
                if (cleanImageUrl.length < 5 || cleanImageUrl.includes('null') || cleanImageUrl.includes('undefined')) {
                    cleanImageUrl = '';
                } else if (!cleanImageUrl.startsWith('http') && !cleanImageUrl.startsWith('/')) {
                    cleanImageUrl = `https://mwms.megacess.com/storage/${userType === 'worker' ? 'staff-images' : 'user-images'}/${cleanImageUrl}`;
                } else if (cleanImageUrl.startsWith('/')) {
                    cleanImageUrl = `https://mwms.megacess.com${cleanImageUrl}`;
                }
            }
            
            if (!cleanImageUrl) {
                cleanImageUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=0d6efd&color=fff&size=128&bold=true&rounded=true`;
            }
            avatarEl.src = cleanImageUrl;
            avatarEl.onerror = function() {
                this.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=0d6efd&color=fff&size=128&bold=true&rounded=true`;
            };
            
            // Populate year filter
            populateYearFilter();
            
            // Set current month
            const filterMonthEl = document.getElementById('filterMonth');
            if (filterMonthEl) {
                filterMonthEl.value = filterMonth;
            }
            
            // Load leave records
            loadLeaveRecords();
            
            // Event listeners
            const addLeaveBtn = document.getElementById('addLeaveBtn');
            const addLeaveForm = document.getElementById('addLeaveForm');
            const filterYearEl = document.getElementById('filterYear');
            const filterTypeEl = document.getElementById('filterType');
            
            if (addLeaveBtn) addLeaveBtn.addEventListener('click', showAddLeaveModal);
            if (addLeaveForm) addLeaveForm.addEventListener('submit', handleAddLeave);
            if (filterYearEl) {
                filterYearEl.addEventListener('change', (e) => {
                    filterYear = e.target.value;
                    currentPage = 1;
                    loadLeaveRecords();
                });
            }
            if (filterMonthEl) {
                filterMonthEl.addEventListener('change', (e) => {
                    filterMonth = e.target.value;
                    currentPage = 1;
                    loadLeaveRecords();
                });
            }
            if (filterTypeEl) {
                filterTypeEl.addEventListener('change', (e) => {
                    filterType = e.target.value;
                    currentPage = 1;
                    loadLeaveRecords();
                });
            }
        }
        
        // Populate year filter
        function populateYearFilter() {
            const yearSelect = document.getElementById('filterYear');
            const currentYear = new Date().getFullYear();
            yearSelect.innerHTML = '';
            
            for (let y = currentYear; y >= currentYear - 5; y--) {
                const option = document.createElement('option');
                option.value = y;
                option.textContent = y;
                if (y === currentYear) option.selected = true;
                yearSelect.appendChild(option);
            }
        }
        
        // Load leave records
        async function loadLeaveRecords() {
            const token = getAuthToken();
            if (!token) return;
            
            const listContainer = document.getElementById('leaveRecordsList');
            if (!listContainer) return;
            listContainer.innerHTML = `
                <div class="text-center py-5">
                    <div class="spinner-border text-success" role="status" style="width: 2.5rem; height: 2.5rem;">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <p class="mt-3 text-muted">Loading leave records...</p>
                </div>
            `;
            
            try {
                let apiEndpoint = userType === 'worker' ? 'staff-attendance' : 'user-attendance';
                const url = new URL(`${API_BASE_URL}/${apiEndpoint}/${userId}/leaves`);
                url.searchParams.append('month', `${filterYear}-${filterMonth}`);
                
                if (filterType) {
                    let apiType = filterType;
                    if (apiType === 'Sick Leave') apiType = 'sick_leave';
                    else if (apiType === 'Annual Leave') apiType = 'annual_leave';
                    else if (apiType === 'Unpaid Leave') apiType = 'unpaid_leave';
                    url.searchParams.append('status', apiType);
                }
                
                url.searchParams.append('page', currentPage);
                url.searchParams.append('per_page', perPage);
                
                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    }
                });
                
                const result = await response.json();
                
                if (result.success && result.data && Array.isArray(result.data.data)) {
                    totalRecords = result.data.total || 0;
                    currentPage = result.data.current_page || 1;
                    totalPages = result.data.last_page || 1;
                    
                    renderLeaveRecords(result.data.data);
                    renderPagination();
                } else {
                    listContainer.innerHTML = '<div class="text-center text-muted py-4">No leave records found.</div>';
                    renderPagination();
                }
            } catch (error) {
                console.error('Error loading leave records:', error);
                listContainer.innerHTML = '<div class="text-center text-danger py-4">Error loading leave records.</div>';
            }
        }
        
        // Render leave records
        function renderLeaveRecords(leaves) {
            const listContainer = document.getElementById('leaveRecordsList');
            
            if (!leaves || leaves.length === 0) {
                listContainer.innerHTML = '<div class="text-center text-muted py-4">No leave records found for the selected period.</div>';
                return;
            }
            
            let html = '<div class="row g-3">';
            
            leaves.forEach(leave => {
                const statusType = leave.type_of_leave || (leave.status ? leave.status.replace(/_/g, ' ') : 'Leave');
                const date = leave.date || leave.start_date || leave.from_date || '';
                const t = (statusType || '').toLowerCase();
                
                let color = '#6c757d';
                let icon = '';
                let label = statusType;
                
                if (t.includes('sick')) { 
                    color = '#009dc4'; 
                    icon = '<i class="bi bi-emoji-frown me-2"></i>'; 
                    label = 'Sick Leave'; 
                } else if (t.includes('annual')) { 
                    color = '#0c4b7f'; 
                    icon = '<i class="bi bi-calendar-heart me-2"></i>'; 
                    label = 'Annual Leave'; 
                } else if (t.includes('unpaid')) { 
                    color = '#dc3545'; 
                    icon = '<i class="bi bi-cash me-2"></i>'; 
                    label = 'Unpaid Leave'; 
                }
                
                html += `
                    <div class="col-12">
                        <div class="d-flex align-items-center" style="background: #fff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); border-left: 8px solid ${color}; min-height: 70px; padding: 12px;">
                            <div class="flex-grow-1 px-3">
                                <div class="fw-bold" style="font-size: 1.15rem; color: #333;">${date}</div>
                                <div class="text-muted small mt-1">${leave.remarks || leave.notes || 'No remarks'}</div>
                            </div>
                            <div class="px-3">
                                <button class="btn" style="background: ${color}; color: #fff; font-weight: 600; padding: 10px 24px; border-radius: 8px; font-size: 1rem; border: none;" onclick="window.showLeaveDetails(${JSON.stringify(leave).replace(/"/g, '&quot;')})">
                                    ${icon}${label}
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            });
            
            html += '</div>';
            listContainer.innerHTML = html;
        }
        
        // Render pagination controls
        function renderPagination() {
            const paginationContainer = document.getElementById('paginationControls');
            if (!paginationContainer) return;
            
            if (totalPages <= 1) {
                paginationContainer.innerHTML = '';
                return;
            }
            
            let html = '<div class="mt-3 text-center">';
            
            // Previous button
            html += `
                <button class="btn btn-sm btn-outline-success mx-1" ${currentPage === 1 ? 'disabled' : ''} onclick="window.goToPage(${currentPage - 1}); return false;">
                    <i class="bi bi-chevron-left"></i>
                </button>
            `;
            
            // Smart page buttons with ellipsis (max 7 buttons)
            let pages = [];
            if (totalPages <= 7) {
                // Show all pages if 7 or fewer
                pages = Array.from({ length: totalPages }, (_, i) => i + 1);
            } else {
                // Smart ellipsis logic
                if (currentPage <= 4) {
                    // Near start: [1] [2] [3] [4] [5] [...] [last]
                    pages = [1, 2, 3, 4, 5, '...', totalPages];
                } else if (currentPage >= totalPages - 3) {
                    // Near end: [1] [...] [last-4] [last-3] [last-2] [last-1] [last]
                    pages = [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
                } else {
                    // Middle: [1] [...] [current-1] [current] [current+1] [...] [last]
                    pages = [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
                }
            }
            
            // Render page buttons
            pages.forEach((page) => {
                if (page === '...') {
                    // Ellipsis (non-clickable)
                    html += '<button class="btn btn-sm btn-outline-success mx-1 disabled">...</button>';
                } else {
                    // Page button
                    const btnClass = page === currentPage ? 'btn-success' : 'btn-outline-success';
                    html += `<button class="btn btn-sm ${btnClass} mx-1" onclick="window.goToPage(${page}); return false;">${page}</button>`;
                }
            });
            
            // Next button
            html += `
                <button class="btn btn-sm btn-outline-success mx-1" ${currentPage === totalPages ? 'disabled' : ''} onclick="window.goToPage(${currentPage + 1}); return false;">
                    <i class="bi bi-chevron-right"></i>
                </button>
            `;
            
            html += '</div>';
            
            paginationContainer.innerHTML = html;
        }
        
        // Navigate to specific page
        window.goToPage = function(page) {
            if (page < 1 || page > totalPages) return;
            currentPage = page;
            loadLeaveRecords();
            document.getElementById('leaveRecordsList').scrollIntoView({ behavior: 'smooth', block: 'start' });
        };
        
        // Show add leave modal
        function showAddLeaveModal() {
            const modal = new bootstrap.Modal(document.getElementById('addLeaveModal'));
            document.getElementById('addLeaveForm').reset();
            modal.show();
        }
        
        // Handle add leave form submission
        async function handleAddLeave(e) {
            e.preventDefault();
            
            const leaveType = document.getElementById('leaveType').value;
            const fromDate = document.getElementById('leaveFromDate').value;
            const toDate = document.getElementById('leaveToDate').value;
            const notes = document.getElementById('leaveNotes').value;
            
            const token = getAuthToken();
            if (!token) return;
            
            try {
                let apiEndpoint = userType === 'worker' ? 'staff-attendance' : 'user-attendance';
                const idKey = userType === 'worker' ? 'staff_id' : 'user_id';
                
                const payload = {
                    [idKey]: userId,
                    from_date: fromDate,
                    to_date: toDate,
                    status: leaveType,
                    notes: notes
                };
                
                const response = await fetch(`${API_BASE_URL}/${apiEndpoint}/mark-leave`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });
                
                const result = await response.json();
                
                if (result.success) {
                    const modal = bootstrap.Modal.getInstance(document.getElementById('addLeaveModal'));
                    modal.hide();
                    
                    await Swal.fire({
                        icon: 'success',
                        title: 'Success!',
                        text: result.message || 'Leave added successfully',
                        confirmButtonColor: '#198754',
                        timer: 2000,
                        showConfirmButton: false
                    });
                    
                    currentPage = 1;
                    loadLeaveRecords();
                } else {
                    await Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: result.message || 'Failed to add leave',
                        confirmButtonColor: '#dc3545'
                    });
                }
            } catch (error) {
                console.error('Error adding leave:', error);
                await Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'An error occurred while adding the leave',
                    confirmButtonColor: '#dc3545'
                });
            }
        }
        
        // Show leave details modal
        window.showLeaveDetails = function(leave) {
            const modal = new bootstrap.Modal(document.getElementById('viewLeaveDetailsModal'));
            
            document.getElementById('detailLeaveType').textContent = leave.type_of_leave || leave.status || 'Leave';
            document.getElementById('detailCreatedBy').textContent = leave.created_by || '-';
            document.getElementById('detailCreatedAt').textContent = leave.created_at ? leave.created_at.split('T')[0] : leave.date || leave.start_date || '-';
            document.getElementById('detailStartDate').textContent = leave.start_date || leave.date || leave.from_date || '-';
            document.getElementById('detailEndDate').textContent = leave.end_date || leave.to_date || '-';
            document.getElementById('detailRemarks').textContent = leave.remarks || leave.notes || '-';
            
            modal.show();
        };
        
        // Initialize when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initializePage);
        } else {
            initializePage();
        }
    }
    
})();
