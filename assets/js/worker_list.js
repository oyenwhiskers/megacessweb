// Worker List Management
(function() {
    // Configuration
    const API_BASE_URL = 'https://mwms.megacess.com/api/v1';
    const DEFAULT_PER_PAGE = 10;
    let currentPage = 1;
    let currentSearch = '';
    
    // Get the workers view container
    const workersView = document.getElementById('workersView');
    
    // Token management (you'll need to implement proper token storage)
    function getAuthToken() {
        // First check localStorage, then sessionStorage, then fallback
        const token = localStorage.getItem('auth_token') || 
                     sessionStorage.getItem('auth_token') || 
                     localStorage.getItem('authToken') ||
                     sessionStorage.getItem('authToken');
        
        if (!token) {
            console.warn('No authentication token found. Please ensure user is logged in.');
            // You might want to redirect to login page here
            // window.location.href = '/megacessweb/pages/log-in.html';
        }
        
        return token || 'YOUR_TOKEN';
    }
    
    // Format date for display
    function formatDate(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }
    
    // Format phone number
    function formatPhone(phone) {
        return phone || 'N/A';
    }
    
    // Get gender display text
    function getGenderDisplay(gender) {
        if (!gender) return 'N/A';
        return gender.charAt(0).toUpperCase() + gender.slice(1);
    }
    
    // Create worker list item HTML (similar to staff list)
    function createWorkerListItem(worker) {
        const claimedBy = worker.claimed_staff?.user?.user_fullname || 'Unclaimed';
        const claimedStatus = worker.claimed_staff ? 'claimed' : 'unclaimed';
        const claimedBadge = claimedStatus === 'claimed' ? 'bg-success' : 'bg-warning text-dark';
        const claimedText = claimedStatus === 'claimed' ? 'Claimed' : 'Available';
        
        return `
            <div class="list-group-item worker-list-item ${claimedStatus}">
                <div class="d-flex align-items-center">
                    <div style="width:48px;height:48px;flex:0 0 48px;">
                        <img src="${worker.staff_img || 'https://cdn.jsdelivr.net/gh/oyenwhiskers/megacessweb/assets/img/user-placeholder.png'}" 
                             alt="${worker.staff_fullname}" 
                             class="rounded-circle" 
                             style="width:48px;height:48px;object-fit:cover" 
                             onerror="this.onerror=null;this.src='https://cdn.jsdelivr.net/gh/oyenwhiskers/megacessweb/assets/img/user-placeholder.png'">
                    </div>
                    <div class="flex-grow-1 ms-3">
                        <div class="d-flex justify-content-between align-items-start">
                            <div>
                                <div class="fw-semibold">${worker.staff_fullname}</div>
                                <div class="small text-muted mb-1">
                                    <i class="bi bi-telephone me-1"></i>${formatPhone(worker.staff_phone)}
                                    <span class="ms-3"><i class="bi bi-person me-1"></i>${getGenderDisplay(worker.staff_gender)}</span>
                                    <span class="ms-3"><i class="bi bi-calendar me-1"></i>${formatDate(worker.staff_dob)}</span>
                                </div>
                                ${worker.claimed_staff ? `
                                    <div class="small text-muted">
                                        <i class="bi bi-person-check me-1"></i>Claimed by: ${claimedBy}
                                    </div>
                                ` : ''}
                            </div>
                            <div class="d-flex align-items-center gap-2">
                                <span class="badge ${claimedBadge}">${claimedText}</span>
                                <div class="btn-group" role="group">
                                    <button class="btn btn-sm btn-outline-primary" 
                                            onclick="viewWorkerDetails(${worker.id})"
                                            title="View Details">
                                        <i class="bi bi-eye"></i>
                                    </button>
                                    <button class="btn btn-sm btn-outline-secondary" 
                                            onclick="editWorker(${worker.id})"
                                            title="Edit Worker">
                                        <i class="bi bi-pencil"></i>
                                    </button>
                                    <button class="btn btn-sm btn-outline-danger" 
                                            onclick="deleteWorker(${worker.id})"
                                            title="Delete Worker">
                                        <i class="bi bi-trash"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    // Create pagination HTML
    function createPaginationHTML(currentPage, totalPages, totalItems, currentSearch, currentGender) {
        if (totalPages <= 1) return '';
        
        let paginationHTML = `
            <nav aria-label="Worker list pagination" class="mt-4">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <small class="text-muted">
                        Showing page ${currentPage} of ${totalPages} (${totalItems} total workers)
                    </small>
                </div>
                <ul class="pagination justify-content-center">
        `;
        
        // Previous button
        paginationHTML += `
            <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                <button class="page-link" onclick="fetchWorkersList('${currentSearch}', ${currentPage - 1}, '${currentGender}')" 
                        ${currentPage === 1 ? 'disabled' : ''}>
                    <i class="bi bi-chevron-left"></i>
                </button>
            </li>
        `;
        
        // Page numbers
        const startPage = Math.max(1, currentPage - 2);
        const endPage = Math.min(totalPages, currentPage + 2);
        
        if (startPage > 1) {
            paginationHTML += `
                <li class="page-item">
                    <button class="page-link" onclick="fetchWorkersList('${currentSearch}', 1, '${currentGender}')">1</button>
                </li>
            `;
            if (startPage > 2) {
                paginationHTML += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
            }
        }
        
        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `
                <li class="page-item ${i === currentPage ? 'active' : ''}">
                    <button class="page-link" onclick="fetchWorkersList('${currentSearch}', ${i}, '${currentGender}')">${i}</button>
                </li>
            `;
        }
        
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                paginationHTML += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
            }
            paginationHTML += `
                <li class="page-item">
                    <button class="page-link" onclick="fetchWorkersList('${currentSearch}', ${totalPages}, '${currentGender}')">${totalPages}</button>
                </li>
            `;
        }
        
        // Next button
        paginationHTML += `
            <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
                <button class="page-link" onclick="fetchWorkersList('${currentSearch}', ${currentPage + 1}, '${currentGender}')" 
                        ${currentPage === totalPages ? 'disabled' : ''}>
                    <i class="bi bi-chevron-right"></i>
                </button>
            </li>
        `;
        
        paginationHTML += `
                </ul>
            </nav>
        `;
        
        return paginationHTML;
    }
    
    // Show loading state
    function showLoading() {
        workersView.innerHTML = `
            <div class="list-group text-start">
                <div class="list-group-item text-center py-4">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <p class="mt-2 mb-0">Loading workers...</p>
                </div>
            </div>
        `;
    }
    
    // Show error state
    function showError(message, currentSearch, currentGender = 'all') {
        workersView.innerHTML = `
            <div class="list-group text-start">
                <div class="list-group-item">
                    <div class="alert alert-danger mb-0" role="alert">
                        <i class="bi bi-exclamation-triangle me-2"></i>
                        <strong>Error:</strong> ${message}
                        <button class="btn btn-outline-danger btn-sm ms-3" onclick="fetchWorkersList('${currentSearch}', ${currentPage}, '${currentGender}')">
                            <i class="bi bi-arrow-clockwise me-1"></i>Retry
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
    
    // Show empty state
    function showEmpty(currentSearch, currentGender = 'all') {
        workersView.innerHTML = `
            <div class="list-group text-start">
                <div class="list-group-item text-center py-5">
                    <i class="bi bi-people display-1 text-muted mb-3"></i>
                    <h5 class="text-muted">No workers found</h5>
                    <p class="text-muted">
                        ${currentSearch ? `No workers match your search "${currentSearch}".` : 'No workers have been registered yet.'}
                    </p>
                    ${currentSearch ? `
                        <button class="btn btn-outline-primary" onclick="fetchWorkersList('', 1, '${currentGender}')">
                            <i class="bi bi-x-circle me-1"></i>Clear Search
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }
    
    // Main function to fetch workers
    async function fetchWorkersList(search = '', page = 1, gender = 'all') {
        try {
            showLoading();
            
            currentSearch = search;
            currentPage = page;
            
            // Build API URL
            const url = new URL(`${API_BASE_URL}/staff`);
            
            // Add query parameters
            const params = {
                claimed: "0", // For workers, we typically want unclaimed staff
                per_page: DEFAULT_PER_PAGE.toString(),
                page: page.toString()
            };
            
            // Add search parameter if provided
            if (search && search.trim()) {
                params.search = search.trim();
            }
            
            // Add gender parameter if not 'all'
            if (gender && gender !== 'all') {
                params.gender = gender;
            }
            
            Object.keys(params).forEach(key => {
                url.searchParams.append(key, params[key]);
            });
            
            // Make API request
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${getAuthToken()}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error('Authentication failed. Please log in again.');
                } else if (response.status === 403) {
                    throw new Error('Access denied. You do not have permission to view workers.');
                } else if (response.status === 429) {
                    throw new Error('Too many requests. Please wait a moment and try again.');
                } else {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
            }
            
            const result = await response.json();
            
            // Check if we have data
            if (!result.data || !Array.isArray(result.data)) {
                throw new Error('Invalid response format');
            }
            
            if (result.data.length === 0) {
                showEmpty(search, gender);
                return;
            }
            
            // Render workers in list format
            let workersHTML = `
                <div class="list-group text-start">
                    ${result.data.map(worker => createWorkerListItem(worker)).join('')}
                </div>
            `;
            
            // Add pagination if available
            if (result.meta) {
                const totalPages = result.meta.last_page || 1;
                const totalItems = result.meta.total || result.data.length;
                workersHTML += createPaginationHTML(page, totalPages, totalItems, search, gender);
            }
            
            workersView.innerHTML = workersHTML;
            
        } catch (error) {
            console.error('Error fetching workers:', error);
            showError(error.message || 'Failed to load workers. Please try again.', search, gender);
        }
    }
    
    // Worker action functions (to be implemented)
    window.viewWorkerDetails = function(workerId) {
        alert(`View worker details for ID: ${workerId}\nThis functionality will be implemented soon.`);
    };
    
    window.editWorker = function(workerId) {
        alert(`Edit worker for ID: ${workerId}\nThis functionality will be implemented soon.`);
    };
    
    window.deleteWorker = function(workerId) {
        if (confirm('Are you sure you want to delete this worker?')) {
            alert(`Delete worker for ID: ${workerId}\nThis functionality will be implemented soon.`);
        }
    };
    
    // Expose the main function globally so it can be called from manage-account.html
    window.fetchWorkersList = fetchWorkersList;
    
    // Auto-load workers when the script is loaded
    document.addEventListener('DOMContentLoaded', function() {
        // Only auto-load if we're on the manage-account page and workers view is active
        if (document.body.dataset.page === 'manage-account') {
            fetchWorkersList();
        }
    });
    
})();
