document.addEventListener('DOMContentLoaded', function() {
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

        const url = new URL('https://mwms.megacess.com/api/v1/users');
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
                window.location.href = '/megacessweb/pages/log-in.html';
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

    // Display mandor list
    function displayMandorList(mandorList) {
        if (mandorList.length === 0) {
            mandorListContainer.innerHTML = `
                <div class="alert alert-info">
                    No mandor found.
                </div>
            `;
            return;
        }

        mandorListContainer.innerHTML = mandorList.map(mandor => {
            const workerCount = mandor.staff_count || 0;
            
            // Handle image URL - prepend base URL if path is relative
            let imageUrl = mandor.user_img;
            if (imageUrl && !imageUrl.startsWith('http')) {
                imageUrl = `https://mwms.megacess.com${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
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

        // Add click event listeners to mandor cards
        document.querySelectorAll('.mandor-card').forEach(card => {
            card.addEventListener('click', function() {
                const mandorId = this.getAttribute('data-mandor-id');
                const mandorName = this.getAttribute('data-mandor-name');
                showWorkerDetail(mandorId, mandorName);
            });
        });
    }

    // Show worker detail view
    function showWorkerDetail(mandorId, mandorName) {
        selectedMandor = { id: mandorId, name: mandorName };
        selectedMandorNameSpan.textContent = `(${mandorName})`;
        
        // Hide mandor list view and show worker detail view
        mandorListView.style.display = 'none';
        workerDetailView.style.display = 'block';
        
        // Fetch workers for this mandor (placeholder for now)
        fetchWorkersByMandor(mandorId);
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

        const url = new URL('https://mwms.megacess.com/api/v1/staff/my-staff');
        url.searchParams.append('user_id', mandorId);

        console.log('Fetching workers for mandor ID:', mandorId);
        console.log('Request URL:', url.toString());

        fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        })
        .then(response => {
            console.log('Response status:', response.status);
            if (response.status === 401) {
                localStorage.removeItem('token');
                localStorage.removeItem('authToken');
                window.location.href = '/megacessweb/pages/log-in.html';
                return null;
            }
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (!data) return; // Handle 401 redirect case
            
            console.log('Workers API Response:', data);
            console.log('data.data type:', typeof data.data);
            console.log('data.data value:', data.data);
            
            if (data && data.data && data.data.staff) {
                // Workers are in data.data.staff
                const workerList = Array.isArray(data.data.staff) ? data.data.staff : [];
                console.log('Worker list length:', workerList.length);
                allWorkers = workerList; // Store for filtering
                displayWorkerList(workerList);
            } else {
                console.log('No staff found, showing empty list');
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

    // Display worker list
    function displayWorkerList(workerList) {
        if (workerList.length === 0) {
            workerListContainer.innerHTML = `
                <div class="text-center py-5">
                    <p class="text-muted">No assigned worker</p>
                </div>
            `;
            return;
        }

        workerListContainer.innerHTML = workerList.map(worker => {
            // Handle image URL - prepend base URL if path is relative
            let imageUrl = worker.staff_img;
            if (imageUrl && !imageUrl.startsWith('http')) {
                imageUrl = `https://mwms.megacess.com${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
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
                <div class="card mb-3">
                    <div class="card-body">
                        <div class="d-flex align-items-center gap-3">
                            ${profileImage}
                            <div>
                                <h5 class="mb-0 fw-bold">${worker.staff_fullname}</h5>
                                <p class="mb-0 text-muted small">${worker.staff_phone || 'No phone number'}</p>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
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
            checkbox.addEventListener('change', function() {
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
    assignWorkerBtn.addEventListener('click', function() {
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

        const url = new URL('https://mwms.megacess.com/api/v1/staff');
        url.searchParams.append('claimed', '0');

        console.log('Fetching unassigned workers');
        console.log('Request URL:', url.toString());

        fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        })
        .then(response => {
            console.log('Unassigned workers response status:', response.status);
            if (response.status === 401) {
                localStorage.removeItem('token');
                localStorage.removeItem('authToken');
                window.location.href = '/megacessweb/pages/log-in.html';
                return null;
            }
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (!data) return; // Handle 401 redirect case
            
            console.log('Unassigned Workers API Response:', data);
            
            if (data && data.data) {
                // Ensure data.data is an array
                const workerList = Array.isArray(data.data) ? data.data : [];
                console.log('Unassigned worker list length:', workerList.length);
                allUnassignedWorkers = workerList; // Store for filtering
                displayUnassignedWorkers(workerList);
            } else {
                console.log('No unassigned workers found');
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
    unassignedWorkerSearchInput.addEventListener('input', function(e) {
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
    saveAssignmentBtn.addEventListener('click', function() {
        if (!selectedMandor) {
            console.error('No mandor selected');
            return;
        }

        if (selectedWorkerIds.length === 0) {
            alert('Please select at least one worker to assign.');
            return;
        }

        const token = localStorage.getItem('authToken') || localStorage.getItem('token');
        
        if (!token) {
            console.error('No authentication token found');
            alert('Please log in to assign workers.');
            return;
        }

        // Disable save button and show loading state
        saveAssignmentBtn.disabled = true;
        saveAssignmentBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Saving...';

        console.log('Assigning workers:', selectedWorkerIds, 'to mandor:', selectedMandor.id);

        // Create array of promises for all assignments
        const assignmentPromises = selectedWorkerIds.map(staffId => {
            return fetch('https://mwms.megacess.com/api/v1/staff/claim', {
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
                    window.location.href = '/megacessweb/pages/log-in.html';
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
                console.log('Assignment results:', results);
                
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
                alert(`Successfully assigned ${results.length} worker(s) to ${selectedMandor.name}`);
            })
            .catch(error => {
                console.error('Error assigning workers:', error);
                
                // Reset button state
                saveAssignmentBtn.disabled = false;
                saveAssignmentBtn.innerHTML = 'Save';
                
                alert('Failed to assign workers. Please try again.');
            });
    });

    // Back to mandor list
    backToMandorListBtn.addEventListener('click', function() {
        workerDetailView.style.display = 'none';
        mandorListView.style.display = 'block';
        selectedMandor = null;
        allWorkers = [];
        workerSearchInput.value = ''; // Clear worker search
    });

    // Worker search functionality
    workerSearchInput.addEventListener('input', function(e) {
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
    searchInput.addEventListener('input', function(e) {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            fetchMandorList(e.target.value.trim());
        }, 500);
    });

    // Initial load
    fetchMandorList();
});
