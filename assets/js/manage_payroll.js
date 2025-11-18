document.addEventListener('DOMContentLoaded', function() {
    // Tab functionality
    const workerTab = document.getElementById('workerTab');
    const staffTab = document.getElementById('staffTab');
    const workerList = document.getElementById('workerList');
    const staffList = document.getElementById('staffList');
    const searchInput = document.getElementById('searchInput');
    const workerContainer = document.getElementById('workerContainer');
    const loadingWorkers = document.getElementById('loadingWorkers');

    // Store fetched data
    let workersData = [];
    let allWorkersData = []; // Store all workers for client-side pagination
    
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
        handleClientSidePagination(searchTerm, page);
    };

    // Update pagination controls
    function updatePagination() {
        const paginationContainer = document.getElementById('paginationContainer');
        const paginationInfo = document.getElementById('paginationInfo');
        const paginationControls = document.getElementById('paginationControls');
        
        if (totalPages <= 1) {
            paginationContainer.style.display = 'none';
            return;
        }
        
        paginationContainer.style.display = 'block';
        
        // Update pagination info
        const startItem = (currentPage - 1) * itemsPerPage + 1;
        const endItem = Math.min(currentPage * itemsPerPage, totalItems);
        paginationInfo.textContent = `Showing ${startItem} - ${endItem} of ${totalItems} workers`;
        
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

    // Show/hide loading state
    function showLoading(show) {
        if (show) {
            loadingWorkers.classList.remove('d-none');
        } else {
            loadingWorkers.classList.add('d-none');
        }
    }

    // Show error message
    function showError(message) {
        workerContainer.innerHTML = `
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
            }
        }, 300); // 300ms delay
    });

    // Switch to Worker tab
    workerTab.addEventListener('click', function() {
        workerTab.classList.remove('btn-outline-secondary');
        workerTab.classList.add('btn-success');
        staffTab.classList.remove('btn-success');
        staffTab.classList.add('btn-outline-secondary');
        
        workerList.classList.remove('d-none');
        staffList.classList.add('d-none');
        
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
        
        searchInput.placeholder = 'search staff name...';
        document.querySelector('.row.mb-3 h3').textContent = 'List of existing staff:';
    });

    // Payroll button functionality
    document.addEventListener('click', function(e) {
        if (e.target.closest('.payroll-action button')) {
            const button = e.target.closest('.payroll-action button');
            const workerId = button.getAttribute('data-worker-id');
            const workerCard = e.target.closest('.worker-card');
            const workerName = workerCard.querySelector('.worker-info h5').textContent;
            
            // Implement payroll calculation logic here
            alert(`Opening payroll for ${workerName} (ID: ${workerId})`);
        }
    });

    // Initial load of workers data
    fetchWorkers('', 1);
});