document.addEventListener('DOMContentLoaded', function () {
    const SUMMARY_PAGE_URL = `${STORAGE_DOMAIN}/summary/worker-staff`;

    const monthFilter = document.getElementById('monthFilter');
    const yearFilter = document.getElementById('yearFilter');
    const ownerTypeFilter = document.getElementById('ownerTypeFilter');
    const ownerIdFilter = document.getElementById('ownerIdFilter');
    const applyFilterBtn = document.getElementById('applyFilterBtn');
    const resetFilterBtn = document.getElementById('resetFilterBtn');
    const summaryContent = document.getElementById('summaryContent');

    // Get Auth Token
    function getAuthToken() {
        return localStorage.getItem('authToken') || localStorage.getItem('token');
    }

    // Initialize year dropdown
    function initializeYearDropdown() {
        const currentYear = new Date().getFullYear();
        const years = [];
        for (let i = -3; i <= 1; i++) {
            years.push(currentYear + i);
        }
        yearFilter.innerHTML = years
            .map(year => `<option value="${year}">${year}</option>`)
            .join('');
    }

    let allOwners = [];
    const ownerSearchInput = document.getElementById('ownerSearchInput');
    const ownerSuggestionsList = document.getElementById('ownerSuggestionsList');

    // Show/Hide suggestions list
    function showSuggestions(filtered) {
        if (!ownerSuggestionsList) return;
        if (filtered.length === 0) {
            ownerSuggestionsList.innerHTML = '<div class="list-group-item list-group-item-action disabled text-muted">No matches found</div>';
            ownerSuggestionsList.classList.remove('d-none');
            return;
        }

        ownerSuggestionsList.innerHTML = filtered
            .map(owner => {
                const id = owner.id;
                const name = owner.staff_fullname || owner.user_fullname || owner.name || 'Unknown';
                return `<button type="button" class="list-group-item list-group-item-action suggestion-item py-2 px-3 text-start" data-id="${id}">${name}</button>`;
            })
            .join('');
        ownerSuggestionsList.classList.remove('d-none');
    }

    function hideSuggestions() {
        if (ownerSuggestionsList) {
            ownerSuggestionsList.classList.add('d-none');
        }
    }

    // Filter and populate owners select element
    function renderOwnersList(filteredOwners) {
        ownerIdFilter.innerHTML = filteredOwners
            .map(owner => {
                const id = owner.id;
                const name = owner.staff_fullname || owner.user_fullname || owner.name || 'Unknown';
                return `<option value="${id}">${name}</option>`;
            })
            .join('');
    }

    // Fetch and populate owners dropdown based on selected owner type
    async function loadOwners() {
        const type = ownerTypeFilter.value;
        ownerIdFilter.innerHTML = '<option value="" disabled selected>Loading...</option>';
        applyFilterBtn.disabled = true;
        if (ownerSearchInput) ownerSearchInput.value = '';
        hideSuggestions();

        const token = getAuthToken();
        const endpoint = type === 'worker' ? `${API_URL}/staff?per_page=10000` : `${API_URL}/users?per_page=10000`;

        try {
            const response = await fetch(endpoint, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) throw new Error('Failed to load owners');

            const result = await response.json();
            allOwners = [];

            if (result.success && Array.isArray(result.data)) {
                allOwners = result.data;
            } else if (Array.isArray(result)) {
                allOwners = result;
            }

            if (allOwners.length === 0) {
                ownerIdFilter.innerHTML = '<option value="" disabled>No owners found</option>';
                return;
            }

            renderOwnersList(allOwners);
            applyFilterBtn.disabled = false;

            // Load last selection if available
            const lastSelection = localStorage.getItem('lastIndividualSummarySelection');
            if (lastSelection) {
                try {
                    const parsed = JSON.parse(lastSelection);
                    if (parsed.owner_type === type && ownerIdFilter.querySelector(`option[value="${parsed.owner_id}"]`)) {
                        ownerIdFilter.value = parsed.owner_id;
                        const match = allOwners.find(o => o.id == parsed.owner_id);
                        if (match && ownerSearchInput) {
                            ownerSearchInput.value = match.staff_fullname || match.user_fullname || match.name || '';
                        }
                    }
                } catch (e) {}
            }

        } catch (err) {
            console.error(err);
            ownerIdFilter.innerHTML = '<option value="" disabled>Error loading owners</option>';
        }
    }

    // Filter owners dynamically on search input keyup
    if (ownerSearchInput) {
        ownerSearchInput.addEventListener('input', function (e) {
            const query = e.target.value.toLowerCase().trim();
            const filtered = allOwners.filter(owner => {
                const name = (owner.staff_fullname || owner.user_fullname || owner.name || '').toLowerCase();
                return name.includes(query);
            });
            showSuggestions(filtered);
            renderOwnersList(filtered);
        });

        ownerSearchInput.addEventListener('focus', function () {
            const query = this.value.toLowerCase().trim();
            const filtered = allOwners.filter(owner => {
                const name = (owner.staff_fullname || owner.user_fullname || owner.name || '').toLowerCase();
                return name.includes(query);
            });
            showSuggestions(filtered);
        });
    }

    // Handle clicking a suggestion
    if (ownerSuggestionsList) {
        ownerSuggestionsList.addEventListener('click', function (e) {
            const btn = e.target.closest('.suggestion-item');
            if (btn) {
                const id = btn.getAttribute('data-id');
                const name = btn.textContent;
                ownerSearchInput.value = name;
                ownerIdFilter.innerHTML = `<option value="${id}" selected>${name}</option>`;
                ownerIdFilter.value = id;
                hideSuggestions();
            }
        });
    }

    // Close suggestions when clicking outside
    document.addEventListener('click', function (e) {
        if (ownerSearchInput && !ownerSearchInput.contains(e.target) && ownerSuggestionsList && !ownerSuggestionsList.contains(e.target)) {
            hideSuggestions();
        }
    });

    // Load summary inside iframe
    function loadSummary() {
        const month = monthFilter.value;
        const year = yearFilter.value;
        const ownerType = ownerTypeFilter.value;
        const ownerId = ownerIdFilter.value;

        if (!ownerId) {
            Swal.fire({
                icon: 'warning',
                title: 'Selection Required',
                text: 'Please select a person first.'
            });
            return;
        }

        // Save selection
        localStorage.setItem('lastIndividualSummarySelection', JSON.stringify({
            month, year, owner_type: ownerType, owner_id: ownerId
        }));

        summaryContent.innerHTML = `
            <div class="text-center py-5">
                <div class="spinner-border text-success mb-3" role="status" style="width: 3rem; height: 3rem;">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="text-muted fs-5">Generating summary...</p>
            </div>
        `;

        const summaryUrl = `${SUMMARY_PAGE_URL}?month=${month}&year=${year}&owner_type=${ownerType}&owner_id=${ownerId}&_t=${Date.now()}`;

        summaryContent.innerHTML = `
            <div class="card shadow-sm">
                <div class="card-body p-0">
                    <iframe src="${summaryUrl}" 
                            class="w-100 border-0 rounded" 
                            style="min-height: 800px;"
                            title="Individual Summary"
                            onload="try { this.style.height = (this.contentWindow.document.body.scrollHeight + 50) + 'px'; } catch (e) { this.style.height = '1200px'; }">
                    </iframe>
                </div>
            </div>
        `;
    }

    // Listeners
    ownerTypeFilter.addEventListener('change', loadOwners);

    applyFilterBtn.addEventListener('click', loadSummary);

    resetFilterBtn.addEventListener('click', () => {
        const now = new Date();
        monthFilter.value = now.getMonth() + 1;
        yearFilter.value = now.getFullYear();
        ownerTypeFilter.value = 'worker';
        loadOwners();
    });

    // Initialize Page
    initializeYearDropdown();
    const now = new Date();
    monthFilter.value = now.getMonth() + 1;
    yearFilter.value = now.getFullYear();

    // Auto load owners list
    loadOwners();
});
