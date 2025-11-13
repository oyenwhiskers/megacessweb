document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('searchInput');
    const mandorListContainer = document.getElementById('mandorList');
    const mandorListView = document.getElementById('mandorListView');
    const workerDetailView = document.getElementById('workerDetailView');
    const backToMandorListBtn = document.getElementById('backToMandorList');
    const selectedMandorNameSpan = document.getElementById('selectedMandorName');
    const workerListContainer = document.getElementById('workerList');
    const assignWorkerBtn = document.getElementById('assignWorkerBtn');
    
    let searchTimeout;
    let selectedMandor = null;

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
            const profileImage = mandor.user_img 
                ? `<img src="${mandor.user_img}" 
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
        // Show loading spinner
        workerListContainer.innerHTML = `
            <div class="text-center py-5">
                <div class="spinner-border text-success" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-3 text-muted">Loading workers...</p>
            </div>
        `;

        // TODO: Replace with actual API call
        // For now, show empty state
        setTimeout(() => {
            workerListContainer.innerHTML = `
                <div class="text-center py-5">
                    <p class="text-muted">No assigned worker</p>
                </div>
            `;
        }, 500);
    }

    // Back to mandor list
    backToMandorListBtn.addEventListener('click', function() {
        workerDetailView.style.display = 'none';
        mandorListView.style.display = 'block';
        selectedMandor = null;
    });

    // Search functionality
    searchInput.addEventListener('input', function(e) {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            fetchMandorList(e.target.value.trim());
        }, 500);
    });

    // Initial load
    fetchMandorList();
});
