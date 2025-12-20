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
                <div class="spinner-border text-primary" role="status">
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
                <button class="btn btn-outline-danger btn-sm ms-3" onclick="window.fetchWorkerAttendanceList('${currentSearch}', 1, ${currentDateAttendanceId}, ${DEFAULT_PER_PAGE}, '${currentStatusFilter}')">
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
                        ${currentSearch ? `
                            <button class="btn btn-outline-primary" onclick="window.fetchWorkerAttendanceList('', 1, ${currentDateAttendanceId}, ${DEFAULT_PER_PAGE}, '${currentStatusFilter}')">
                                <i class="bi bi-x-circle me-1"></i>Clear Search
                            </button>
                        ` : ''}
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
                            <div class="d-flex justify-content-between align-items-start">
                                <div>
                                    <h6 class="mb-1 fw-semibold">${record.staff_name}</h6>
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
    // Display worker name, image, and leave records when Leave button is clicked
    window.showWorkerNameAsImage = async function(staffId) {
        const staffData = getCurrentStaffData(staffId);
        const workerName = staffData && staffData.staff_name ? staffData.staff_name : 'Worker';

        // Create a canvas and draw the name
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const width = 320;
        const height = 100;
        canvas.width = width;
        canvas.height = height;

        // Background
        ctx.fillStyle = '#f8f9fa';
        ctx.fillRect(0, 0, width, height);

        // Draw name
        ctx.font = 'bold 32px Arial';
        ctx.fillStyle = '#343a40';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(workerName, width / 2, height / 2);

        // Convert to image
        const dataUrl = canvas.toDataURL('image/png');

        // Get worker image (same logic as in renderAttendanceRecords)
        let workerImage = '';
        if (staffData && staffData.staff_img && typeof staffData.staff_img === 'string') {
            workerImage = staffData.staff_img.replace(/:\d+$/, '').trim();
            workerImage = workerImage.replace(/\.jpg:.*$/, '.jpg');
            workerImage = workerImage.replace(/\.png:.*$/, '.png');
            workerImage = workerImage.replace(/\.jpeg:.*$/, '.jpeg');
            workerImage = workerImage.replace(/\.gif:.*$/, '.gif');
            if (workerImage.length < 5 || workerImage.includes('null') || workerImage.includes('undefined') || workerImage.includes('…')) {
                workerImage = '';
            } else if (!workerImage.startsWith('http') && !workerImage.startsWith('/')) {
                workerImage = `https://mwms.megacess.com/storage/user-images/${workerImage}`;
            } else if (workerImage.startsWith('/')) {
                workerImage = `https://mwms.megacess.com${workerImage}`;
            }
        }
        const placeholderImage = `https://ui-avatars.com/api/?name=${encodeURIComponent(workerName)}&background=6c757d&color=fff&size=128&bold=true&rounded=true`;
        const imgSrc = (workerImage && workerImage.trim() !== '') ? workerImage : placeholderImage;

        // --- Filter State ---
        const now = new Date();
        let filterMonth = (now.getMonth() + 1).toString().padStart(2, '0');
        let filterYear = now.getFullYear().toString();
        let filterType = '';

        // Fetch leave records from API
        let leaves = [];
        let leaveTypes = new Set();
        let leaveHtml = '<div class="text-center text-muted">Loading leave records...</div>';
        try {
            const token = getAuthToken();
            const url = `${API_BASE_URL}/staff-attendance/${staffId}/leaves`;
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });
            if (response.ok) {
                const result = await response.json();
                if (result.success && result.data && result.data.data && Array.isArray(result.data.data)) {
                    leaves = result.data.data;
                    leaveTypes = new Set(leaves.map(l => l.type_of_leave).filter(Boolean));
                }
            }
        } catch (err) {}

        // Helper to filter leaves
        function filterLeaves(leavesArr, type, month, year) {
            return leavesArr.filter(leave => {
                // Parse date (format: DD-MM-YYYY)
                let [d, m, y] = (leave.date || '').split('-');
                let match = true;
                if (type && leave.type_of_leave !== type) match = false;
                if (month && m !== month) match = false;
                if (year && y !== year) match = false;
                return match;
            });
        }

        // Render filter UI
        function renderFilterUI() {
            // Restrict to only these leave types
            const allowedTypes = ['Annual Leave', 'Sick Leave', 'Unpaid Leave'];
            let typeOptions = `<option value="">All Types</option>`;
            allowedTypes.forEach(type => {
                typeOptions += `<option value="${type}"${filterType === type ? ' selected' : ''}>${type}</option>`;
            });
            // Month options
            const months = [
                '01','02','03','04','05','06','07','08','09','10','11','12'
            ];
            let monthOptions = '';
            months.forEach((m, idx) => {
                const label = new Date(2000, idx, 1).toLocaleString('en-US', { month: 'short' });
                monthOptions += `<option value="${m}"${filterMonth === m ? ' selected' : ''}>${label}</option>`;
            });
            // Year options
            let years = Array.from(new Set(leaves.map(l => (l.date || '').split('-')[2]).filter(Boolean)));
            if (!years.includes(filterYear)) years.push(filterYear);
            years = years.filter(Boolean).sort((a, b) => b - a);
            let yearOptions = '';
            years.forEach(y => {
                yearOptions += `<option value="${y}"${filterYear === y ? ' selected' : ''}>${y}</option>`;
            });
            return `
                <form id="leaveFilterForm" class="mb-3 d-flex flex-wrap gap-2 justify-content-center align-items-center">
                    <select id="leaveTypeFilter" class="form-select form-select-sm" style="max-width:120px;">
                        ${typeOptions}
                    </select>
                    <select id="leaveMonthFilter" class="form-select form-select-sm" style="max-width:100px;">
                        ${monthOptions}
                    </select>
                    <select id="leaveYearFilter" class="form-select form-select-sm" style="max-width:100px;">
                        ${yearOptions}
                    </select>
                </form>
            `;
        }

        // Render leave records
        function renderLeaveHtml() {
            const filtered = filterLeaves(leaves, filterType, filterMonth, filterYear);
            if (filtered.length === 0) {
                return '<div class="text-center text-muted">No leave records found.</div>';
            }
            return `<div class="mt-3"><h6 class="mb-2">Leave Records</h6><ul class="list-group">` +
                filtered.map(leave => `
                    <li class="list-group-item">
                        <div><strong>${leave.type_of_leave}</strong> <span class="text-muted">(${leave.date})</span></div>
                        <div class="small text-muted">${leave.remarks ? leave.remarks : ''}</div>
                        <div class="small">Created by: ${leave.created_by}</div>
                        <div class="small">Start: ${leave.start_date} | End: ${leave.end_date}</div>
                    </li>
                `).join('') + '</ul></div>';
        }

        // Show in a modal (create if not exists)
        let modal = document.getElementById('workerNameImageModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'workerNameImageModal';
            modal.style.position = 'fixed';
            modal.style.top = '0';
            modal.style.left = '0';
            modal.style.width = '100vw';
            modal.style.height = '100vh';
            modal.style.background = 'rgba(0,0,0,0.5)';
            modal.style.display = 'flex';
            modal.style.alignItems = 'center';
            modal.style.justifyContent = 'center';
            modal.style.zIndex = '9999';
            document.body.appendChild(modal);
        }
        // Render modal content
        function updateModalContent() {
            modal.innerHTML = `
                <div style="background:#fff;padding:24px 32px;border-radius:12px;box-shadow:0 2px 16px rgba(0,0,0,0.15);text-align:center;position:relative;max-width:400px;">
                    <img id="workerPhotoDisplay" src="${imgSrc}" alt="${workerName}" style="max-width:120px;max-height:120px;border-radius:50%;object-fit:cover;display:block;margin:0 auto 16px auto;border:2px solid #dee2e6;" onerror="if(this.src!=='${placeholderImage}'){this.src='${placeholderImage}';}">
                    <img id="workerNameImageDisplay" src="${dataUrl}" alt="${workerName}" style="max-width:100%;height:auto;display:block;margin:0 auto 16px auto;" />
                    <div id="leaveFilterContainer">${renderFilterUI()}</div>
                    <div id="workerLeaveRecords">${renderLeaveHtml()}</div>
                    <button id="closeWorkerNameImageModal" class="btn btn-secondary mt-3">Close</button>
                </div>
            `;
        }
        updateModalContent();
        modal.style.display = 'flex';

        // Add filter event listeners
        setTimeout(() => {
            const typeSel = modal.querySelector('#leaveTypeFilter');
            const monthSel = modal.querySelector('#leaveMonthFilter');
            const yearSel = modal.querySelector('#leaveYearFilter');
            if (typeSel) typeSel.onchange = function() { filterType = this.value; updateModalContent(); };
            if (monthSel) monthSel.onchange = function() { filterMonth = this.value; updateModalContent(); };
            if (yearSel) yearSel.onchange = function() { filterYear = this.value; updateModalContent(); };
            const closeBtn = modal.querySelector('#closeWorkerNameImageModal');
            if (closeBtn) closeBtn.onclick = function() { modal.style.display = 'none'; };
        }, 0);
    };
        
        // Create pagination
        const paginationHtml = createPaginationHtml(current_page, last_page, total, from, to, per_page);
        
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
                ${paginationHtml}
            </div>
        `;
    }
    
    // Create pagination HTML
    function createPaginationHtml(currentPage, lastPage, total, from, to, perPage) {
        if (lastPage <= 1) return '';
        
        let paginationItems = '';
        
        // Previous button
        paginationItems += `
            <li class="page-item ${currentPage <= 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="window.fetchWorkerAttendanceList('${currentSearch}', ${currentPage - 1}, ${currentDateAttendanceId}, ${DEFAULT_PER_PAGE}, '${currentStatusFilter}')">Previous</a>
            </li>
        `;
        
        // Page numbers
        const startPage = Math.max(1, currentPage - 2);
        const endPage = Math.min(lastPage, currentPage + 2);
        
        if (startPage > 1) {
            paginationItems += `<li class="page-item"><a class="page-link" href="#" onclick="window.fetchWorkerAttendanceList('${currentSearch}', 1, ${currentDateAttendanceId}, ${DEFAULT_PER_PAGE}, '${currentStatusFilter}')">1</a></li>`;
            if (startPage > 2) {
                paginationItems += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
            }
        }
        
        for (let i = startPage; i <= endPage; i++) {
            paginationItems += `
                <li class="page-item ${i === currentPage ? 'active' : ''}">
                    <a class="page-link" href="#" onclick="window.fetchWorkerAttendanceList('${currentSearch}', ${i}, ${currentDateAttendanceId}, ${DEFAULT_PER_PAGE}, '${currentStatusFilter}')">${i}</a>
                </li>
            `;
        }
        
        if (endPage < lastPage) {
            if (endPage < lastPage - 1) {
                paginationItems += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
            }
            paginationItems += `<li class="page-item"><a class="page-link" href="#" onclick="window.fetchWorkerAttendanceList('${currentSearch}', ${lastPage}, ${currentDateAttendanceId}, ${DEFAULT_PER_PAGE}, '${currentStatusFilter}')">${lastPage}</a></li>`;
        }
        
        // Next button
        paginationItems += `
            <li class="page-item ${currentPage >= lastPage ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="window.fetchWorkerAttendanceList('${currentSearch}', ${currentPage + 1}, ${currentDateAttendanceId}, ${DEFAULT_PER_PAGE}, '${currentStatusFilter}')">Next</a>
            </li>
        `;
        
        return `
            <div class="card-footer">
                <nav aria-label="Attendance pagination">
                    <ul class="pagination pagination-sm justify-content-center mb-0">
                        ${paginationItems}
                    </ul>
                </nav>
            </div>
        `;
    }
    
    // Main fetch function
    async function fetchWorkerAttendanceList(search = '', page = 1, dateAttendanceId = 1, perPage = DEFAULT_PER_PAGE, statusFilter = 'all') {
        console.log('fetchWorkerAttendanceList called with:', { search, page, dateAttendanceId, perPage, statusFilter });
        console.log('workersAttendanceView element:', workersAttendanceView);
        
        if (!workersAttendanceView) {
            console.error('workersAttendanceView not found!');
            return;
        }
        
        currentSearch = search;
        currentPage = page;
        currentDateAttendanceId = dateAttendanceId;
        currentStatusFilter = statusFilter;
        
        console.log('Showing loading state...');
        showLoading();
        
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
            
            console.log('Fetching worker attendance from:', url.toString());
            console.log('Search parameters:', params);
            console.log('Auth token:', getAuthToken() ? 'Present' : 'Missing');
            
            const response = await fetch(url, {
                method: 'GET',
                headers
            });
            
            console.log('Response status:', response.status);
            console.log('Response ok:', response.ok);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Error response:', errorText);
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            console.log('API Response:', result);
            
            if (result.success && result.data) {
                // Apply client-side filtering as fallback if API doesn't filter properly
                let filteredData = result.data;
                
                // If we have a search term but got all records, filter client-side
                if (search && search.trim() && filteredData.data && Array.isArray(filteredData.data)) {
                    const searchTerm = search.trim().toLowerCase();
                    console.log('Applying client-side search filter for:', searchTerm);
                    
                    filteredData.data = filteredData.data.filter(record => {
                        return record.staff_name && record.staff_name.toLowerCase().includes(searchTerm);
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
                
                renderAttendanceRecords(filteredData);
            } else {
                showError(result.message || 'Failed to load attendance records');
            }
            
        } catch (error) {
            console.error('Error fetching worker attendance:', error);
            showError(error.message || 'Failed to connect to the server. Please try again.');
        }
    }
    
    // Helper function to convert date to date_attendance_id
    function getDateAttendanceId(dateString) {
        if (!dateString) return 1;
        
        // For now, we'll use a simple mapping
        // In a real application, you might need to call an API to get the proper ID
        // or implement a more sophisticated mapping based on your system's requirements
        
        try {
            const date = new Date(dateString);
            // Simple hash-like function to generate consistent IDs
            // This is a placeholder - adjust based on your actual API requirements
            const year = date.getFullYear();
            const month = date.getMonth() + 1; // 0-based month
            const day = date.getDate();
            
            // Create a simple ID based on date components
            // You may need to replace this with actual API logic
            return parseInt(`${year}${month.toString().padStart(2, '0')}${day.toString().padStart(2, '0')}`) % 1000 || 1;
        } catch (error) {
            console.warn('Error parsing date:', dateString, error);
            return 1;
        }
    }
    
    // Global functions for attendance actions
    window.viewAttendanceDetails = function(staffId) {
        // Call the global function defined in manage-attendance.html to show details modal
        if (typeof window.viewAttendanceDetails === 'function' && window.viewAttendanceDetails !== arguments.callee) {
            window.viewAttendanceDetails(staffId);
        } else {
            alert('Attendance details feature will be implemented');
        }
    };
    
    window.markOvertime = function(staffId) {
        console.log('Mark overtime for staff ID:', staffId);
        
        // Find the record data for this staff member
        // This is a simple approach - in a real app, you might store the data differently
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
            
            // Show the overtime modal with user data
            window.showOvertimeModal(
                staffId, 
                staffData.staff_name || 'Worker', 
                'Worker', 
                cleanImageUrl, 
                'worker'
            );
        } else {
            // Fallback if data not found
            window.showOvertimeModal(staffId, 'Worker', 'Worker', '', 'worker');
        }
    };

    // Helper function to get current staff data
    function getCurrentStaffData(staffId) {
        // Find the record in the current data
        return currentRecordsData.find(record => record.staff_id == staffId) || null;
    }
    
    // Helper function to get current worker data (alias for getCurrentStaffData)
    function getCurrentWorkerData(staffId) {
        console.log('getCurrentWorkerData called with staffId:', staffId);
        console.log('Available records:', currentRecordsData.length);
        
        // Find the record in the current data
        const worker = currentRecordsData.find(record => record.staff_id == staffId);
        console.log('Found worker data:', worker);
        return worker || null;
    }
    
    // Expose main function globally so it can be called from manage-attendance.html
    window.fetchWorkerAttendanceList = fetchWorkerAttendanceList;
    
    // Initialize on page load if we're on the right page
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            if (workersAttendanceView) {
                fetchWorkerAttendanceList();
            }
        });
    } else {
        if (workersAttendanceView) {
            fetchWorkerAttendanceList();
        }
    }
    
})();