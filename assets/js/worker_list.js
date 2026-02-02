// Worker List Management
(function () {
    // Add toggle switch CSS
    const style = document.createElement('style');
    style.textContent = `
        .switch {
            position: relative;
            display: inline-block;
            width: 48px;
            height: 24px;
        }
        .switch input {
            opacity: 0;
            width: 0;
            height: 0;
        }
        .slider {
            position: absolute;
            cursor: pointer;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: #ccc;
            transition: .3s;
            border-radius: 24px;
        }
        .slider:before {
            position: absolute;
            content: "";
            height: 18px;
            width: 18px;
            left: 3px;
            bottom: 3px;
            background-color: white;
            transition: .3s;
            border-radius: 50%;
        }
        input:checked + .slider {
            background-color: #0d6832;
        }
        input:focus + .slider {
            box-shadow: 0 0 1px #0d6832;
        }
        input:checked + .slider:before {
            transform: translateX(24px);
        }
        input:disabled + .slider {
            cursor: not-allowed;
            opacity: 0.6;
        }
        
        /* Mobile responsiveness */
        @media (max-width: 768px) {
            .worker-list-item .d-flex.align-items-center {
                flex-wrap: wrap;
            }
            
            .worker-list-item .d-flex.align-items-center > div:last-child {
                width: 100%;
                margin-top: 0.5rem;
                justify-content: flex-end;
            }
            
            .switch {
                width: 38px;
                height: 20px;
            }
            
            .slider:before {
                height: 14px;
                width: 14px;
            }
            
            input:checked + .slider:before {
                transform: translateX(18px);
            }
            
            .worker-list-item .btn-group .btn {
                padding: 0.25rem 0.5rem;
                font-size: 0.75rem;
            }
            
            .worker-list-item .btn-group .btn i {
                font-size: 0.85rem;
            }
            
            .worker-list-item small {
                font-size: 0.7rem !important;
                min-width: 50px !important;
            }
        }
        
        @media (max-width: 576px) {
            .worker-list-item .d-flex.gap-2 {
                gap: 0.4rem !important;
            }
            
            .switch {
                width: 36px;
                height: 18px;
            }
            
            .slider:before {
                height: 12px;
                width: 12px;
                left: 2px;
                bottom: 3px;
            }
            
            input:checked + .slider:before {
                transform: translateX(18px);
            }
            
            .worker-list-item .btn-group .btn {
                padding: 0.2rem 0.4rem;
                font-size: 0.7rem;
            }
            
            .worker-list-item .btn-group .btn i {
                font-size: 0.75rem;
            }
            
            .worker-list-item small {
                font-size: 0.65rem !important;
                min-width: 45px !important;
            }
        }
    `;
    document.head.appendChild(style);

    // Configuration
    const API_BASE_URL = API_URL; // Using global API_URL from config.js
    const DEFAULT_PER_PAGE = 10;
    let currentPage = 1;
    let currentSearch = '';

    // Get the workers view container
    const workersView = document.getElementById('workersView');

    // Token management
    function getAuthToken() {
        // First check localStorage, then sessionStorage
        const token = localStorage.getItem('auth_token') ||
            sessionStorage.getItem('auth_token') ||
            localStorage.getItem('authToken') ||
            sessionStorage.getItem('authToken');

        if (!token) {
            // Redirect to login page
            window.location.href = '/pages/log-in.html';
            return null;
        }

        return token;
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

    // Highlight search terms in text
    function highlightSearchTerm(text, searchTerm) {
        if (!searchTerm || !searchTerm.trim() || !text) {
            return text;
        }

        const escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(${escapedTerm})`, 'gi');
        return text.replace(regex, '<mark class="bg-warning text-dark">$1</mark>');
    }

    // Create worker list item HTML (similar to staff list)
    function createWorkerListItem(worker) {
        const claimedBy = worker.claimed_staff?.user?.user_fullname || 'Unclaimed';
        const claimedStatus = worker.claimed_staff ? 'claimed' : 'unclaimed';
        const claimedBadge = claimedStatus === 'claimed' ? 'bg-success' : 'bg-warning text-dark';
        const claimedText = claimedStatus === 'claimed' ? 'Claimed' : 'Available';

        // Apply search highlighting to worker name
        const highlightedName = highlightSearchTerm(worker.staff_fullname, currentSearch);

        // Set image source with fallback - generate avatar from name
        const userName = worker.staff_fullname || 'Worker';
        const placeholderImage = `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=6c757d&color=fff&size=128&bold=true&rounded=true`;

        // Use worker image if exists and valid, otherwise use placeholder
        let imageSrc = placeholderImage;
        if (worker.staff_img && worker.staff_img.trim() !== '') {
            const imgPath = worker.staff_img.trim();
            // Check if it's a full URL or relative path
            if (imgPath.startsWith('http://') || imgPath.startsWith('https://')) {
                imageSrc = imgPath;
            } else {
                // Construct full URL using API base URL
                imageSrc = `https://mwms.megacess.com/${imgPath.startsWith('/') ? imgPath.substring(1) : imgPath}`;
            }
        }

        // Determine active/inactive status - check multiple possible field names and formats
        let isActive = true; // Default to active

        if (worker.hasOwnProperty('is_active')) {
            // Boolean field
            isActive = worker.is_active === true || worker.is_active === 1 || worker.is_active === '1';
        } else if (worker.hasOwnProperty('staff_status')) {
            // String field
            isActive = worker.staff_status === 'active';
        } else if (worker.hasOwnProperty('status')) {
            // Alternative string field
            isActive = worker.status === 'active';
        }

        const statusBadgeClass = isActive ? 'bg-success' : 'bg-secondary';
        const statusBadgeText = isActive ? 'Active' : 'Inactive';
        const inactiveStyle = !isActive ? 'opacity: 0.7; background-color: #f8f9fa;' : '';

        return `
            <div class="list-group-item worker-list-item ${claimedStatus}" style="${inactiveStyle}">
                <div class="d-flex align-items-center">
                    <div style="width:48px;height:48px;flex:0 0 48px;">
                        <img src="${imageSrc}" 
                             alt="${userName}" 
                             class="rounded-circle" 
                             style="width:48px;height:48px;object-fit:cover;background:#6c757d;" 
                             onerror="if(this.src!=='${placeholderImage}'){this.src='${placeholderImage}';}">
                    </div>
                    <div class="flex-grow-1 ms-3">
                        <div class="fw-semibold">${highlightedName}</div>
                        <div class="small text-muted mb-1">
                            <i class="bi bi-telephone me-1"></i>${formatPhone(worker.staff_phone)}
                            <span class="ms-3"><span class="badge ${claimedBadge}">${claimedText}</span></span>
                            <span class="ms-2"><span class="badge ${statusBadgeClass}">${statusBadgeText}</span></span>
                        </div>
                        ${worker.claimed_staff ? `
                            <div class="small text-muted mb-2">
                                <i class="bi bi-person-check me-1"></i>Claimed by: ${claimedBy}
                            </div>
                        ` : ''}
                    </div>
                    <div class="d-flex align-items-center gap-2">
                        <label class="switch" title="Toggle Active/Inactive">
                            <input type="checkbox" ${isActive ? 'checked' : ''} onchange="toggleWorkerStatus(${worker.id}, this.checked)" data-worker-id="${worker.id}">
                            <span class="slider"></span>
                        </label>
                        <small class="text-muted text-nowrap" style="font-size:0.75rem;min-width:55px;">${isActive ? 'Active' : 'Inactive'}</small>
                        <div class="btn-group" role="group">
                            <button class="btn btn-sm btn-primary" 
                                    onclick="viewWorkerDetails(${worker.id})"
                                    title="View Details">
                                <i class="bi bi-eye"></i>
                            </button>
                            <button class="btn btn-sm btn-danger" 
                                    onclick="deleteWorker(${worker.id})"
                                    title="Delete Worker">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // Create pagination HTML
    function createPaginationHTML(currentPage, totalPages, totalItems, currentSearch) {
        // Always show pagination bar, even if only 1 page
        let paginationHTML = `
            <nav aria-label="Worker list pagination" class="mt-4">
                <ul class="pagination justify-content-center" style="background:#effaf3; border-radius:8px; padding:8px 16px;">
        `;
        // Previous button
        paginationHTML += `
            <li class="page-item${currentPage === 1 ? ' disabled' : ''}">
                <button class="page-link" style="background:transparent; border:none; color:#0d6832;" onclick="fetchWorkersList('${currentSearch}', ${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>Previous</button>
            </li>
        `;
        // Only show one page button if totalPages === 1
        if (totalPages === 1) {
            paginationHTML += `
                <li class="page-item active">
                    <button class="page-link" style="background:#0d6832;color:#fff;border:none;">1</button>
                </li>
            `;
        } else {
            for (let i = 1; i <= totalPages; i++) {
                paginationHTML += `
                    <li class="page-item${i === currentPage ? ' active' : ''}">
                        <button class="page-link" style="${i === currentPage ? 'background:#0d6832;color:#fff;border:none;' : 'background:transparent; border:none; color:#0d6832;'}" onclick="fetchWorkersList('${currentSearch}', ${i})">${i}</button>
                    </li>
                `;
            }
        }
        // Next button
        paginationHTML += `
            <li class="page-item${currentPage === totalPages ? ' disabled' : ''}">
                <button class="page-link" style="background:transparent; border:none; color:#0d6832;" onclick="fetchWorkersList('${currentSearch}', ${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>Next</button>
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
                    <div class="spinner-border text-success" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <p class="mt-2 mb-0">Loading worker list...</p>
                </div>
            </div>
        `;
    }

    // Show error state
    function showError(message, currentSearch) {
        workersView.innerHTML = `
            <div class="list-group text-start">
                <div class="list-group-item">
                    <div class="alert alert-danger mb-0" role="alert">
                        <i class="bi bi-exclamation-triangle me-2"></i>
                        <strong>Error:</strong> ${message}
                        <button class="btn btn-outline-danger btn-sm ms-3" onclick="fetchWorkersList('${currentSearch}', ${currentPage})">
                            <i class="bi bi-arrow-clockwise me-1"></i>Retry
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    // Show empty state
    function showEmpty(currentSearch) {
        const searchMessage = currentSearch ?
            `No workers found matching "${currentSearch}".` :
            'No workers have been registered yet.';

        workersView.innerHTML = `
            <div class="list-group text-start">
                <div class="list-group-item text-center py-5">
                    <i class="bi bi-people display-1 text-muted mb-3"></i>
                    <h5 class="text-muted">No workers found</h5>
                    <p class="text-muted">${searchMessage}</p>
                </div>
            </div>
        `;
    }

    // Main function to fetch workers
    async function fetchWorkersList(search = '', page = 1) {
        try {
            showLoading();

            currentSearch = search;
            currentPage = page;

            // Build API URL - fetch ALL workers (we'll handle pagination client-side)
            const url = new URL(`${API_BASE_URL}/staff`);

            // Add query parameters - fetch large number to get all workers
            const params = {
                per_page: '1000', // Fetch all workers at once
                page: '1',
                role: 'worker' // Only fetch workers, not staff with other roles
            };

            // Add search parameter if provided
            if (search && search.trim()) {
                params.search = search.trim();
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

            let allWorkers = result.data;

            if (allWorkers.length === 0) {
                showEmpty(search);
                return;
            }

            // Separate active and inactive workers
            const activeWorkers = [];
            const inactiveWorkers = [];

            allWorkers.forEach(worker => {
                let isActive = true;
                if (worker.hasOwnProperty('is_active')) {
                    isActive = worker.is_active === true || worker.is_active === 1 || worker.is_active === '1';
                } else if (worker.hasOwnProperty('staff_status')) {
                    isActive = worker.staff_status === 'active';
                } else if (worker.hasOwnProperty('status')) {
                    isActive = worker.status === 'active';
                }

                if (isActive) {
                    activeWorkers.push(worker);
                } else {
                    inactiveWorkers.push(worker);
                }
            });

            // Combine: active workers first, then inactive workers
            const sortedWorkers = [...activeWorkers, ...inactiveWorkers];

            // Calculate client-side pagination
            const totalWorkers = sortedWorkers.length;
            const totalPages = Math.ceil(totalWorkers / DEFAULT_PER_PAGE);
            const startIndex = (page - 1) * DEFAULT_PER_PAGE;
            const endIndex = startIndex + DEFAULT_PER_PAGE;
            const workersOnPage = sortedWorkers.slice(startIndex, endIndex);

            // Render workers in list format
            let workersHTML = `
                <div class="list-group text-start">
                    ${workersOnPage.map(worker => createWorkerListItem(worker)).join('')}
                </div>
            `;

            // Add pagination
            workersHTML += createPaginationHTML(page, totalPages, totalWorkers, search);

            workersView.innerHTML = workersHTML;

        } catch (error) {
            showError(error.message || 'Failed to load workers. Please try again.', search);
        }
    }

    // Worker action functions
    window.viewWorkerDetails = async function (workerId) {
        try {
            // Show loading state in a modal
            showWorkerDetailsModal({
                loading: true,
                workerId: workerId
            });

            // Fetch worker details from API
            const response = await fetch(`${API_BASE_URL}/staff/${workerId}`, {
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
                    throw new Error('Access denied.');
                } else if (response.status === 404) {
                    throw new Error('Worker not found.');
                } else {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
            }

            const result = await response.json();

            if (!result.data) {
                throw new Error('Invalid response format');
            }

            // Display worker details in modal
            showWorkerDetailsModal(result.data);

        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Error Loading Worker',
                text: error.message || 'Failed to load worker details.',
                confirmButtonColor: '#dc3545'
            });
            showWorkerDetailsModal({
                error: error.message || 'Failed to load worker details.'
            });
        }
    };

    // Function to display worker details in a modal
    function showWorkerDetailsModal(workerData) {
        // Remove existing modal if any
        const existingModal = document.getElementById('workerDetailsModal');
        if (existingModal) {
            // Properly dispose of existing modal instance
            const existingModalInstance = bootstrap.Modal.getInstance(existingModal);
            if (existingModalInstance) {
                existingModalInstance.dispose();
            }
            existingModal.remove();
        }

        // Remove any lingering backdrops
        const backdrops = document.querySelectorAll('.modal-backdrop');
        backdrops.forEach(backdrop => backdrop.remove());

        // Remove modal-open class from body if no other modals are open
        if (!document.querySelector('.modal.show')) {
            document.body.classList.remove('modal-open');
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
        }

        let modalContent = '';

        if (workerData.loading) {
            modalContent = `
                <div class="text-center py-5">
                    <div class="spinner-border text-success" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <p class="mt-3">Loading worker details...</p>
                </div>
            `;
        } else if (workerData.error) {
            modalContent = `
                <div class="alert alert-danger" role="alert">
                    <i class="bi bi-exclamation-triangle me-2"></i>
                    <strong>Error:</strong> ${workerData.error}
                </div>
            `;
        } else {
            const worker = workerData;
            const claimedBy = worker.claimed_staff?.user?.user_fullname || 'Not claimed';
            const claimedStatus = worker.claimed_staff ? 'Claimed' : 'Available';
            const claimedBadge = worker.claimed_staff ? 'bg-success' : 'bg-warning text-dark';

            // Generate avatar placeholder
            const userName = worker.staff_fullname || 'Worker';
            const placeholderImage = `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=6c757d&color=fff&size=200&bold=true&rounded=true`;

            // Use worker image if exists and valid, otherwise use placeholder
            let imageSrc = placeholderImage;
            if (worker.staff_img && worker.staff_img.trim() !== '') {
                const imgPath = worker.staff_img.trim();
                // Check if it's a full URL or relative path
                if (imgPath.startsWith('http://') || imgPath.startsWith('https://')) {
                    imageSrc = imgPath;
                } else {
                    // Construct full URL using API base URL
                    imageSrc = `https://mwms.megacess.com/${imgPath.startsWith('/') ? imgPath.substring(1) : imgPath}`;
                }
            }

            // Format date for input field (YYYY-MM-DD to DD/MM/YYYY)
            function formatDateForDisplay(dateString) {
                if (!dateString) return '-';
                const date = new Date(dateString);
                const day = String(date.getDate()).padStart(2, '0');
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const year = date.getFullYear();
                return `${day}/${month}/${year}`;
            }

            // Helper function to display value or dash
            function displayValue(value) {
                return (value && value.trim() !== '') ? value : '-';
            }

            modalContent = `
                <div class="row">
                    <div class="col-md-3 text-center mb-3 mb-md-0">
                        <div style="border:2px solid #dee2e6; border-radius:8px; padding:10px; display:inline-block; background:#f8f9fa;">
                            <img id="workerDetailsImagePreview" src="${imageSrc}" 
                                 alt="${userName}" 
                                 style="width:120px; height:120px; object-fit:cover; border-radius:8px;"
                                 onerror="if(this.src!=='${placeholderImage}'){this.src='${placeholderImage}';}">
                            <input type="file" id="workerDetailsImageInput" accept="image/*" style="display:none;">
                        </div>
                    </div>
                    
                    <div class="col-md-9">
                        <div class="row g-2">
                            <div class="col-md-6">
                                <label class="form-label fw-semibold mb-1 small">IC / Document ID:</label>
                                <input type="text" class="form-control form-control-sm" value="${displayValue(worker.staff_doc)}" readonly>
                            </div>
                            
                            <div class="col-md-6">
                                <label class="form-label fw-semibold mb-1 small">Full Name:</label>
                                <input type="text" class="form-control form-control-sm" value="${displayValue(worker.staff_fullname)}" readonly>
                            </div>
                            
                            <div class="col-md-6">
                                <label class="form-label fw-semibold mb-1 small">Phone Number:</label>
                                <input type="text" class="form-control form-control-sm" value="${displayValue(worker.staff_phone)}" readonly>
                            </div>
                            
                            <div class="col-md-6">
                                <label class="form-label fw-semibold mb-1 small">Date Of Birth:</label>
                                <input type="text" class="form-control form-control-sm" value="${formatDateForDisplay(worker.staff_dob)}" readonly>
                            </div>
                            
                            <div class="col-md-6">
                                <label class="form-label fw-semibold mb-1 small">Gender:</label>
                                <input type="text" class="form-control form-control-sm" value="${worker.staff_gender ? getGenderDisplay(worker.staff_gender) : '-'}" readonly>
                            </div>
                            
                            <div class="col-md-6">
                                <label class="form-label fw-semibold mb-1 small">Role:</label>
                                <input type="text" class="form-control form-control-sm" value="${worker.role ? worker.role.charAt(0).toUpperCase() + worker.role.slice(1) : 'Worker'}" readonly>
                            </div>
                            
                            <div class="col-md-6">
                                <label class="form-label fw-semibold mb-1 small">Bank Type:</label>
                                <input type="text" class="form-control form-control-sm" value="${displayValue(worker.staff_bank_name)}" readonly>
                            </div>
                            
                            <div class="col-md-6">
                                <label class="form-label fw-semibold mb-1 small">Bank Account Number:</label>
                                <input type="text" class="form-control form-control-sm" value="${displayValue(worker.staff_bank_number)}" readonly>
                            </div>
                            
                            <div class="col-md-6">
                                <label class="form-label fw-semibold mb-1 small">KWSP Number:</label>
                                <input type="text" class="form-control form-control-sm" value="${displayValue(worker.staff_kwsp_number)}" readonly>
                            </div>
                            
                            <div class="col-md-6">
                                <label class="form-label fw-semibold mb-1 small">Start Date:</label>
                                <input type="text" class="form-control form-control-sm" value="${formatDateForDisplay(worker.staff_employment_start_date)}" readonly>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        // Create modal element
        const modalHTML = `
            <div class="modal fade" id="workerDetailsModal" tabindex="-1" aria-labelledby="workerDetailsModalLabel" aria-hidden="true">
                <div class="modal-dialog modal-dialog-centered modal-xl">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="workerDetailsModalLabel">
                                <i class="bi bi-person-badge me-2"></i>Worker Details
                            </h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            ${modalContent}
                        </div>
                        <div class="modal-footer">
                            ${!workerData.loading && !workerData.error ? `
                                <button type="button" class="btn btn-success" onclick="editWorker(${workerData.id})">
                                    <i class="bi bi-pencil me-1"></i>Edit
                                </button>
                            ` : ''}
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Append modal to body
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Show modal using Bootstrap
        const modalElement = document.getElementById('workerDetailsModal');
        const modal = new bootstrap.Modal(modalElement, {
            backdrop: true,
            keyboard: true,
            focus: true
        });
        modal.show();

        // Clean up modal and backdrop when hidden
        modalElement.addEventListener('hidden.bs.modal', function () {
            // Dispose of the modal instance
            const modalInstance = bootstrap.Modal.getInstance(modalElement);
            if (modalInstance) {
                modalInstance.dispose();
            }

            // Remove the modal element
            modalElement.remove();

            // Clean up any lingering backdrops
            const backdrops = document.querySelectorAll('.modal-backdrop');
            backdrops.forEach(backdrop => backdrop.remove());

            // Ensure body classes and styles are reset
            if (!document.querySelector('.modal.show')) {
                document.body.classList.remove('modal-open');
                document.body.style.overflow = '';
                document.body.style.paddingRight = '';
            }
        }, { once: true });
    }

    window.editWorker = function (workerId) {
        // Get the current modal
        const currentModal = document.getElementById('workerDetailsModal');
        if (!currentModal) return;

        // Switch to edit mode
        enableEditMode(workerId);
    };

    // Function to enable edit mode in the current modal
    function enableEditMode(workerId) {
        const modal = document.getElementById('workerDetailsModal');
        if (!modal) return;

        const modalBody = modal.querySelector('.modal-body');
        const modalFooter = modal.querySelector('.modal-footer');

        // Get all readonly inputs
        const inputs = modalBody.querySelectorAll('input[readonly]');

        // Convert inputs to editable
        inputs.forEach(input => {
            input.removeAttribute('readonly');
            input.classList.add('border-primary');

            // Convert text inputs to appropriate types and add name attributes
            const label = input.previousElementSibling?.textContent || '';

            if (label.includes('IC / Document ID')) {
                input.setAttribute('name', 'staff_doc');
            } else if (label.includes('Full Name')) {
                input.setAttribute('name', 'staff_fullname');
            } else if (label.includes('Phone Number')) {
                input.type = 'tel';
                input.setAttribute('name', 'staff_phone');
            } else if (label.includes('Date Of Birth')) {
                // Convert DD/MM/YYYY to YYYY-MM-DD for date input BEFORE changing type
                const dateValue = input.value;
                if (dateValue && dateValue !== '-') {
                    const parts = dateValue.split('/');
                    if (parts.length === 3) {
                        // Ensure proper padding for month and day
                        const day = parts[0].padStart(2, '0');
                        const month = parts[1].padStart(2, '0');
                        const year = parts[2];
                        input.value = `${year}-${month}-${day}`;
                    }
                }
                // Now change the type after value is converted
                input.type = 'date';
                input.setAttribute('name', 'staff_dob');
            } else if (label.includes('Gender')) {
                // Replace gender input with select (only Male and Female)
                const currentValue = input.value.toLowerCase();
                const selectHTML = `
                    <select class="form-control form-control-sm border-primary" name="gender" required>
                        <option value="">Select Gender</option>
                        <option value="male" ${currentValue === 'male' ? 'selected' : ''}>Male</option>
                        <option value="female" ${currentValue === 'female' ? 'selected' : ''}>Female</option>
                    </select>
                `;
                input.outerHTML = selectHTML;
                return;
            } else if (label.includes('Role')) {
                // Role field stays readonly - workers cannot change their role
                input.classList.remove('border-primary');
                input.setAttribute('readonly', 'readonly');
                return; // Skip further processing for this field
            } else if (label.includes('Bank Type')) {
                input.setAttribute('name', 'staff_bank_name');
            } else if (label.includes('Bank Account Number')) {
                input.setAttribute('name', 'staff_bank_number');
            } else if (label.includes('KWSP Number')) {
                input.setAttribute('name', 'staff_kwsp_number');
            } else if (label.includes('Start Date')) {
                // Convert DD/MM/YYYY to YYYY-MM-DD for date input BEFORE changing type
                const dateValue = input.value;
                if (dateValue && dateValue !== '-') {
                    const parts = dateValue.split('/');
                    if (parts.length === 3) {
                        const day = parts[0].padStart(2, '0');
                        const month = parts[1].padStart(2, '0');
                        const year = parts[2];
                        input.value = `${year}-${month}-${day}`;
                    }
                }
                input.type = 'date';
                input.setAttribute('name', 'staff_employment_start_date');
            }

            // Clear dash values
            if (input.value === '-') {
                input.value = '';
            }
        });

        // Add "Change Photo" button in edit mode
        const imageContainer = modalBody.querySelector('.col-md-3.text-center');
        if (imageContainer && !imageContainer.querySelector('#changePhotoBtn')) {
            const changePhotoBtn = document.createElement('button');
            changePhotoBtn.id = 'changePhotoBtn';
            changePhotoBtn.type = 'button';
            changePhotoBtn.className = 'btn btn-sm btn-outline-primary mt-2';
            changePhotoBtn.innerHTML = '<i class="bi bi-camera"></i> Change Photo';
            changePhotoBtn.onclick = function () {
                document.getElementById('workerDetailsImageInput').click();
            };
            imageContainer.querySelector('div').appendChild(changePhotoBtn);

            // Add image preview functionality
            const imageInput = document.getElementById('workerDetailsImageInput');
            const imagePreview = document.getElementById('workerDetailsImagePreview');

            if (imageInput && imagePreview) {
                imageInput.addEventListener('change', function (e) {
                    const file = e.target.files[0];
                    if (file) {
                        // Validate file type
                        if (!file.type.startsWith('image/')) {
                            alert('Please select a valid image file.');
                            e.target.value = '';
                            return;
                        }
                        // Validate file size (max 5MB)
                        if (file.size > 5 * 1024 * 1024) {
                            alert('Image size must be less than 5MB.');
                            e.target.value = '';
                            return;
                        }
                        // Show preview
                        const reader = new FileReader();
                        reader.onload = function (event) {
                            imagePreview.src = event.target.result;
                        };
                        reader.readAsDataURL(file);
                    }
                });
            }
        }

        // Update footer buttons
        modalFooter.innerHTML = `
            <button type="button" class="btn btn-secondary" onclick="cancelEditMode(${workerId})">
                <i class="bi bi-x-circle me-1"></i>Cancel
            </button>
            <button type="button" class="btn btn-primary" onclick="saveWorkerChanges(${workerId})">
                <i class="bi bi-save me-1"></i>Save Changes
            </button>
        `;
    }

    // Function to cancel edit mode and reload view mode
    window.cancelEditMode = function (workerId) {
        const modal = document.getElementById('workerDetailsModal');
        if (modal) {
            const modalInstance = bootstrap.Modal.getInstance(modal);
            if (modalInstance) {
                modalInstance.hide();
            }
        }

        // Reload the view modal after a brief delay
        setTimeout(() => {
            viewWorkerDetails(workerId);
        }, 300);
    };

    // Function to save worker changes
    window.saveWorkerChanges = async function (workerId, event = null) {
        try {
            const modal = document.getElementById('workerDetailsModal');
            if (!modal) {
                return;
            }

            const modalBody = modal.querySelector('.modal-body');
            if (!modalBody) {
                return;
            }

            // Collect all editable fields
            const staffDocInput = modalBody.querySelector('input[name="staff_doc"]');
            const fullNameInput = modalBody.querySelector('input[name="staff_fullname"]');
            const phoneInput = modalBody.querySelector('input[name="staff_phone"]');
            const dobInput = modalBody.querySelector('input[name="staff_dob"]');
            const genderInput = modalBody.querySelector('input[name="gender"], select[name="gender"]');
            const startDateInput = modalBody.querySelector('input[name="staff_employment_start_date"]');
            const bankNameInput = modalBody.querySelector('input[name="staff_bank_name"]');
            const bankNumberInput = modalBody.querySelector('input[name="staff_bank_number"]');
            const kwspNumberInput = modalBody.querySelector('input[name="staff_kwsp_number"]');

            // Check if there's an image file to upload
            const imageInput = document.getElementById('workerDetailsImageInput');
            const imageFile = imageInput && imageInput.files.length > 0 ? imageInput.files[0] : null;

            // Get the save button - try from event first, then find it in the modal
            let saveButton = null;
            if (event && event.target) {
                saveButton = event.target;
            } else {
                saveButton = modal.querySelector('button[onclick*="saveWorkerChanges"], .btn-primary, button[type="submit"]');
            }

            // Disable save button and show loading state
            const originalButtonText = saveButton ? saveButton.innerHTML : '';
            if (saveButton) {
                saveButton.disabled = true;
                saveButton.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Saving...';
            }

            // Use FormData for all fields (works for both file and non-file updates)
            const formData = new FormData();

            // Append all fields to FormData
            if (staffDocInput && staffDocInput.value) {
                formData.append('staff_doc', staffDocInput.value);
            }
            if (fullNameInput && fullNameInput.value) {
                formData.append('staff_fullname', fullNameInput.value);
            }
            if (phoneInput && phoneInput.value) {
                formData.append('staff_phone', phoneInput.value);
            }
            if (dobInput && dobInput.value) {
                formData.append('staff_dob', dobInput.value);
            }
            if (genderInput && genderInput.value) {
                formData.append('staff_gender', genderInput.value);
            }
            if (startDateInput && startDateInput.value) {
                formData.append('staff_employment_start_date', startDateInput.value);
            }
            if (bankNameInput && bankNameInput.value) {
                formData.append('staff_bank_name', bankNameInput.value);
            }
            if (bankNumberInput && bankNumberInput.value) {
                formData.append('staff_bank_number', bankNumberInput.value);
            }
            if (kwspNumberInput && kwspNumberInput.value) {
                formData.append('staff_kwsp_number', kwspNumberInput.value);
            }

            // Append image file if present
            if (imageFile) {
                formData.append('staff_img', imageFile);
            }

            // Prepare headers
            const headers = {
                'Authorization': `Bearer ${getAuthToken()}`,
                'Accept': 'application/json'
                // Don't set Content-Type for FormData - browser will set it automatically with boundary
            };

            // Make POST request to update worker (POST works better with file uploads)
            const response = await fetch(`${API_BASE_URL}/staff/${workerId}`, {
                method: 'POST',
                headers: headers,
                body: formData
            });

            // Parse response
            const result = await response.json();

            if (!response.ok) {
                // Handle API error response
                const errorMessage = result.message || result.error || 'Failed to save changes.';
                Swals.fire({
                    icon: 'error',
                    title: 'Save Failed',
                    text: errorMessage,
                    confirmButtonColor: '#dc3545'
                });
                return;
            }

            if (!result.success) {
                // Handle non-success response
                const errorMessage = result.message || 'Failed to save changes.';
                Swals.fire({
                    icon: 'error',
                    title: 'Save Failed',
                    text: errorMessage,
                    confirmButtonColor: '#dc3545'
                });
                return;
            }

            // Show success message
            if (typeof showNotification === 'function') {
                showNotification('Worker details updated successfully!', 'success');
            } else {
                Swal.fire({
                    icon: 'success',
                    title: 'Success',
                    text: 'Worker details updated successfully!',
                    confirmButtonColor: '#0d6832'
                })
            }

            // Close the modal
            const modalInstance = bootstrap.Modal.getInstance(modal);
            if (modalInstance) {
                modalInstance.hide();
            }

            // Refresh the worker list to show updated data including image
            setTimeout(() => {
                if (typeof fetchWorkersList === 'function') {
                    fetchWorkersList(currentSearch, currentPage);
                }
                // Reopen the modal with updated worker details to refresh image
                if (typeof viewWorkerDetails === 'function') {
                    viewWorkerDetails(workerId);
                }
            }, 1000);

        } catch (error) {
            // Show error message
            const errorMessage = error.message || 'Failed to save changes. Please try again.';
            Swal.fire({
                icon: 'error',
                title: 'Save Failed',
                text: errorMessage,
                confirmButtonColor: '#dc3545'
            });

            // Re-enable save button
            const modal = document.getElementById('workerDetailsModal');
            if (modal) {
                const saveButton = modal.querySelector('button[onclick*="saveWorkerChanges"], .btn-primary, button[type="submit"]');
                if (saveButton) {
                    saveButton.disabled = false;
                    saveButton.innerHTML = '<i class="bi bi-save me-1"></i>Save Changes';
                }
            }
        }
    };

    window.deleteWorker = async function (workerId) {
        // Show confirmation dialog
        const confirmed = await Swal.fire({
            title: 'Delete Worker?',
            text: 'This action cannot be undone!',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc3545',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Yes, delete it!',
            cancelButtonText: 'Cancel'
        });

        if (!confirmed.isConfirmed) {
            return; // User cancelled
        }

        try {
            // Make DELETE request to API
            const response = await fetch(`${API_BASE_URL}/staff/${workerId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${getAuthToken()}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });

            // Try to parse the response body first to get server error messages
            let result;
            try {
                result = await response.json();
            } catch (e) {
                result = null;
            }

            if (!response.ok) {
                // Use server's error message if available
                let errorMessage = result?.message || result?.error || `HTTP ${response.status}: ${response.statusText}`;

                if (response.status === 401) {
                    errorMessage = 'Authentication failed. Please log in again.';
                } else if (response.status === 403) {
                    errorMessage = result?.message || 'Access denied. You do not have permission to delete this worker.';
                } else if (response.status === 404) {
                    errorMessage = 'Worker not found.';
                } else if (response.status === 400) {
                    errorMessage = result?.message || 'Invalid request. Please check the worker details.';
                } else if (response.status === 409) {
                    errorMessage = result?.message || 'Cannot delete worker. This worker may have related records (attendance, payroll, etc.).';
                }

                throw new Error(errorMessage);
            }

            // Show success message
            Swal.fire({
                icon: 'success',
                title: 'Deleted!',
                text: result?.message || 'Worker deleted successfully!',
                confirmButtonColor: '#0d6832',
                timer: 2000,
                timerProgressBar: true
            });

            // Refresh the worker list
            fetchWorkersList(currentSearch, currentPage);

        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Delete Failed',
                text: error.message || 'Failed to delete worker.',
                confirmButtonColor: '#dc3545'
            });
        }
    };

    // Toggle worker active/inactive status
    window.toggleWorkerStatus = async function (workerId, isChecked) {
        const checkbox = document.querySelector(`input[data-worker-id="${workerId}"]`);

        if (!checkbox) {
            console.error('Checkbox not found for worker:', workerId);
            return;
        }

        // Disable checkbox while updating
        checkbox.disabled = true;
        const originalState = !isChecked;

        try {
            // API call to update status
            const headers = {
                'Authorization': `Bearer ${getAuthToken()}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            };

            const newStatus = isChecked ? 'active' : 'inactive';
            const requestBody = { staff_status: newStatus };

            const response = await fetch(`${API_BASE_URL}/staff/${workerId}/status`, {
                method: 'PUT',
                headers: headers,
                body: JSON.stringify(requestBody)
            });

            // Try to parse the response body
            let result;
            try {
                result = await response.json();
            } catch (e) {
                result = null;
            }

            if (!response.ok) {
                // Use server's error message if available
                let errorMessage = result?.message || result?.error || `HTTP ${response.status}: ${response.statusText}`;

                if (response.status === 401) {
                    errorMessage = 'Authentication failed. Please log in again.';
                } else if (response.status === 403) {
                    errorMessage = result?.message || 'Access denied. You do not have permission to change worker status.';
                } else if (response.status === 404) {
                    errorMessage = 'Worker not found.';
                } else if (response.status === 400) {
                    errorMessage = result?.message || 'Invalid status value.';
                }

                throw new Error(errorMessage);
            }

            // Show success message
            await Swal.fire({
                icon: 'success',
                title: 'Status Updated',
                text: result?.message || `Worker is now ${newStatus}!`,
                confirmButtonColor: '#0d6832',
                timer: 1500,
                timerProgressBar: true,
                showConfirmButton: false
            });

            // Force refresh list to show updated status and re-sort
            await fetchWorkersList(currentSearch, currentPage);

        } catch (error) {
            // Revert checkbox state on error
            checkbox.checked = originalState;
            checkbox.disabled = false;

            Swal.fire({
                icon: 'error',
                title: 'Update Failed',
                text: error.message || 'Failed to update worker status.',
                confirmButtonColor: '#dc3545'
            });
        }
    };

    // Expose the main function globally so it can be called from manage-account.html
    window.fetchWorkersList = fetchWorkersList;

    // Auto-load workers when the script is loaded
    document.addEventListener('DOMContentLoaded', function () {
        // Only auto-load if we're on the manage-account page and workers view is active
        if (document.body.dataset.page === 'manage-account') {
            fetchWorkersList();
        }
    });

})();

