// API Endpoint Constants
const USERS_API_URL = `${API_URL}/users`;
const STAFF_API_URL = `${API_URL}/staff`;
const STAFF_MY_STAFF_API_URL = `${API_URL}/staff/my-staff`;
const STAFF_CLAIM_API_URL = `${API_URL}/staff/claim`;
const STAFF_UNCLAIM_API_URL = `${API_URL}/staff`;

document.addEventListener('DOMContentLoaded', function () {
    const searchInput = document.getElementById('searchInput');
    const mandorListContainer = document.getElementById('mandorList');
    const mandorListView = document.getElementById('mandorListView');
    const workerDetailView = document.getElementById('workerDetailView');
    const backToMandorListBtn = document.getElementById('backToMandorList');
    const selectedMandorNameSpan = document.getElementById('selectedMandorName');
    const workerListContainer = document.getElementById('workerList');
    const assignWorkerBtn = document.getElementById('assignWorkerBtn');
    const workerSearchInput = document.getElementById('workerSearchInput');
    const selectWorkerModal = new bootstrap.Modal(document.getElementById('selectWorkerModal'));
    const unassignedWorkersListContainer = document.getElementById('unassignedWorkersList');
    const unassignedWorkerSearchInput = document.getElementById('unassignedWorkerSearchInput');
    const saveAssignmentBtn = document.getElementById('saveAssignmentBtn');

    let searchTimeout;
    let workerSearchTimeout;
    let unassignedSearchTimeout;
    let selectedMandor = null;
    let allWorkers = []; // Store all workers for filtering
    let allUnassignedWorkers = []; // Store all unassigned workers for filtering
    let selectedWorkerIds = []; // Store selected worker IDs

    // Pagination state
    let mandorCurrentPage = 1;
    let mandorTotalPages = 1;
    let mandorListData = [];
    let workerCurrentPage = 1;
    let workerTotalPages = 1;
    let workerListData = [];
    const ROWS_PER_PAGE = 10;

    // Fetch mandor list
    function fetchMandorList(searchQuery = '') {
        const token = localStorage.getItem('authToken') || localStorage.getItem('token');

        if (!token) {
            console.error('No authentication token found');
            mandorListContainer.innerHTML = `
                <div class="alert alert-warning">
                    Please log in to view mandor list.
                </div>
            `;
            return;
        }

        // Show loading spinner
        mandorListContainer.innerHTML = `
            <div class="text-center py-5">
                <div class="spinner-border text-success" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-3 text-muted">Loading mandor list...</p>
            </div>
        `;

        const url = new URL(USERS_API_URL);
        url.searchParams.append('role', 'mandor');
        if (searchQuery) {
            url.searchParams.append('search', searchQuery);
        }

        fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        })
            .then(response => {
                if (response.status === 401) {
                    localStorage.removeItem('token');
                    window.location.href = '../pages/log-in.html';
                    return;
                }
                return response.json();
            })
            .then(data => {
                if (data && data.data) {
                    displayMandorList(data.data);
                }
            })
            .catch(error => {
                console.error('Error fetching mandor list:', error);
                mandorListContainer.innerHTML = `
                <div class="alert alert-danger">
                    Failed to load mandor list. Please try again.
                </div>
            `;
            });
    }

    // Display mandor list with pagination
    function displayMandorList(mandorList) {
        mandorListData = mandorList;
        mandorTotalPages = Math.ceil(mandorList.length / ROWS_PER_PAGE) || 1;
        renderMandorPage();
    }

    function renderMandorPage() {
        const startIdx = (mandorCurrentPage - 1) * ROWS_PER_PAGE;
        const endIdx = startIdx + ROWS_PER_PAGE;
        const pageMandors = mandorListData.slice(startIdx, endIdx);
        const mandorListContainer = document.getElementById('mandorList');
        if (pageMandors.length === 0) {
            mandorListContainer.innerHTML = `
                <div class="alert alert-info">
                    No mandor found.
                </div>
            `;
        } else {
            mandorListContainer.innerHTML = pageMandors.map(mandor => {
                const workerCount = mandor.staff_count || 0;

                // Handle image URL - prepend base URL if path is relative
                let imageUrl = mandor.user_img;
                if (imageUrl && !imageUrl.startsWith('http')) {
                    imageUrl = `${STORAGE_DOMAIN}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
                }

                const profileImage = imageUrl
                    ? `<img src="${imageUrl}" 
                            alt="${mandor.user_fullname}" 
                            class="rounded-circle" 
                            style="width: 60px; height: 60px; object-fit: cover;"
                            onerror="this.onerror=null; this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2260%22 height=%2260%22%3E%3Ccircle cx=%2230%22 cy=%2230%22 r=%2230%22 fill=%22%23212529%22/%3E%3Cpath d=%22M30 28c3.31 0 6-2.69 6-6s-2.69-6-6-6-6 2.69-6 6 2.69 6 6 6zm0 3c-4.42 0-8 3.58-8 8v3h16v-3c0-4.42-3.58-8-8-8z%22 fill=%22white%22/%3E%3C/svg%3E';">`
                    : `<img src="data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2260%22 height=%2260%22%3E%3Ccircle cx=%2230%22 cy=%2230%22 r=%2230%22 fill=%22%23212529%22/%3E%3Cpath d=%22M30 28c3.31 0 6-2.69 6-6s-2.69-6-6-6-6 2.69-6 6 2.69 6 6 6zm0 3c-4.42 0-8 3.58-8 8v3h16v-3c0-4.42-3.58-8-8-8z%22 fill=%22white%22/%3E%3C/svg%3E" 
                     alt="${mandor.user_fullname}" 
                     class="rounded-circle" 
                     style="width: 60px; height: 60px; object-fit: cover;">`;

                return `
                    <div class="card mb-3 mandor-card" style="cursor: pointer;" data-mandor-id="${mandor.id}" data-mandor-name="${mandor.user_fullname}">
                        <div class="card-body">
                            <div class="d-flex align-items-center justify-content-between">
                                <div class="d-flex align-items-center gap-3">
                                    ${profileImage}
                                    <div>
                                        <h5 class="mb-0 fw-bold">${mandor.user_fullname}</h5>
                                        <p class="mb-0 text-muted">Mandor</p>
                                    </div>
                                </div>
                                <div class="bg-light px-4 py-2 rounded">
                                    <span class="text-dark">Worker : <strong>${workerCount}</strong></span>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }
        // Pagination controls
        renderMandorPagination();
        // Add click event listeners to mandor cards
        document.querySelectorAll('.mandor-card').forEach(card => {
            card.addEventListener('click', function () {
                const mandorId = this.getAttribute('data-mandor-id');
                const mandorName = this.getAttribute('data-mandor-name');
                showWorkerDetail(mandorId, mandorName);
            });
        });
    }

    function renderMandorPagination() {
        const container = document.getElementById('mandorList');

        // Don't show pagination if only 1 page
        if (mandorTotalPages <= 1) return;

        const paginationDiv = document.createElement('div');
        paginationDiv.className = 'mt-3 text-center';

        // Previous button with chevron icon
        const prevBtn = document.createElement('button');
        prevBtn.className = 'btn btn-sm btn-outline-success mx-1';
        prevBtn.innerHTML = '<i class="bi bi-chevron-left"></i>';
        prevBtn.disabled = mandorCurrentPage === 1;
        prevBtn.addEventListener('click', () => {
            if (mandorCurrentPage > 1) {
                mandorCurrentPage--;
                renderMandorPage();
            }
        });
        paginationDiv.appendChild(prevBtn);

        // Smart page buttons with ellipsis (max 7 buttons)
        let pages = [];
        if (mandorTotalPages <= 7) {
            // Show all pages if 7 or fewer
            pages = Array.from({ length: mandorTotalPages }, (_, i) => i + 1);
        } else {
            // Smart ellipsis logic
            if (mandorCurrentPage <= 4) {
                // Near start: [1] [2] [3] [4] [5] [...] [last]
                pages = [1, 2, 3, 4, 5, '...', mandorTotalPages];
            } else if (mandorCurrentPage >= mandorTotalPages - 3) {
                // Near end: [1] [...] [last-4] [last-3] [last-2] [last-1] [last]
                pages = [1, '...', mandorTotalPages - 4, mandorTotalPages - 3, mandorTotalPages - 2, mandorTotalPages - 1, mandorTotalPages];
            } else {
                // Middle: [1] [...] [current-1] [current] [current+1] [...] [last]
                pages = [1, '...', mandorCurrentPage - 1, mandorCurrentPage, mandorCurrentPage + 1, '...', mandorTotalPages];
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
                pageBtn.className = `btn btn-sm mx-1 ${page === mandorCurrentPage ? 'btn-success' : 'btn-outline-success'}`;
                pageBtn.textContent = page;
                pageBtn.addEventListener('click', () => {
                    mandorCurrentPage = page;
                    renderMandorPage();
                });
                paginationDiv.appendChild(pageBtn);
            }
        });

        // Next button with chevron icon
        const nextBtn = document.createElement('button');
        nextBtn.className = 'btn btn-sm btn-outline-success mx-1';
        nextBtn.innerHTML = '<i class="bi bi-chevron-right"></i>';
        nextBtn.disabled = mandorCurrentPage === mandorTotalPages;
        nextBtn.addEventListener('click', () => {
            if (mandorCurrentPage < mandorTotalPages) {
                mandorCurrentPage++;
                renderMandorPage();
            }
        });
        paginationDiv.appendChild(nextBtn);

        container.appendChild(paginationDiv);
    }

    // Fetch workers by mandor (placeholder function)
    function fetchWorkersByMandor(mandorId) {
        const token = localStorage.getItem('authToken') || localStorage.getItem('token');

        if (!token) {
            console.error('No authentication token found');
            workerListContainer.innerHTML = `
                <div class="alert alert-warning">
                    Please log in to view workers.
                </div>
            `;
            return;
        }

        // Show loading spinner
        workerListContainer.innerHTML = `
            <div class="text-center py-5">
                <div class="spinner-border text-success" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-3 text-muted">Loading workers...</p>
            </div>
        `;

        const url = new URL(STAFF_MY_STAFF_API_URL);
        url.searchParams.append('user_id', mandorId);

        fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        })
            .then(response => {
                if (response.status === 401) {
                    localStorage.removeItem('token');
                    localStorage.removeItem('authToken');
                    window.location.href = '/pages/log-in.html';
                    return null;
                }
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (!data) return; // Handle 401 redirect case

                if (data && data.data && data.data.staff) {
                    // Workers are in data.data.staff
                    const workerList = Array.isArray(data.data.staff) ? data.data.staff : [];
                    allWorkers = workerList; // Store for filtering
                    displayWorkerList(workerList);
                } else {
                    allWorkers = [];
                    displayWorkerList([]);
                }
            })
            .catch(error => {
                console.error('Error fetching workers:', error);
                workerListContainer.innerHTML = `
                <div class="alert alert-danger">
                    Failed to load workers. Please try again.
                </div>
            `;
            });
    }

    // Display worker list with pagination
    function displayWorkerList(workerList) {
        workerListData = workerList;
        workerTotalPages = Math.ceil(workerList.length / ROWS_PER_PAGE) || 1;
        renderWorkerPage();
    }

    function renderWorkerPage() {
        const startIdx = (workerCurrentPage - 1) * ROWS_PER_PAGE;
        const endIdx = startIdx + ROWS_PER_PAGE;
        const pageWorkers = workerListData.slice(startIdx, endIdx);
        const workerListContainer = document.getElementById('workerList');
        if (pageWorkers.length === 0) {
            workerListContainer.innerHTML = `
                <div class="text-center py-5">
                    <p class="text-muted">No assigned worker</p>
                </div>
            `;
        } else {
            workerListContainer.innerHTML = pageWorkers.map(worker => {
                // Handle image URL - prepend base URL if path is relative
                let imageUrl = worker.staff_img;
                if (imageUrl && !imageUrl.startsWith('http')) {
                    imageUrl = `${STORAGE_DOMAIN}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
                }

                const profileImage = imageUrl
                    ? `<img src="${imageUrl}" 
                            alt="${worker.staff_fullname}" 
                            class="rounded-circle" 
                            style="width: 60px; height: 60px; object-fit: cover;"
                            onerror="this.onerror=null; this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2260%22 height=%2260%22%3E%3Ccircle cx=%2230%22 cy=%2230%22 r=%2230%22 fill=%22%23212529%22/%3E%3Cpath d=%22M30 28c3.31 0 6-2.69 6-6s-2.69-6-6-6-6 2.69-6 6 2.69 6 6 6zm0 3c-4.42 0-8 3.58-8 8v3h16v-3c0-4.42-3.58-8-8-8z%22 fill=%22white%22/%3E%3C/svg%3E';">`
                    : `<img src="data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2260%22 height=%2260%22%3E%3Ccircle cx=%2230%22 cy=%2230%22 r=%2230%22 fill=%22%23212529%22/%3E%3Cpath d=%22M30 28c3.31 0 6-2.69 6-6s-2.69-6-6-6-6 2.69-6 6 2.69 6 6 6zm0 3c-4.42 0-8 3.58-8 8v3h16v-3c0-4.42-3.58-8-8-8z%22 fill=%22white%22/%3E%3C/svg%3E" 
                     alt="${worker.staff_fullname}" 
                     class="rounded-circle" 
                     style="width: 60px; height: 60px; object-fit: cover;">`;

                return `
                    <div class="card mb-3 worker-card" data-worker-id="${worker.id}">
                        <div class="card-body">
                            <div class="d-flex align-items-center gap-3">
                                ${profileImage}
                                <div>
                                    <h5 class="mb-0 fw-bold">${worker.staff_fullname}</h5>
                                    <p class="mb-0 text-muted small">${worker.staff_phone || 'No phone number'}</p>
                                </div>
                                <button class="btn btn-outline-danger ms-auto remove-worker-btn" type="button">Remove</button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }
        // Pagination controls
        renderWorkerPagination();
        // Add event listeners for Remove buttons
        setTimeout(() => {
            document.querySelectorAll('.remove-worker-btn').forEach(btn => {
                btn.addEventListener('click', function (e) {
                    const workerCard = e.target.closest('.worker-card');
                    const staffId = workerCard.getAttribute('data-worker-id');
                    if (!staffId || !selectedMandor) return;
                    const token = localStorage.getItem('authToken') || localStorage.getItem('token');
                    if (!token) {
                        Swal.fire({
                            icon: 'warning',
                            title: 'Authentication Required',
                            text: 'Please log in to remove workers.',
                            confirmButtonColor: '#0d6832'
                        });
                        return;
                    }

                    Swal.fire({
                        title: 'Remove Worker?',
                        text: 'Are you sure you want to unassign this worker?',
                        icon: 'warning',
                        showCancelButton: true,
                        confirmButtonColor: '#dc3545',
                        cancelButtonColor: '#6c757d',
                        confirmButtonText: 'Yes, remove',
                        cancelButtonText: 'Cancel'
                    }).then((result) => {
                        if (result.isConfirmed) {
                            btn.disabled = true;
                            btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Removing...';
                            fetch(`${STAFF_UNCLAIM_API_URL}/${staffId}/unclaim`, {
                                method: 'DELETE',
                                headers: {
                                    'Authorization': `Bearer ${token}`,
                                    'Content-Type': 'application/json',
                                    'Accept': 'application/json'
                                }
                            })
                                .then(response => {
                                    if (response.status === 401) {
                                        localStorage.removeItem('token');
                                        localStorage.removeItem('authToken');
                                        window.location.href = '/pages/log-in.html';
                                        return null;
                                    }
                                    return response.json();
                                })
                                .then(data => {
                                    btn.disabled = false;
                                    btn.innerHTML = 'Remove';
                                    if (data && data.success) {
                                        Swal.fire({
                                            icon: 'success',
                                            title: 'Removed!',
                                            text: 'Worker unassigned successfully.',
                                            confirmButtonColor: '#0d6832'
                                        });
                                        fetchWorkersByMandor(selectedMandor.id);
                                    } else {
                                        Swal.fire({
                                            icon: 'error',
                                            title: 'Failed',
                                            text: data && data.message ? data.message : 'Failed to remove worker.',
                                            confirmButtonColor: '#0d6832'
                                        });
                                    }
                                })
                                .catch(error => {
                                    btn.disabled = false;
                                    btn.innerHTML = 'Remove';
                                    Swal.fire({
                                        icon: 'error',
                                        title: 'Error',
                                        text: 'Failed to remove worker. Please try again.',
                                        confirmButtonColor: '#0d6832'
                                    });
                                });
                        }
                    });
                });
            });
        }, 0);
    }

    function renderWorkerPagination() {
        const container = document.getElementById('workerList');

        // Don't show pagination if only 1 page
        if (workerTotalPages <= 1) return;

        const paginationDiv = document.createElement('div');
        paginationDiv.className = 'mt-3 text-center';

        // Previous button with chevron icon
        const prevBtn = document.createElement('button');
        prevBtn.className = 'btn btn-sm btn-outline-success mx-1';
        prevBtn.innerHTML = '<i class="bi bi-chevron-left"></i>';
        prevBtn.disabled = workerCurrentPage === 1;
        prevBtn.addEventListener('click', () => {
            if (workerCurrentPage > 1) {
                workerCurrentPage--;
                renderWorkerPage();
            }
        });
        paginationDiv.appendChild(prevBtn);

        // Smart page buttons with ellipsis (max 7 buttons)
        let pages = [];
        if (workerTotalPages <= 7) {
            // Show all pages if 7 or fewer
            pages = Array.from({ length: workerTotalPages }, (_, i) => i + 1);
        } else {
            // Smart ellipsis logic
            if (workerCurrentPage <= 4) {
                // Near start: [1] [2] [3] [4] [5] [...] [last]
                pages = [1, 2, 3, 4, 5, '...', workerTotalPages];
            } else if (workerCurrentPage >= workerTotalPages - 3) {
                // Near end: [1] [...] [last-4] [last-3] [last-2] [last-1] [last]
                pages = [1, '...', workerTotalPages - 4, workerTotalPages - 3, workerTotalPages - 2, workerTotalPages - 1, workerTotalPages];
            } else {
                // Middle: [1] [...] [current-1] [current] [current+1] [...] [last]
                pages = [1, '...', workerCurrentPage - 1, workerCurrentPage, workerCurrentPage + 1, '...', workerTotalPages];
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
                pageBtn.className = `btn btn-sm mx-1 ${page === workerCurrentPage ? 'btn-success' : 'btn-outline-success'}`;
                pageBtn.textContent = page;
                pageBtn.addEventListener('click', () => {
                    workerCurrentPage = page;
                    renderWorkerPage();
                });
                paginationDiv.appendChild(pageBtn);
            }
        });

        // Next button with chevron icon
        const nextBtn = document.createElement('button');
        nextBtn.className = 'btn btn-sm btn-outline-success mx-1';
        nextBtn.innerHTML = '<i class="bi bi-chevron-right"></i>';
        nextBtn.disabled = workerCurrentPage === workerTotalPages;
        nextBtn.addEventListener('click', () => {
            if (workerCurrentPage < workerTotalPages) {
                workerCurrentPage++;
                renderWorkerPage();
            }
        });
        paginationDiv.appendChild(nextBtn);

        container.appendChild(paginationDiv);
    }

    // Display unassigned workers in modal
    function displayUnassignedWorkers(workerList) {
        if (workerList.length === 0) {
            unassignedWorkersListContainer.innerHTML = `
                <div class="text-center py-4">
                    <p class="text-muted">No unassigned workers available</p>
                </div>
            `;
            return;
        }

        unassignedWorkersListContainer.innerHTML = workerList.map(worker => {
            const isChecked = selectedWorkerIds.includes(worker.id) ? 'checked' : '';

            return `
                <div class="border-bottom py-3 unassigned-worker-item" data-worker-id="${worker.id}">
                    <div class="d-flex align-items-center justify-content-between">
                        <span>${worker.staff_fullname}</span>
                        <div class="form-check">
                            <input class="form-check-input worker-checkbox" type="checkbox" value="${worker.id}" ${isChecked} data-worker-name="${worker.staff_fullname}">
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Add event listeners to checkboxes
        document.querySelectorAll('.worker-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', function () {
                const workerId = parseInt(this.value);
                if (this.checked) {
                    if (!selectedWorkerIds.includes(workerId)) {
                        selectedWorkerIds.push(workerId);
                    }
                } else {
                    selectedWorkerIds = selectedWorkerIds.filter(id => id !== workerId);
                }
            });
        });
    }

    // Open assign worker modal
    assignWorkerBtn.addEventListener('click', function () {
        selectedWorkerIds = []; // Reset selected workers
        unassignedWorkerSearchInput.value = ''; // Clear search

        // Show modal
        selectWorkerModal.show();

        // Fetch unassigned workers (placeholder for now)
        fetchUnassignedWorkers();
    });

    // Fetch unassigned workers (placeholder function)
    function fetchUnassignedWorkers() {
        const token = localStorage.getItem('authToken') || localStorage.getItem('token');

        if (!token) {
            console.error('No authentication token found');
            unassignedWorkersListContainer.innerHTML = `
                <div class="alert alert-warning">
                    Please log in to view workers.
                </div>
            `;
            return;
        }

        // Show loading spinner
        unassignedWorkersListContainer.innerHTML = `
            <div class="text-center py-4">
                <div class="spinner-border text-success" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-3 text-muted">Loading workers...</p>
            </div>
        `;

        const url = new URL(STAFF_API_URL);
        url.searchParams.append('claimed', '0');

        fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        })
            .then(response => {
                if (response.status === 401) {
                    localStorage.removeItem('token');
                    localStorage.removeItem('authToken');
                    window.location.href = '/pages/log-in.html';
                    return null;
                }
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (!data) return; // Handle 401 redirect case

                if (data && data.data) {
                    // Ensure data.data is an array
                    const workerList = Array.isArray(data.data) ? data.data : [];
                    allUnassignedWorkers = workerList; // Store for filtering
                    displayUnassignedWorkers(workerList);
                } else {
                    allUnassignedWorkers = [];
                    displayUnassignedWorkers([]);
                }
            })
            .catch(error => {
                console.error('Error fetching unassigned workers:', error);
                unassignedWorkersListContainer.innerHTML = `
                <div class="alert alert-danger">
                    Failed to load workers. Please try again.
                </div>
            `;
            });
    }

    // Unassigned worker search functionality
    unassignedWorkerSearchInput.addEventListener('input', function (e) {
        clearTimeout(unassignedSearchTimeout);
        unassignedSearchTimeout = setTimeout(() => {
            const searchQuery = e.target.value.trim().toLowerCase();

            if (searchQuery === '') {
                // Show all unassigned workers if search is empty
                displayUnassignedWorkers(allUnassignedWorkers);
            } else {
                // Filter workers by name
                const filteredWorkers = allUnassignedWorkers.filter(worker =>
                    worker.staff_fullname.toLowerCase().includes(searchQuery)
                );
                displayUnassignedWorkers(filteredWorkers);
            }
        }, 300);
    });

    // Save assignment - Assign workers to mandor
    saveAssignmentBtn.addEventListener('click', function () {
        if (!selectedMandor) {
            console.error('No mandor selected');
            return;
        }

        if (selectedWorkerIds.length === 0) {
            Swal.fire({
                icon: 'warning',
                title: 'No Workers Selected',
                text: 'Please select at least one worker to assign.',
                confirmButtonColor: '#0d6832'
            });
            return;
        }

        const token = localStorage.getItem('authToken') || localStorage.getItem('token');

        if (!token) {
            console.error('No authentication token found');
            Swal.fire({
                icon: 'warning',
                title: 'Authentication Required',
                text: 'Please log in to assign workers.',
                confirmButtonColor: '#0d6832'
            });
            return;
        }

        // Disable save button and show loading state
        saveAssignmentBtn.disabled = true;
        saveAssignmentBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Saving...';

        // Create array of promises for all assignments
        const assignmentPromises = selectedWorkerIds.map(staffId => {
            return fetch(STAFF_CLAIM_API_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    staff_id: staffId,
                    user_id: parseInt(selectedMandor.id)
                })
            })
                .then(response => {
                    if (response.status === 401) {
                        localStorage.removeItem('token');
                        localStorage.removeItem('authToken');
                        window.location.href = '/pages/log-in.html';
                        return null;
                    }
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    return response.json();
                });
        });

        // Execute all assignments
        Promise.all(assignmentPromises)
            .then(results => {
                // Close modal
                selectWorkerModal.hide();

                // Reset button state
                saveAssignmentBtn.disabled = false;
                saveAssignmentBtn.innerHTML = 'Save';

                // Clear selected workers
                selectedWorkerIds = [];

                // Refresh worker list for current mandor
                fetchWorkersByMandor(selectedMandor.id);

                // Show success message
                Swal.fire({
                    icon: 'success',
                    title: 'Success!',
                    text: `Successfully assigned ${results.length} worker(s) to ${selectedMandor.name}`,
                    confirmButtonColor: '#0d6832'
                });
            })
            .catch(error => {
                console.error('Error assigning workers:', error);

                // Reset button state
                saveAssignmentBtn.disabled = false;
                saveAssignmentBtn.innerHTML = 'Save';

                Swal.fire({
                    icon: 'error',
                    title: 'Failed',
                    text: 'Failed to assign workers. Please try again.',
                    confirmButtonColor: '#0d6832'
                });
            });
    });

    // Back to mandor list
    backToMandorListBtn.addEventListener('click', function () {
        workerDetailView.style.display = 'none';
        mandorListView.style.display = 'block';
        selectedMandor = null;
        allWorkers = [];
        workerSearchInput.value = ''; // Clear worker search
    });

    // Worker search functionality
    workerSearchInput.addEventListener('input', function (e) {
        clearTimeout(workerSearchTimeout);
        workerSearchTimeout = setTimeout(() => {
            const searchQuery = e.target.value.trim().toLowerCase();

            if (searchQuery === '') {
                // Show all workers if search is empty
                displayWorkerList(allWorkers);
            } else {
                // Filter workers by name
                const filteredWorkers = allWorkers.filter(worker =>
                    worker.staff_fullname.toLowerCase().includes(searchQuery)
                );
                displayWorkerList(filteredWorkers);
            }
        }, 300);
    });

    // Mandor search functionality
    searchInput.addEventListener('input', function (e) {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            fetchMandorList(e.target.value.trim());
        }, 500);
    });

    // Initial load
    fetchMandorList();

    function showWorkerDetail(mandorId, mandorName) {
        selectedMandor = { id: mandorId, name: mandorName };
        selectedMandorNameSpan.textContent = `${mandorName}`;
        mandorListView.style.display = 'none';
        workerDetailView.style.display = 'block';
        workerCurrentPage = 1; // Reset worker page to 1 when switching mandor
        fetchWorkersByMandor(mandorId);
    }
});

