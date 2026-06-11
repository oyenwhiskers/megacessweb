document.addEventListener('DOMContentLoaded', function () {
    // Backend summary page URL
    const SUMMARY_PAGE_URL = `${STORAGE_DOMAIN}/summary`;

    const monthFilter = document.getElementById('monthFilter');
    const yearFilter = document.getElementById('yearFilter');
    const applyFilterBtn = document.getElementById('applyFilterBtn');
    const resetFilterBtn = document.getElementById('resetFilterBtn');
    const currentViewLabel = document.getElementById('currentViewLabel');
    const summaryContent = document.getElementById('summaryContent');

    // Initialize year dropdown (last 3 years + current + next year)
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

    // Get month name
    function getMonthName(month) {
        const date = new Date(2000, month - 1, 1);
        return date.toLocaleString('default', { month: 'long' });
    }

    // Parse URL parameters or use defaults
    function getInitialDateParams() {
        const urlParams = new URLSearchParams(window.location.search);
        const now = new Date();

        // Check URL params first
        let month = urlParams.get('month');
        let year = urlParams.get('year');

        // If no URL params, check localStorage for last selection
        if (!month || !year) {
            const lastSelection = localStorage.getItem('lastSummarySelection');
            if (lastSelection) {
                try {
                    const parsed = JSON.parse(lastSelection);
                    month = parsed.month;
                    year = parsed.year;
                } catch (e) {
                    console.error('Error parsing last selection:', e);
                }
            }
        }

        // Final fallback to current month/year
        return {
            month: parseInt(month) || (now.getMonth() + 1),
            year: parseInt(year) || now.getFullYear()
        };
    }

    // Update URL without page reload
    function updateURL(month, year) {
        const newUrl = `${window.location.pathname}?month=${month}&year=${year}`;
        window.history.pushState({ month, year }, '', newUrl);
    }

    // Save selection to localStorage
    function saveSelection(month, year) {
        localStorage.setItem('lastSummarySelection', JSON.stringify({ month, year }));
    }

    // Update current view label
    function updateViewLabel(month, year) {
        currentViewLabel.textContent = `${getMonthName(month)} ${year}`;
    }

    // Load summary content using iframe
    function loadSummary(month, year) {
        // Show loading state
        summaryContent.innerHTML = `
            <div class="text-center py-5">
                <div class="spinner-border text-success mb-3" role="status" style="width: 3rem; height: 3rem;">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="text-muted fs-5">Loading summary for ${getMonthName(month)} ${year}...</p>
            </div>
        `;

        try {
            // Construct the summary URL with query parameters
            const summaryUrl = `${SUMMARY_PAGE_URL}?month=${month}&year=${year}`;

            // Create iframe with the backend summary page
            summaryContent.innerHTML = `
                <div class="card shadow-sm">
                    <div class="card-body p-0">
                        <iframe src="${summaryUrl}" 
                                class="w-100 border-0 rounded" 
                                style="min-height: 1000px;"
                                title="Monthly Summary"
                                onload="this.style.height = (this.contentWindow.document.body.scrollHeight + 50) + 'px';">
                        </iframe>
                    </div>
                </div>
            `;

            // Update UI
            updateViewLabel(month, year);
            updateURL(month, year);
            saveSelection(month, year);

        } catch (error) {
            console.error('Error loading summary:', error);
            summaryContent.innerHTML = `
                <div class="alert alert-danger" role="alert">
                    <h4 class="alert-heading">
                        <i class="bi bi-exclamation-triangle me-2"></i>Error Loading Summary
                    </h4>
                    <p class="mb-0">${error.message}</p>
                    <hr>
                    <button class="btn btn-outline-danger btn-sm" onclick="location.reload()">
                        <i class="bi bi-arrow-clockwise me-1"></i>Retry
                    </button>
                </div>
            `;
        }
    }

    // Apply filter button
    applyFilterBtn.addEventListener('click', function () {
        const month = parseInt(monthFilter.value);
        const year = parseInt(yearFilter.value);
        loadSummary(month, year);
    });

    // Reset to current month button
    resetFilterBtn.addEventListener('click', function () {
        const now = new Date();
        const month = now.getMonth() + 1;
        const year = now.getFullYear();

        monthFilter.value = month;
        yearFilter.value = year;
        loadSummary(month, year);
    });

    // Handle browser back/forward
    window.addEventListener('popstate', function (event) {
        if (event.state) {
            monthFilter.value = event.state.month;
            yearFilter.value = event.state.year;
            loadSummary(event.state.month, event.state.year);
        }
    });

    // Allow Enter key to trigger filter
    monthFilter.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            applyFilterBtn.click();
        }
    });

    yearFilter.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            applyFilterBtn.click();
        }
    });

    // Initialize on page load
    initializeYearDropdown();

    const initialParams = getInitialDateParams();
    monthFilter.value = initialParams.month;
    yearFilter.value = initialParams.year;

    // Auto-load summary for initial month/year
    loadSummary(initialParams.month, initialParams.year);
});

