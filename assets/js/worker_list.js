// Worker List Management
(function() {
    // Configuration
    const API_BASE_URL = 'https://mwms.megacess.com/api/v1';
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
            console.error('No authentication token found. Please log in.');
            // Redirect to login page
            window.location.href = '/megacessweb/pages/log-in.html';
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
            console.log('Worker list - Image path:', imgPath, 'for worker:', worker.staff_fullname);
            // Check if it's a full URL or relative path
            if (imgPath.startsWith('http://') || imgPath.startsWith('https://')) {
                imageSrc = imgPath;
            } else {
                // Construct full URL using API base URL
                imageSrc = `https://mwms.megacess.com/${imgPath.startsWith('/') ? imgPath.substring(1) : imgPath}`;
            }
            console.log('Worker list - Final image URL:', imageSrc);
        } else {
            console.log('Worker list - No image for worker:', worker.staff_fullname, 'staff_img:', worker.staff_img);
        }
        
        return `
            <div class="list-group-item worker-list-item ${claimedStatus}">
                <div class="d-flex align-items-center">
                    <div style="width:48px;height:48px;flex:0 0 48px;">
                        <img src="${imageSrc}" 
                             alt="${userName}" 
                             class="rounded-circle" 
                             style="width:48px;height:48px;object-fit:cover;background:#6c757d;" 
                             onerror="if(this.src!=='${placeholderImage}'){this.src='${placeholderImage}';}">
                    </div>
                    <div class="flex-grow-1 ms-3">
                        <div class="d-flex justify-content-between align-items-start">
                            <div>
                                <div class="fw-semibold">${highlightedName}</div>
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
        // Always show pagination bar, even if only 1 page
        let paginationHTML = `
            <nav aria-label="Worker list pagination" class="mt-4">
                <ul class="pagination justify-content-center" style="background:#effaf3; border-radius:8px; padding:8px 16px;">
        `;
        // Previous button
        paginationHTML += `
            <li class="page-item${currentPage === 1 ? ' disabled' : ''}">
                <button class="page-link" style="background:transparent; border:none; color:#007bff;" onclick="fetchWorkersList('${currentSearch}', ${currentPage - 1}, '${currentGender}')" ${currentPage === 1 ? 'disabled' : ''}>Previous</button>
            </li>
        `;
        // Only show one page button if totalPages === 1
        if (totalPages === 1) {
            paginationHTML += `
                <li class="page-item active">
                    <button class="page-link" style="background:#007bff;color:#fff;border:none;">1</button>
                </li>
            `;
        } else {
            for (let i = 1; i <= totalPages; i++) {
                paginationHTML += `
                    <li class="page-item${i === currentPage ? ' active' : ''}">
                        <button class="page-link" style="${i === currentPage ? 'background:#007bff;color:#fff;border:none;' : 'background:transparent; border:none; color:#007bff;'}" onclick="fetchWorkersList('${currentSearch}', ${i}, '${currentGender}')">${i}</button>
                    </li>
                `;
            }
        }
        // Next button
        paginationHTML += `
            <li class="page-item${currentPage === totalPages ? ' disabled' : ''}">
                <button class="page-link" style="background:transparent; border:none; color:#007bff;" onclick="fetchWorkersList('${currentSearch}', ${currentPage + 1}, '${currentGender}')" ${currentPage === totalPages ? 'disabled' : ''}>Next</button>
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
        const searchMessage = currentSearch ? 
            `No workers found matching "${currentSearch}".` : 
            'No workers have been registered yet.';
            
        workersView.innerHTML = `
            <div class="list-group text-start">
                <div class="list-group-item text-center py-5">
                    <i class="bi bi-people display-1 text-muted mb-3"></i>
                    <h5 class="text-muted">No workers found</h5>
                    <p class="text-muted">${searchMessage}</p>
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
            
            let filteredData = result.data;
            let filteredMeta = result.meta;
            
            // Filter to only show workers (exclude staff with roles: checker, manager, admin)
            filteredData = filteredData.filter(worker => {
                // Only show entries without a role or with role explicitly set to 'worker'
                return !worker.role || worker.role === '' || worker.role.toLowerCase() === 'worker';
            });
            
            // Apply client-side filtering as fallback if API doesn't filter properly
            if (search && search.trim() && filteredData.length > 0) {
                const searchTerm = search.trim().toLowerCase();
                console.log('Applying client-side search filter for:', searchTerm);
                
                filteredData = filteredData.filter(worker => {
                    return worker.staff_fullname && worker.staff_fullname.toLowerCase().includes(searchTerm);
                });
            }
            
            // Update meta information for filtered results
            if (filteredMeta) {
                filteredMeta.total = filteredData.length;
                filteredMeta.last_page = Math.ceil(filteredData.length / (filteredMeta.per_page || DEFAULT_PER_PAGE));
                filteredMeta.current_page = page;
            }
            
            if (filteredData.length === 0) {
                showEmpty(search, gender);
                return;
            }
            
            // Render workers in list format
            let workersHTML = `
                <div class="list-group text-start">
                    ${filteredData.map(worker => createWorkerListItem(worker)).join('')}
                </div>
            `;
            
            // Add pagination if available
            if (filteredMeta) {
                const totalPages = filteredMeta.last_page || 1;
                const totalItems = filteredMeta.total || filteredData.length;
                workersHTML += createPaginationHTML(page, totalPages, totalItems, search, gender);
            }
            
            workersView.innerHTML = workersHTML;
            
        } catch (error) {
            console.error('Error fetching workers:', error);
            showError(error.message || 'Failed to load workers. Please try again.', search, gender);
        }
    }
    
    // Worker action functions
    window.viewWorkerDetails = async function(workerId) {
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
            console.error('Error fetching worker details:', error);
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
                    <div class="spinner-border text-primary" role="status">
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
                console.log('Modal - Image path from API:', imgPath);
                console.log('Modal - Worker data:', worker);
                // Check if it's a full URL or relative path
                if (imgPath.startsWith('http://') || imgPath.startsWith('https://')) {
                    imageSrc = imgPath;
                } else {
                    // Construct full URL using API base URL
                    imageSrc = `https://mwms.megacess.com/${imgPath.startsWith('/') ? imgPath.substring(1) : imgPath}`;
                }
                console.log('Modal - Final image URL:', imageSrc);
            } else {
                console.log('Modal - No image, worker.staff_img:', worker.staff_img);
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
                                <input type="text" class="form-control form-control-sm" value="${displayValue(worker.staff_ic) !== '-' ? displayValue(worker.staff_ic) : worker.id}" readonly>
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
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            ${modalContent}
                        </div>
                        <div class="modal-footer">
                            ${!workerData.loading && !workerData.error ? `
                                <button type="button" class="btn btn-primary" onclick="editWorker(${workerData.id})">
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
    
    window.editWorker = function(workerId) {
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
                input.setAttribute('name', 'staff_ic');
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
                // Replace gender input with select
                const currentValue = input.value.toLowerCase();
                const selectHTML = `
                    <select class="form-control form-control-sm border-primary" name="staff_gender" required>
                        <option value="">Select Gender</option>
                        <option value="male" ${currentValue === 'male' ? 'selected' : ''}>Male</option>
                        <option value="female" ${currentValue === 'female' ? 'selected' : ''}>Female</option>
                        <option value="other" ${currentValue === 'other' ? 'selected' : ''}>Other</option>
                    </select>
                `;
                input.outerHTML = selectHTML;
                return; // Skip further processing for this field
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
            changePhotoBtn.onclick = function() {
                document.getElementById('workerDetailsImageInput').click();
            };
            imageContainer.querySelector('div').appendChild(changePhotoBtn);
            
            // Add image preview functionality
            const imageInput = document.getElementById('workerDetailsImageInput');
            const imagePreview = document.getElementById('workerDetailsImagePreview');
            
            if (imageInput && imagePreview) {
                imageInput.addEventListener('change', function(e) {
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
                        reader.onload = function(event) {
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
    window.cancelEditMode = function(workerId) {
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
    window.saveWorkerChanges = async function(workerId) {
        try {
            const modal = document.getElementById('workerDetailsModal');
            if (!modal) return;
            
            const modalBody = modal.querySelector('.modal-body');
            
            // Check if there's an image file to upload
            const imageInput = document.getElementById('workerDetailsImageInput');
            const imageFile = imageInput && imageInput.files.length > 0 ? imageInput.files[0] : null;
            
            // Use FormData if there's an image, otherwise use JSON
            let requestBody;
            let headers = {
                'Authorization': `Bearer ${getAuthToken()}`,
                'Accept': 'application/json'
            };
            
            if (imageFile) {
                // Use FormData for file upload
                const formData = new FormData();
                
                // Collect all input values
                const inputs = modalBody.querySelectorAll('input:not([type="file"]), select');
                
                inputs.forEach(input => {
                    const name = input.getAttribute('name');
                    if (name) {
                        let value = input.value.trim();
                        // Only include password if it's not empty
                        if (name === 'staff_password') {
                            if (value !== '') {
                                formData.append(name, value);
                            }
                        } else if (value !== '') {
                            formData.append(name, value);
                        }
                    }
                });
                
                // Add image file
                formData.append('staff_img', imageFile);
                requestBody = formData;
                // Don't set Content-Type for FormData, browser will set it with boundary
            } else {
                // Use JSON for regular update
                const workerData = {};
                const inputs = modalBody.querySelectorAll('input, select');
                
                inputs.forEach(input => {
                    const name = input.getAttribute('name');
                    if (name) {
                        let value = input.value.trim();
                        // Convert empty values to null, except for password
                        if (name === 'staff_password') {
                            // Only include password if it's not empty (user wants to change it)
                            if (value !== '') {
                                workerData[name] = value;
                            }
                        } else {
                            workerData[name] = value !== '' ? value : null;
                        }
                    }
                });
                
                requestBody = JSON.stringify(workerData);
                headers['Content-Type'] = 'application/json';
                
                // Validate required fields
                if (!workerData.staff_fullname) {
                    alert('Full Name is required');
                    return;
                }
                if (!workerData.staff_phone) {
                    alert('Phone Number is required');
                    return;
                }
                if (!workerData.staff_dob) {
                    alert('Date of Birth is required');
                    return;
                }
                if (!workerData.staff_gender) {
                    alert('Gender is required');
                    return;
                }
            }
            
            // Disable save button and show loading state
            const saveButton = event.target;
            const originalButtonText = saveButton.innerHTML;
            saveButton.disabled = true;
            saveButton.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Saving...';
            
            // Make PUT request to update worker
            const response = await fetch(`${API_BASE_URL}/staff/${workerId}`, {
                method: 'PUT',
                headers: headers,
                body: requestBody
            });
            
            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error('Authentication failed. Please log in again.');
                } else if (response.status === 403) {
                    throw new Error('Access denied. You do not have permission to edit this worker.');
                } else if (response.status === 404) {
                    throw new Error('Worker not found.');
                } else if (response.status === 422) {
                    const errorData = await response.json();
                    const errorMessages = Object.values(errorData.errors || {}).flat().join(', ');
                    throw new Error(errorMessages || 'Validation failed. Please check your input.');
                } else {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
            }
            
            const result = await response.json();
            
            console.log('Save response:', result);
            
            // Show success message
            alert('Worker details updated successfully!');
            
            // Close the modal
            const modalInstance = bootstrap.Modal.getInstance(modal);
            if (modalInstance) {
                modalInstance.hide();
            }
            
            // Refresh the worker list to show updated data including image
            setTimeout(() => {
                fetchWorkersList(currentSearch, currentPage);
            }, 300);
            
        } catch (error) {
            console.error('Error saving worker changes:', error);
            alert(`Failed to save changes: ${error.message}`);
            
            // Re-enable save button
            const saveButton = event.target;
            if (saveButton) {
                saveButton.disabled = false;
                saveButton.innerHTML = '<i class="bi bi-save me-1"></i>Save Changes';
            }
        }
    };
    
    window.deleteWorker = async function(workerId) {
        // Show confirmation dialog
        if (!confirm('Delete this worker?')) {
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
            
            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error('Authentication failed. Please log in again.');
                } else if (response.status === 403) {
                    throw new Error('Access denied. You do not have permission to delete this worker.');
                } else if (response.status === 404) {
                    throw new Error('Worker not found.');
                } else {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
            }
            
            const result = await response.json();
            
            // Show success message
            alert(result.message || 'Worker deleted successfully!');
            
            // Refresh the worker list
            fetchWorkersList(currentSearch, currentPage);
            
        } catch (error) {
            console.error('Error deleting worker:', error);
            alert(`Failed to delete worker: ${error.message}`);
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
