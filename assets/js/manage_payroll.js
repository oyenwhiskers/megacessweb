document.addEventListener('DOMContentLoaded', function() {
    // Tab functionality
    const workerTab = document.getElementById('workerTab');
    const staffTab = document.getElementById('staffTab');
    const workerList = document.getElementById('workerList');
    const staffList = document.getElementById('staffList');
    const searchInput = document.getElementById('searchInput');
    const workerContainer = document.getElementById('workerContainer');
    const roleFilterContainer = document.getElementById('roleFilterContainer');
    
    // Role filter buttons
    const roleFilterButtons = {
        all: document.getElementById('roleFilterAll'),
        mandor: document.getElementById('roleFilterMandor'),
        checker: document.getElementById('roleFilterChecker'),
        admin: document.getElementById('roleFilterAdmin')
    };
    
    // Current selected role
    let currentRole = 'all';

    // Helper function to set active role filter button
    function setActiveRoleFilter(role) {
        currentRole = role;
        
        // Reset all buttons to inactive state
        Object.values(roleFilterButtons).forEach(button => {
            if (button) {
                button.classList.remove('btn-success');
                button.classList.add('btn-outline-secondary');
            }
        });
        
        // Set the selected button to active state
        if (roleFilterButtons[role]) {
            roleFilterButtons[role].classList.remove('btn-outline-secondary');
            roleFilterButtons[role].classList.add('btn-success');
        }
    }

    // Store fetched data
    let workersData = [];
    let allWorkersData = []; // Store all workers for client-side pagination
    let staffData = [];
    let allStaffData = []; // Store all staff for client-side pagination
    
    // Pagination variables
    let currentPage = 1;
    let itemsPerPage = 10;
    let totalItems = 0;
    let totalPages = 0;

    // API Configuration
    const API_BASE_URL = 'https://mwms.megacess.com/api/v1/payroll';
    // Get token from localStorage (matches login.js token storage)
    const AUTH_TOKEN = localStorage.getItem('authToken') || sessionStorage.getItem('authToken') || null;

    // Fetch workers data
    async function fetchWorkers(searchTerm = '', page = 1) {
        try {
            // Check if token exists
            if (!AUTH_TOKEN) {
                showError('Authentication required. Please log in first.');
                return;
            }

            // If we have all data and this is just pagination/search, use client-side
            if (allWorkersData.length > 0 && !searchTerm) {
                handleClientSidePagination('', page);
                return;
            }

            showLoading(true);
            const url = new URL(`${API_BASE_URL}/staff`);
            
            // For initial load, don't send pagination params to get all data
            if (searchTerm) {
                url.searchParams.append('search', searchTerm);
            }

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${AUTH_TOKEN}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });

            if (response.status === 401) {
                // Handle unauthorized access
                showError('Session expired. Please log in again.');
                return;
            }

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            
            // Handle different API response structures
            let allData = [];
            if (result.data && Array.isArray(result.data)) {
                allData = result.data;
                
                // Store all data for client-side pagination
                if (!searchTerm) {
                    allWorkersData = allData;
                }
                
                // Always use client-side pagination for consistent behavior
                handleClientSidePagination(searchTerm, page, allData);
            } else {
                workersData = [];
                totalItems = 0;
                currentPage = 1;
                totalPages = 1;
                renderWorkers(workersData);
                updatePagination();
            }
            
            showLoading(false);
        } catch (error) {
            console.error('Error fetching workers:', error);
            
            if (error.message.includes('fetch')) {
                showError('Network error. Please check your connection and try again.');
            } else {
                showError('Failed to load workers data. Please try again.');
            }
            
            showLoading(false);
        }
    }

    // Handle client-side pagination
    function handleClientSidePagination(searchTerm = '', page = 1, dataSource = null) {
        let sourceData = dataSource || allWorkersData;
        let filteredData = sourceData;
        
        // Filter data for search if search term exists
        if (searchTerm) {
            filteredData = sourceData.filter(worker => 
                worker.staff_fullname.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (worker.staff_phone && worker.staff_phone.includes(searchTerm))
            );
        }
        
        // Calculate pagination
        totalItems = filteredData.length;
        totalPages = Math.ceil(totalItems / itemsPerPage);
        currentPage = Math.min(page, totalPages) || 1;
        
        // Get only the items for current page (exactly 10 items)
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        workersData = filteredData.slice(startIndex, endIndex);
        
        renderWorkers(workersData);
        updatePagination();
    }

    // Go to specific page
    window.goToPage = function(page) {
        if (page < 1 || page > totalPages || page === currentPage) return;
        
        const searchTerm = searchInput.value.trim();
        
        // Check which tab is active
        if (workerTab.classList.contains('btn-success')) {
            handleClientSidePagination(searchTerm, page, allWorkersData);
        } else {
            handleStaffClientSidePagination(searchTerm, page, allStaffData, currentRole);
        }
    };

    // Fetch staff data
    async function fetchStaff(searchTerm = '', page = 1, role = 'all') {
        try {
            // Check if token exists
            if (!AUTH_TOKEN) {
                showError('Authentication required. Please log in first.');
                return;
            }

            // If we have all data and this is just pagination/search, use client-side
            if (allStaffData.length > 0 && !searchTerm && role === 'all') {
                handleStaffClientSidePagination('', page);
                return;
            }

            showLoading(true);
            const url = new URL(`${API_BASE_URL}/users`);
            
            // Add parameters
            if (searchTerm) {
                url.searchParams.append('search', searchTerm);
            }
            if (role && role !== 'all') {
                url.searchParams.append('role', role);
            }

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${AUTH_TOKEN}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });

            if (response.status === 401) {
                showError('Session expired. Please log in again.');
                return;
            }

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            
            // Handle API response
            let allData = [];
            if (result.data && Array.isArray(result.data)) {
                allData = result.data;
                
                // Store all data for client-side pagination
                if (!searchTerm && role === 'all') {
                    allStaffData = allData;
                }
                
                // Always use client-side pagination for consistent behavior
                handleStaffClientSidePagination(searchTerm, page, allData, role);
            } else {
                staffData = [];
                totalItems = 0;
                currentPage = 1;
                totalPages = 1;
                renderStaff(staffData);
                updatePagination();
            }
            
            showLoading(false);
        } catch (error) {
            console.error('Error fetching staff:', error);
            
            if (error.message.includes('fetch')) {
                showError('Network error. Please check your connection and try again.');
            } else {
                showError('Failed to load staff data. Please try again.');
            }
            
            showLoading(false);
        }
    }

    // Handle staff client-side pagination
    function handleStaffClientSidePagination(searchTerm = '', page = 1, dataSource = null, role = 'all') {
        let sourceData = dataSource || allStaffData;
        let filteredData = sourceData;
        
        // Filter by role first if not 'all'
        if (role && role !== 'all') {
            filteredData = sourceData.filter(staff => staff.user_role === role);
        }
        
        // Filter data for search if search term exists
        if (searchTerm) {
            filteredData = filteredData.filter(staff => 
                staff.user_fullname.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (staff.user_nickname && staff.user_nickname.toLowerCase().includes(searchTerm.toLowerCase()))
            );
        }
        
        // Calculate pagination
        totalItems = filteredData.length;
        totalPages = Math.ceil(totalItems / itemsPerPage);
        currentPage = Math.min(page, totalPages) || 1;
        
        // Get only the items for current page (exactly 10 items)
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        staffData = filteredData.slice(startIndex, endIndex);
        
        renderStaff(staffData);
        updatePagination();
    }

    // Update pagination controls
    function updatePagination() {
        const paginationContainer = document.getElementById('paginationContainer');
        const paginationInfo = document.getElementById('paginationInfo');
        const paginationControls = document.getElementById('paginationControls');
        
        // Show/hide pagination based on total pages
        if (totalPages <= 1) {
            paginationContainer.style.display = 'none';
            return;
        }
        
        paginationContainer.style.display = 'block';
        
        // Update pagination info
        const startItem = (currentPage - 1) * itemsPerPage + 1;
        const endItem = Math.min(currentPage * itemsPerPage, totalItems);
        const itemType = workerTab.classList.contains('btn-success') ? 'workers' : 'staff';
        paginationInfo.textContent = `Showing ${startItem} - ${endItem} of ${totalItems} ${itemType}`;
        
        // Generate pagination controls
        let paginationHTML = '';
        
        // Previous button
        const prevDisabled = currentPage <= 1 ? 'disabled' : '';
        paginationHTML += `
            <li class="page-item ${prevDisabled}">
                <button class="page-link" onclick="goToPage(${currentPage - 1})" ${prevDisabled}>
                    <i class="bi bi-chevron-left"></i>
                </button>
            </li>
        `;
        
        // Page numbers
        const maxVisiblePages = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
        
        // Adjust start page if we're near the end
        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }
        
        // First page if not in range
        if (startPage > 1) {
            paginationHTML += `<li class="page-item"><button class="page-link" onclick="goToPage(1)">1</button></li>`;
            if (startPage > 2) {
                paginationHTML += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
            }
        }
        
        // Page numbers in range
        for (let i = startPage; i <= endPage; i++) {
            const activeClass = i === currentPage ? 'active' : '';
            paginationHTML += `
                <li class="page-item ${activeClass}">
                    <button class="page-link" onclick="goToPage(${i})">${i}</button>
                </li>
            `;
        }
        
        // Last page if not in range
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                paginationHTML += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
            }
            paginationHTML += `<li class="page-item"><button class="page-link" onclick="goToPage(${totalPages})">${totalPages}</button></li>`;
        }
        
        // Next button
        const nextDisabled = currentPage >= totalPages ? 'disabled' : '';
        paginationHTML += `
            <li class="page-item ${nextDisabled}">
                <button class="page-link" onclick="goToPage(${currentPage + 1})" ${nextDisabled}>
                    <i class="bi bi-chevron-right"></i>
                </button>
            </li>
        `;
        
        paginationControls.innerHTML = paginationHTML;
    }

    // Render workers list
    function renderWorkers(workers) {
        if (workers.length === 0) {
            workerContainer.innerHTML = `
                <div class="text-center py-5">
                    <i class="bi bi-person-workspace display-1 text-muted"></i>
                    <h4 class="text-muted mt-3">No workers found</h4>
                    <p class="text-muted">No workers match your search criteria.</p>
                </div>
            `;
            return;
        }

        const workersHTML = workers.map(worker => createWorkerCard(worker)).join('');
        workerContainer.innerHTML = workersHTML;
    }

    // Create worker card HTML
    function createWorkerCard(worker) {
        // Handle image path properly using the provided logic
        let workerImage = worker.staff_img || '';
        
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

        const avatarImage = workerImage 
            ? `<img src="${workerImage}" alt="${worker.staff_fullname}" class="rounded-circle" 
                    style="width: 50px; height: 50px; object-fit: cover;" 
                    onerror="this.outerHTML='<div class=&quot;bg-dark rounded-circle d-flex align-items-center justify-content-center&quot; style=&quot;width: 50px; height: 50px;&quot;><i class=&quot;bi bi-person text-white&quot;></i></div>';">`
            : `<div class="bg-dark rounded-circle d-flex align-items-center justify-content-center" style="width: 50px; height: 50px;">
                 <i class="bi bi-person text-white"></i>
               </div>`;

        return `
            <div class="worker-card mb-3 p-3 bg-white rounded border d-flex align-items-center justify-content-between" data-worker-id="${worker.id}">
                <div class="d-flex align-items-center gap-3">
                    <div class="worker-avatar">
                        ${avatarImage}
                    </div>
                    <div class="worker-info">
                        <h5 class="mb-0 fw-semibold">${worker.staff_fullname}</h5>
                        <p class="mb-0 text-muted">
                            Worker • Joined ${worker.joined_since} • ${worker.payslips_count} payslips
                        </p>
                        ${worker.staff_phone ? `<small class="text-muted">${worker.staff_phone}</small>` : ''}
                    </div>
                </div>
                <div class="payroll-action">
                    <button class="btn btn-primary btn-sm d-flex align-items-center gap-2" data-worker-id="${worker.id}">
                        <i class="bi bi-calculator"></i>
                        Payroll
                    </button>
                </div>
            </div>
        `;
    }

    // Render staff list
    function renderStaff(staff) {
        const staffContainer = document.querySelector('#staffList .col-12');
        
        if (staff.length === 0) {
            staffContainer.innerHTML = `
                <div class="text-center py-5">
                    <i class="bi bi-person-badge display-1 text-muted"></i>
                    <h4 class="text-muted mt-3">No staff found</h4>
                    <p class="text-muted">No staff match your search criteria.</p>
                </div>
            `;
            return;
        }

        const staffHTML = staff.map(member => createStaffCard(member)).join('');
        staffContainer.innerHTML = staffHTML;
    }

    // Create staff card HTML
    function createStaffCard(staff) {
        // Handle image path properly
        let staffImage = staff.user_img || '';
        
        // Check if the cleaned URL is still valid
        if (staffImage.length < 5 || staffImage.includes('null') || staffImage.includes('undefined') || staffImage.includes('…')) {
            staffImage = '';
        } else if (!staffImage.startsWith('http') && !staffImage.startsWith('/')) {
            // Construct full URL if it's just a filename
            staffImage = `https://mwms.megacess.com/storage/user-images/${staffImage}`;
        } else if (staffImage.startsWith('/')) {
            // Add domain if it starts with /
            staffImage = `https://mwms.megacess.com${staffImage}`;
        }

        const avatarImage = staffImage 
            ? `<img src="${staffImage}" alt="${staff.user_fullname}" class="rounded-circle" 
                    style="width: 50px; height: 50px; object-fit: cover;" 
                    onerror="this.outerHTML='<div class=&quot;bg-primary rounded-circle d-flex align-items-center justify-content-center&quot; style=&quot;width: 50px; height: 50px;&quot;><i class=&quot;bi bi-person text-white&quot;></i></div>';">`
            : `<div class="bg-primary rounded-circle d-flex align-items-center justify-content-center" style="width: 50px; height: 50px;">
                 <i class="bi bi-person text-white"></i>
               </div>`;

        const baseSalary = staff.base_salary ? `RM${staff.base_salary.base_salary}` : 'Not set';
        const roleCapitalized = staff.user_role.charAt(0).toUpperCase() + staff.user_role.slice(1);

        return `
            <div class="worker-card mb-3 p-3 bg-white rounded border d-flex align-items-center justify-content-between" data-staff-id="${staff.id}">
                <div class="d-flex align-items-center gap-3">
                    <div class="worker-avatar">
                        ${avatarImage}
                    </div>
                    <div class="worker-info">
                        <h5 class="mb-0 fw-semibold">${staff.user_fullname}</h5>
                        <p class="mb-0 text-muted">
                            ${roleCapitalized} • Joined ${staff.joined_since} • ${staff.payslips_count} payslips
                        </p>
                        <small class="text-muted">Base Salary: ${baseSalary}</small>
                        ${staff.user_nickname ? `<small class="text-muted d-block">Nickname: ${staff.user_nickname}</small>` : ''}
                    </div>
                </div>
                <div class="payroll-action">
                    <button class="btn btn-primary btn-sm d-flex align-items-center gap-2" data-staff-id="${staff.id}">
                        <i class="bi bi-calculator"></i>
                        Payroll
                    </button>
                </div>
            </div>
        `;
    }

    // Show/hide loading state
    function showLoading(show) {
        if (show) {
            // Show loading based on active tab
            if (workerTab.classList.contains('btn-success')) {
                // Worker tab is active - show loading in worker container
                workerContainer.innerHTML = `
                    <div class="text-center py-5">
                        <div class="spinner-border text-success" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                        <p class="mt-2 text-muted">Loading workers...</p>
                    </div>
                `;
            } else {
                // Staff tab is active - show loading in staff container
                const staffContainer = document.querySelector('#staffList .col-12');
                staffContainer.innerHTML = `
                    <div class="text-center py-5">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                        <p class="mt-2 text-muted">Loading staff...</p>
                    </div>
                `;
            }
        } else {
            // Loading is done - content will be populated by render functions
            // No need to hide anything as renderWorkers/renderStaff will replace content
        }
    }

    // Show error message
    function showError(message) {
        const activeContainer = workerTab.classList.contains('btn-success') ? workerContainer : document.querySelector('#staffList .col-12');
        
        activeContainer.innerHTML = `
            <div class="text-center py-5">
                <i class="bi bi-exclamation-triangle display-1 text-warning"></i>
                <h4 class="text-muted mt-3">Error</h4>
                <p class="text-muted">${message}</p>
                <div class="d-flex gap-2 justify-content-center mt-3">
                    <button class="btn btn-outline-primary btn-sm" onclick="location.reload()">
                        <i class="bi bi-arrow-clockwise"></i> Retry
                    </button>
                    ${!AUTH_TOKEN ? `
                        <button class="btn btn-primary btn-sm" onclick="redirectToLogin()">
                            <i class="bi bi-box-arrow-in-right"></i> Login
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }

    // Redirect to login function
    window.redirectToLogin = function() {
        window.location.href = '/megacessweb/pages/log-in.html';
    };

    // Helper function to set auth token (for testing)
    window.setAuthToken = function(token) {
        localStorage.setItem('authToken', token);
        location.reload();
    };

    // Helper function to clear auth token
    window.clearAuthToken = function() {
        localStorage.removeItem('authToken');
        sessionStorage.removeItem('authToken');
        location.reload();
    };

    // Helper function to test staff API (for debugging)
    window.testStaffAPI = async function(staffId) {
        try {
            console.log('Testing staff API for ID:', staffId);
            const result = await fetchStaffPayrollOverview(staffId);
            console.log('Staff API result:', result);
            return result;
        } catch (error) {
            console.error('Staff API test failed:', error);
            return null;
        }
    };;

    // Search functionality with debouncing
    let searchTimeout;
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.trim();
        
        // Clear previous timeout
        clearTimeout(searchTimeout);
        
        // Set new timeout for debounced search
        searchTimeout = setTimeout(() => {
            // Reset to page 1 when searching
            currentPage = 1;
            
            if (workerTab.classList.contains('btn-success')) {
                // Currently on workers tab - use client-side pagination if we have data
                if (allWorkersData.length > 0) {
                    handleClientSidePagination(searchTerm, 1);
                } else {
                    // No data yet, fetch from API
                    fetchWorkers(searchTerm, 1);
                }
            } else {
                // Currently on staff tab - use client-side pagination if we have data
                if (allStaffData.length > 0) {
                    handleStaffClientSidePagination(searchTerm, 1, allStaffData, currentRole);
                } else {
                    // No data yet, fetch from API
                    fetchStaff(searchTerm, 1, currentRole);
                }
            }
        }, 300); // 300ms delay
    });

    // Role filter functionality
    Object.entries(roleFilterButtons).forEach(([role, button]) => {
        if (button) {
            button.addEventListener('click', function() {
                const selectedRole = this.getAttribute('data-role');
                const searchTerm = searchInput.value.trim();
                
                // Update active button state
                setActiveRoleFilter(selectedRole);
                
                // Reset to page 1 when filtering
                currentPage = 1;
                
                // Only handle this for staff tab
                if (staffTab.classList.contains('btn-success')) {
                    if (allStaffData.length > 0) {
                        handleStaffClientSidePagination(searchTerm, 1, allStaffData, selectedRole);
                    } else {
                        fetchStaff(searchTerm, 1, selectedRole);
                    }
                }
            });
        }
    });

    // Switch to Worker tab
    workerTab.addEventListener('click', function() {
        workerTab.classList.remove('btn-outline-secondary');
        workerTab.classList.add('btn-success');
        staffTab.classList.remove('btn-success');
        staffTab.classList.add('btn-outline-secondary');
        
        workerList.classList.remove('d-none');
        staffList.classList.add('d-none');
        
        // Hide role filter for worker tab
        if (roleFilterContainer) {
            roleFilterContainer.style.display = 'none';
        }
        
        searchInput.placeholder = 'search name...';
        document.querySelector('.row.mb-3 h3').textContent = 'List of existing worker:';
        
        // Reset pagination and load workers data
        currentPage = 1;
        const searchTerm = searchInput.value.trim();
        
        // Use client-side pagination if we have data, otherwise fetch from API
        if (allWorkersData.length > 0) {
            handleClientSidePagination(searchTerm, 1);
        } else {
            fetchWorkers(searchTerm, 1);
        }
    });

    // Switch to Staff tab
    staffTab.addEventListener('click', function() {
        staffTab.classList.remove('btn-outline-secondary');
        staffTab.classList.add('btn-success');
        workerTab.classList.remove('btn-success');
        workerTab.classList.add('btn-outline-secondary');
        
        staffList.classList.remove('d-none');
        workerList.classList.add('d-none');
        
        // Show role filter for staff tab
        if (roleFilterContainer) {
            roleFilterContainer.style.display = 'block';
            // Reset to "All" when switching to staff tab
            setActiveRoleFilter('all');
        }
        
        searchInput.placeholder = 'search staff name...';
        document.querySelector('.row.mb-3 h3').textContent = 'List of existing staff:';
        
        // Reset pagination and load staff data
        currentPage = 1;
        const searchTerm = searchInput.value.trim();
        
        // Use client-side pagination if we have data, otherwise fetch from API
        if (allStaffData.length > 0) {
            handleStaffClientSidePagination(searchTerm, 1, allStaffData, currentRole);
        } else {
            fetchStaff(searchTerm, 1, currentRole);
        }
    });

    // Show Employment Overview
    async function showEmploymentOverview(employeeData, isWorker = true) {
        const container = document.querySelector('.container-fluid');
        
        // Show loading first
        container.innerHTML = `
            <div class="text-center py-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-2 text-muted">Loading employment overview...</p>
            </div>
        `;
        
        try {
            // Fetch real payroll data for both workers and staff
            let realEmployeeData = employeeData;
            let payslipsData = [];
            let baseSalary = null;
            
            if (isWorker) {
                const overviewData = await fetchWorkerPayrollOverview(employeeData.id);
                if (overviewData) {
                    // Update employee data with real API data
                    realEmployeeData = {
                        id: overviewData.staff.id,
                        name: overviewData.staff.staff_fullname,
                        joinedSince: overviewData.staff.joined_since,
                        role: 'Worker',
                        age: overviewData.staff.age
                    };
                    payslipsData = overviewData.payslips || [];
                }
            } else {
                // Fetch staff payroll data
                const overviewData = await fetchStaffPayrollOverview(employeeData.id);
                
                if (overviewData) {
                    // Update employee data with real API data
                    realEmployeeData = {
                        id: overviewData.user.id,
                        name: overviewData.user.user_fullname,
                        joinedSince: overviewData.user.joined_since,
                        role: overviewData.user.user_role.charAt(0).toUpperCase() + overviewData.user.user_role.slice(1),
                        age: overviewData.user.age,
                        nickname: overviewData.user.user_nickname
                    };
                    payslipsData = overviewData.payslips || [];
                    baseSalary = overviewData.base_salary;
                }
            }
            
            // Create the employment overview HTML
            const overviewHTML = `
                <div id="employmentOverview" class="employment-overview">
                    <div class="d-flex align-items-center justify-content-between mb-4">
                        <div class="d-flex align-items-center gap-3">
                            <button class="btn btn-outline-secondary btn-sm" id="backToList">
                                <i class="bi bi-arrow-left"></i> Employment Overview
                            </button>
                        </div>
                        <button class="btn btn-primary d-flex align-items-center gap-2" id="generatePayslip">
                            <i class="bi bi-plus-circle"></i>
                            Generate Payslip
                        </button>
                    </div>
                    
                    <div class="card shadow-sm">
                        <div class="card-body p-4">
                            <h3 class="mb-4">Name: ${realEmployeeData.name}${realEmployeeData.nickname ? ` (${realEmployeeData.nickname})` : ''}</h3>
                            
                            <div class="row mb-4">
                                <div class="col-md-4">
                                    <div class="info-card bg-light-green rounded p-3 text-center">
                                        <div class="fw-semibold text-success mb-1">Joined Since</div>
                                        <div class="h6 mb-0">${realEmployeeData.joinedSince}</div>
                                    </div>
                                </div>
                                <div class="col-md-4">
                                    <div class="info-card bg-light-green rounded p-3 text-center">
                                        <div class="fw-semibold text-success mb-1">Role</div>
                                        <div class="h6 mb-0">${realEmployeeData.role}</div>
                                    </div>
                                </div>
                                <div class="col-md-4">
                                    <div class="info-card bg-light-green rounded p-3 text-center">
                                        <div class="fw-semibold text-success mb-1">Age</div>
                                        <div class="h6 mb-0">${realEmployeeData.age || 'N/A'}</div>
                                    </div>
                                </div>
                            </div>
                            
                            <h4 class="mb-3">Payslip Record:</h4>
                            
                            <div class="payslip-records" id="payslipRecords">
                                ${generatePayslipRecordsFromAPI(payslipsData)}
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Show the employment overview
            container.innerHTML = overviewHTML;
            
            // Add event listener for back button
            document.getElementById('backToList').addEventListener('click', function() {
                location.reload(); // Simple way to go back to the list
            });
            
            // Add event listener for generate payslip button
            document.getElementById('generatePayslip').addEventListener('click', function() {
                generateNewPayslip(realEmployeeData.id, isWorker);
            });
            
            // Add event listeners for payslip view buttons
            document.addEventListener('click', function(e) {
                if (e.target.closest('[data-payslip-id]')) {
                    const button = e.target.closest('[data-payslip-id]');
                    const payslipId = button.getAttribute('data-payslip-id');
                    viewPayslip(payslipId);
                }
            });
            
        } catch (error) {
            console.error('Error loading employment overview:', error);
            container.innerHTML = `
                <div class="text-center py-5">
                    <i class="bi bi-exclamation-triangle display-1 text-warning"></i>
                    <h4 class="text-muted mt-3">Error Loading Data</h4>
                    <p class="text-muted">Failed to load employment overview. Please try again.</p>
                    <button class="btn btn-primary btn-sm" onclick="location.reload()">
                        <i class="bi bi-arrow-clockwise"></i> Retry
                    </button>
                </div>
            `;
        }
    }
    
    // Fetch worker payroll overview data
    async function fetchWorkerPayrollOverview(workerId) {
        try {
            if (!AUTH_TOKEN) {
                throw new Error('Authentication required');
            }

            const url = new URL(`${API_BASE_URL}/staff/${workerId}/overview`);
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${AUTH_TOKEN}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });

            if (response.status === 401) {
                throw new Error('Session expired');
            }

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            
            if (result.data) {
                return result.data;
            }
            
            return null;
        } catch (error) {
            console.error('Error fetching worker payroll overview:', error);
            throw error;
        }
    }
    
    // Fetch staff payroll overview data
    async function fetchStaffPayrollOverview(staffId) {
        try {
            if (!AUTH_TOKEN) {
                throw new Error('Authentication required');
            }

            const url = new URL(`${API_BASE_URL}/users/${staffId}/overview`);
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${AUTH_TOKEN}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });

            if (response.status === 401) {
                throw new Error('Session expired');
            }

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            
            if (result.data) {
                return result.data;
            }
            
            return null;
        } catch (error) {
            console.error('Error fetching staff payroll overview:', error);
            throw error;
        }
    }
    
    // Generate payslip records HTML from API data
    function generatePayslipRecordsFromAPI(payslips) {
        if (!payslips || payslips.length === 0) {
            return `
                <div class="text-center py-4 text-muted">
                    <i class="bi bi-file-earmark-text display-4"></i>
                    <h5 class="mt-2">No payslip records found</h5>
                    <p>Generate a payslip to get started.</p>
                </div>
            `;
        }
        
        let recordsHTML = '';
        payslips.forEach(payslip => {
            // Check if it's worker data (has total_income/total_deduction) or staff data (only net_salary)
            const hasDetailedBreakdown = payslip.hasOwnProperty('total_income') && payslip.hasOwnProperty('total_deduction');
            
            recordsHTML += `
                <div class="payslip-record-item d-flex justify-content-between align-items-center p-3 mb-2 border rounded">
                    <div class="payslip-details">
                        <div class="payslip-month">
                            <span class="fw-medium">${payslip.payslip_month}</span>
                        </div>
                        <div class="payslip-summary text-muted small">
                            ${hasDetailedBreakdown ? `
                                <span class="me-3">Income: RM${payslip.total_income.toLocaleString()}</span>
                                <span class="me-3">Deduction: RM${payslip.total_deduction.toLocaleString()}</span>
                            ` : ''}
                            <span class="text-success fw-semibold">Net: RM${payslip.net_salary.toLocaleString()}</span>
                            ${payslip.status ? `<span class="ms-3 badge bg-secondary">${payslip.status}</span>` : ''}
                        </div>
                        ${payslip.created_at ? `<div class="text-muted small">Created: ${new Date(payslip.created_at).toLocaleDateString()}</div>` : ''}
                    </div>
                    <button class="btn btn-primary btn-sm d-flex align-items-center gap-2" data-payslip-id="${payslip.id}">
                        <i class="bi bi-eye"></i>
                        View
                    </button>
                </div>
            `;
        });
        
        return recordsHTML;
    }
    
    // Update payslip records with actual data (legacy function - now handled in generatePayslipRecordsFromAPI)
    function updatePayslipRecords(payslips) {
        // This function is kept for compatibility but not used anymore
        // Real payslip data is now handled in generatePayslipRecordsFromAPI
        console.log('updatePayslipRecords is deprecated - using generatePayslipRecordsFromAPI instead');
    }
    
    // Generate new payslip
    function generateNewPayslip(employeeId, isWorker) {
        // Placeholder for payslip generation
        alert(`Generating new payslip for ${isWorker ? 'worker' : 'staff'} ID: ${employeeId}`);
    }
    
    // View existing payslip
    function viewPayslip(payslipId) {
        // Placeholder for viewing payslip
        alert(`Viewing payslip ID: ${payslipId}`);
        // You can implement navigation to a payslip detail page here
    }
    
    // Generate payslip for specific month
    function generatePayslipForMonth(employeeId, month, year, isWorker) {
        // Placeholder for generating payslip for specific month
        alert(`Generating payslip for month ${month}/${year} for ${isWorker ? 'worker' : 'staff'} ID: ${employeeId}`);
    }

    // Payroll button functionality
    document.addEventListener('click', function(e) {
        if (e.target.closest('.payroll-action button')) {
            const button = e.target.closest('.payroll-action button');
            const workerCard = e.target.closest('.worker-card');
            const name = workerCard.querySelector('.worker-info h5').textContent;
            
            // Check if it's a worker or staff
            const workerId = button.getAttribute('data-worker-id');
            const staffId = button.getAttribute('data-staff-id');
            
            if (workerId) {
                // Find worker data
                const workerData = allWorkersData.find(worker => worker.id == workerId);
                if (workerData) {
                    const employeeData = {
                        id: workerId,
                        name: workerData.staff_fullname,
                        joinedSince: workerData.joined_since,
                        role: 'Worker',
                        age: workerData.age || 'N/A'
                    };
                    // Use the new async function for workers
                    showEmploymentOverview(employeeData, true);
                }
            } else if (staffId) {
                // Find staff data
                const staffData = allStaffData.find(staff => staff.id == staffId);
                if (staffData) {
                    const employeeData = {
                        id: staffId,
                        name: staffData.user_fullname,
                        joinedSince: staffData.joined_since,
                        role: staffData.user_role.charAt(0).toUpperCase() + staffData.user_role.slice(1),
                        age: staffData.age || 'N/A'
                    };
                    // Use the new async function for staff with real API data
                    showEmploymentOverview(employeeData, false);
                }
            }
        }
    });

    // Initial load of workers data
    fetchWorkers('', 1);
    
    // Initialize role filter state
    setActiveRoleFilter('all');
});