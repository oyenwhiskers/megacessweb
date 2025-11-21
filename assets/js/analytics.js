// Analytics API Integration
let taskCompletionChartMonth = null;
let taskCompletionChartBlock = null;

// Loading helper functions
function showLoading(container) {
    if (!container) return;
    
    // Add loading class
    container.classList.add('position-relative');
    
    // Create loading overlay
    const loadingOverlay = document.createElement('div');
    loadingOverlay.className = 'loading-overlay';
    loadingOverlay.innerHTML = `
        <div class="spinner-border text-success" role="status">
            <span class="visually-hidden">Loading...</span>
        </div>
    `;
    
    container.appendChild(loadingOverlay);
}

function hideLoading(container) {
    if (!container) return;
    
    const loadingOverlay = container.querySelector('.loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.remove();
    }
}

document.addEventListener('DOMContentLoaded', function() {
    // Get current year
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    
    // Initialize charts
    initializeMonthlyChart();
    initializeBlockChart();
    
    // Fetch monthly task completion data
    fetchMonthlyTaskCompletion(year);
    
    // Fetch block task completion data
    fetchBlockTaskCompletion(year);
    
    // Fetch resource usage data
    fetchResourceUsage();
    
    // Fetch estate officer task completion data
    fetchEstateOfficerTasks(year, 10); // Default to October
    
    // Fetch attendance data
    fetchAttendanceByMandors(year, 10); // Default to October
    
    // Fetch absent workers data
    fetchAbsentWorkers(year, 10); // Default to October
    
    // Fetch audited summary data
    fetchAuditedSummary(year, 10); // Default to October

    // --- Block Chart Filter Controls ---
    const blockFilterYear = document.getElementById('blockFilterYear');
    const blockFilterMonth = document.getElementById('blockFilterMonth');
    const blockFilterWeek = document.getElementById('blockFilterWeek');
    const blockFilterForm = document.getElementById('blockFilterForm');

    if (blockFilterYear && blockFilterMonth && blockFilterWeek && blockFilterForm) {
        // Populate year dropdown (5 years back and 2 years ahead)
        const currentYear = new Date().getFullYear();
        for (let y = currentYear - 5; y <= currentYear + 2; y++) {
            const opt = document.createElement('option');
            opt.value = y;
            opt.textContent = y;
            if (y === currentYear) opt.selected = true;
            blockFilterYear.appendChild(opt);
        }
        // Populate month dropdown
        const monthNames = ["All", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        for (let m = 1; m <= 12; m++) {
            const opt = document.createElement('option');
            opt.value = m;
            opt.textContent = monthNames[m];
            blockFilterMonth.appendChild(opt);
        }
        // Populate week dropdown (1-53)
        for (let w = 1; w <= 53; w++) {
            const opt = document.createElement('option');
            opt.value = w;
            opt.textContent = `Week ${w}`;
            blockFilterWeek.appendChild(opt);
        }
        // Reset week if month changes
        blockFilterMonth.addEventListener('change', function() {
            blockFilterWeek.value = '';
        });
        // On filter change (any select), update chart
        function triggerBlockChartUpdate() {
            const year = parseInt(blockFilterYear.value);
            const month = blockFilterMonth.value ? parseInt(blockFilterMonth.value) : undefined;
            const week = blockFilterWeek.value ? parseInt(blockFilterWeek.value) : undefined;
            fetchBlockTaskCompletion(year, month, week);
        }
        blockFilterYear.addEventListener('change', triggerBlockChartUpdate);
        blockFilterMonth.addEventListener('change', triggerBlockChartUpdate);
        blockFilterWeek.addEventListener('change', triggerBlockChartUpdate);
        // Initial load with default values
        triggerBlockChartUpdate();
    }

    // --- Resource Usage Toggle Buttons ---
    const btnManuring = document.getElementById('btnManuring');
    const btnSpraying = document.getElementById('btnSpraying');
    const resourceSectionTitle = document.getElementById('resourceSectionTitle');
    // Add filter controls
    const sanitationTypeFilter = document.getElementById('sanitationTypeFilter');
    const resourceStartDate = document.getElementById('resourceStartDate');
    const resourceEndDate = document.getElementById('resourceEndDate');
    const resourceLocation = document.getElementById('resourceLocation');

    // --- Populate Block (resourceLocation) dropdown dynamically ---
    async function populateResourceLocationDropdown() {
        if (!resourceLocation) return;
        // Clear existing options
        resourceLocation.innerHTML = '<option value="" disabled selected>Loading...</option>';
        const token = localStorage.getItem('authToken');
        try {
            const response = await fetch('https://mwms.megacess.com/api/v1/locations', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });
            const data = await response.json();
            resourceLocation.innerHTML = '';
            if (data.success && Array.isArray(data.data)) {
                data.data.forEach(loc => {
                    const opt = document.createElement('option');
                    opt.value = loc.id;
                    opt.textContent = loc.name;
                    resourceLocation.appendChild(opt);
                });
            } else {
                resourceLocation.innerHTML = '<option value="" disabled selected>No locations found</option>';
            }
        } catch (err) {
            resourceLocation.innerHTML = '<option value="" disabled selected>Error loading</option>';
        }
    }
    // Call on DOMContentLoaded
    populateResourceLocationDropdown();

    function setActiveResourceButton(selected) {
        if (btnManuring && btnSpraying) {
            if (selected === 'manuring') {
                btnManuring.classList.add('btn-success');
                btnManuring.classList.remove('btn-outline-success');
                btnManuring.classList.add('active');
                btnSpraying.classList.remove('btn-success');
                btnSpraying.classList.add('btn-outline-success');
                btnSpraying.classList.remove('active');
            } else {
                btnSpraying.classList.add('btn-success');
                btnSpraying.classList.remove('btn-outline-success');
                btnSpraying.classList.add('active');
                btnManuring.classList.remove('btn-success');
                btnManuring.classList.add('btn-outline-success');
                btnManuring.classList.remove('active');
            }
        }
        // Show sanitation type filter only for spraying
        const sanitationTypeFilterContainer = document.getElementById('sanitationTypeFilterContainer');
        if (sanitationTypeFilterContainer) {
            if (selected === 'spraying') {
                sanitationTypeFilterContainer.style.display = '';
                document.getElementById('sanitationTypeFilter').value = '';
            } else {
                sanitationTypeFilterContainer.style.display = 'none';
            }
        }
        // Show fertilizer type filter only for manuring
        const fertilizerTypeFilterContainer = document.getElementById('fertilizerTypeFilterContainer');
        if (fertilizerTypeFilterContainer) {
            if (selected === 'manuring') {
                fertilizerTypeFilterContainer.style.display = '';
            } else {
                fertilizerTypeFilterContainer.style.display = 'none';
            }
        }
    }

    async function handleResourceButtonClick(type) {
        setActiveResourceButton(type);
        if (resourceSectionTitle) {
            resourceSectionTitle.textContent =
                type === 'manuring' ? 'Resources Used for Fertilizing:' : 'Resources Used for Spraying:';
        }
        await fetchResourceUsage(type);
    }

    if (btnManuring && btnSpraying) {
        btnManuring.addEventListener('click', function() {
            handleResourceButtonClick('manuring');
        });
        btnSpraying.addEventListener('click', function() {
            handleResourceButtonClick('spraying');
        });
        // Set default active button and load data
        handleResourceButtonClick('manuring');
    } else {
        // Fallback: load manuring if buttons not found
        fetchResourceUsage('manuring');
    }

    // Add filter event listeners
    if (sanitationTypeFilter) {
        sanitationTypeFilter.addEventListener('change', function() {
            if (btnSpraying && btnSpraying.classList.contains('active')) {
                fetchResourceUsage('spraying');
            }
        });
    }
    if (resourceStartDate) resourceStartDate.addEventListener('change', function() { fetchResourceUsage(getActiveResourceType()); });
    if (resourceEndDate) resourceEndDate.addEventListener('change', function() { fetchResourceUsage(getActiveResourceType()); });
    if (resourceLocation) resourceLocation.addEventListener('change', function() { fetchResourceUsage(getActiveResourceType()); });

    function getActiveResourceType() {
        if (btnSpraying && btnSpraying.classList.contains('active')) return 'spraying';
        return 'manuring';
    }

    // --- Monthly Chart Filter Controls ---
    const monthlyFilterYear = document.getElementById('monthlyFilterYear');
    const monthlyFilterLocation = document.getElementById('monthlyFilterLocation');
    const monthlyFilterTaskType = document.getElementById('monthlyFilterTaskType');
    const monthlyFilterForm = document.getElementById('monthlyFilterForm');

    // Populate year dropdown (All + 5 years back and 2 years ahead)
    if (monthlyFilterYear) {
        const currentYear = new Date().getFullYear();
        const allOpt = document.createElement('option');
        allOpt.value = '';
        allOpt.textContent = 'All Years';
        monthlyFilterYear.appendChild(allOpt);
        for (let y = currentYear - 5; y <= currentYear + 2; y++) {
            const opt = document.createElement('option');
            opt.value = y;
            opt.textContent = y;
            if (y === currentYear) opt.selected = true;
            monthlyFilterYear.appendChild(opt);
        }
    }
    // Populate location dropdown dynamically
    async function populateMonthlyLocationDropdown() {
        if (!monthlyFilterLocation) return;
        monthlyFilterLocation.innerHTML = '<option value="" disabled selected>Loading...</option>';
        const token = localStorage.getItem('authToken');
        try {
            const response = await fetch('https://mwms.megacess.com/api/v1/locations', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });
            const data = await response.json();
            monthlyFilterLocation.innerHTML = '';
            if (data.success && Array.isArray(data.data)) {
                data.data.forEach(loc => {
                    const opt = document.createElement('option');
                    opt.value = loc.id;
                    opt.textContent = loc.name;
                    monthlyFilterLocation.appendChild(opt);
                });
                // Default to first location if available
                if (data.data.length > 0) monthlyFilterLocation.value = data.data[0].id;
            } else {
                monthlyFilterLocation.innerHTML = '<option value="" disabled selected>No locations found</option>';
            }
        } catch (err) {
            monthlyFilterLocation.innerHTML = '<option value="" disabled selected>Error loading</option>';
        }
    }
    populateMonthlyLocationDropdown();

    // Helper to get current filter values
    function getMonthlyFilterValues() {
        const year = monthlyFilterYear ? monthlyFilterYear.value : '';
        const locationId = monthlyFilterLocation ? monthlyFilterLocation.value : 1;
        const taskType = monthlyFilterTaskType ? monthlyFilterTaskType.value : '';
        return { year, locationId, taskType };
    }

    // On filter change, update chart
    if (monthlyFilterForm) {
        monthlyFilterForm.addEventListener('change', function() {
            const { year, locationId, taskType } = getMonthlyFilterValues();
            fetchMonthlyTaskCompletion(year, locationId, taskType);
        });
    }

    // Initial load for monthly chart (after locations loaded)
    setTimeout(() => {
        const { year, locationId, taskType } = getMonthlyFilterValues();
        fetchMonthlyTaskCompletion(year, locationId, taskType);
    }, 500);

    // --- Estate Officer Task Filter Controls ---
    const estateOfficerYear = document.getElementById('estateOfficerYear');
    const estateOfficerMonth = document.getElementById('estateOfficerMonth');
    if (estateOfficerYear && estateOfficerMonth) {
        // Populate year dropdown (All + 5 years back and 2 years ahead)
        const currentYear = new Date().getFullYear();
        const allYearOpt = document.createElement('option');
        allYearOpt.value = '';
        allYearOpt.textContent = 'All Years';
        estateOfficerYear.appendChild(allYearOpt);
        for (let y = currentYear - 5; y <= currentYear + 2; y++) {
            const opt = document.createElement('option');
            opt.value = y;
            opt.textContent = y;
            if (y === currentYear) opt.selected = true;
            estateOfficerYear.appendChild(opt);
        }
        // Populate month dropdown (All + 1-12)
        const monthNames = ["All Months", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        for (let m = 0; m <= 12; m++) {
            const opt = document.createElement('option');
            opt.value = m === 0 ? '' : m;
            opt.textContent = monthNames[m];
            if (m === (new Date().getMonth() + 1)) opt.selected = true;
            estateOfficerMonth.appendChild(opt);
        }
        // On filter change, update list
        function triggerEstateOfficerUpdate() {
            const year = estateOfficerYear.value;
            const month = estateOfficerMonth.value;
            fetchEstateOfficerTasks(year, month);
            fetchAttendanceByMandors(year, month);
        }
        estateOfficerYear.addEventListener('change', triggerEstateOfficerUpdate);
        estateOfficerMonth.addEventListener('change', triggerEstateOfficerUpdate);
        // Initial load with default values
        triggerEstateOfficerUpdate();
    }
});

// Update fetchMonthlyTaskCompletion to accept taskType and allow all years/months
async function fetchMonthlyTaskCompletion(year, locationId = 1, taskType = '') {
    try {
        // Get token from localStorage (using 'authToken' key)
        const token = localStorage.getItem('authToken');
        if (!token) {
            console.error('No authentication token found');
            return;
        }
        // Build API URL
        let url = `https://mwms.megacess.com/api/v1/analytics/task-completion?location_id=${locationId}`;
        if (year && year !== '') {
            url += `&year=${year}`;
        }
        if (taskType && taskType !== '') {
            url += `&task_type=${encodeURIComponent(taskType)}`;
        }
        // Show loading state
        const chartCanvas = document.getElementById('taskCompletionChartMonth');
        if (chartCanvas) {
            const card = chartCanvas.closest('.card-body');
            showLoading(card);
        }
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        if (result.data && result.data.data) {
            updateMonthlyChart(result.data.data);
        } else {
            updateMonthlyChart([]);
        }
    } catch (error) {
        console.error('Error fetching monthly task completion:', error);
        updateMonthlyChart([]);
    } finally {
        // Hide loading state
        const chartCanvas = document.getElementById('taskCompletionChartMonth');
        if (chartCanvas) {
            const card = chartCanvas.closest('.card-body');
            hideLoading(card);
        }
    }
}

function initializeMonthlyChart() {
    const ctx = document.getElementById('taskCompletionChartMonth');
    if (!ctx) return;
    
    // Empty chart - will be populated by API
    taskCompletionChartMonth = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Task Completed',
                data: [],
                backgroundColor: '#1e7e5c',
                borderColor: '#1e7e5c',
                borderWidth: 1,
                borderRadius: 4,
                barThickness: 30
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    align: 'end',
                    labels: {
                        usePointStyle: true,
                        pointStyle: 'circle',
                        padding: 20,
                        font: {
                            size: 12
                        }
                    }
                },
                title: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Number of Tasks',
                        font: {
                            size: 12,
                            weight: 'bold'
                        }
                    },
                    ticks: {
                        font: {
                            size: 11
                        }
                    },
                    grid: {
                        display: true,
                        drawBorder: false
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        font: {
                            size: 11
                        }
                    }
                }
            }
        }
    });
}

function updateMonthlyChart(apiData) {
    if (!taskCompletionChartMonth) {
        console.error('Chart not initialized');
        return;
    }
    
    console.log('Updating chart with API data:', apiData);
    
    // Extract month names and counts from API data
    const labels = apiData.map(item => item.month_name);
    const values = apiData.map(item => item.count);
    
    console.log('Labels:', labels);
    console.log('Values:', values);
    
    // Find the maximum value to set appropriate scale
    const maxValue = Math.max(...values);
    const yAxisMax = Math.ceil(maxValue / 10) * 10 + 10; // Round up and add padding
    
    // Update chart with API data
    taskCompletionChartMonth.data.labels = labels;
    taskCompletionChartMonth.data.datasets[0].data = values;
    taskCompletionChartMonth.options.scales.y.max = yAxisMax;
    taskCompletionChartMonth.update();
    
    console.log('Chart updated successfully');
}

async function fetchBlockTaskCompletion(year, month, week) {
    try {
        // Get token from localStorage
        const token = localStorage.getItem('authToken');
        
        if (!token) {
            console.error('No authentication token found');
            return;
        }

        let url = `https://mwms.megacess.com/api/v1/analytics/tasks-by-blocks?year=${year}`;
        if (month) url += `&month=${month}`;
        if (week) url += `&week=${week}`;
        console.log('Fetching block task completion:', { year, month, week });
        
        // Show loading state
        const chartCanvas = document.getElementById('taskCompletionChartBlock');
        if (chartCanvas) {
            const card = chartCanvas.closest('.card-body');
            showLoading(card);
        }

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log('Block API Response:', result);
        
        if (result.data && result.data.data) {
            updateBlockChart(result.data.data);
        } else {
            updateBlockChart([]);
            console.warn('No data found in API response for blocks');
        }
    } catch (error) {
        console.error('Error fetching block task completion:', error);
        updateBlockChart([]);
    } finally {
        // Hide loading state
        const chartCanvas = document.getElementById('taskCompletionChartBlock');
        if (chartCanvas) {
            const card = chartCanvas.closest('.card-body');
            hideLoading(card);
        }
    }
}

function initializeBlockChart() {
    const ctx = document.getElementById('taskCompletionChartBlock');
    if (!ctx) return;
    
    // Empty chart - will be populated by API
    taskCompletionChartBlock = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Task Completed',
                data: [],
                backgroundColor: '#1e7e5c',
                borderColor: '#1e7e5c',
                borderWidth: 1,
                borderRadius: 4,
                barThickness: 30
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    align: 'end',
                    labels: {
                        usePointStyle: true,
                        pointStyle: 'circle',
                        padding: 20,
                        font: {
                            size: 12
                        }
                    }
                },
                title: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Number of Tasks',
                        font: {
                            size: 12,
                            weight: 'bold'
                        }
                    },
                    ticks: {
                        font: {
                            size: 11
                        }
                    },
                    grid: {
                        display: true,
                        drawBorder: false
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Block',
                        font: {
                            size: 12,
                            weight: 'bold'
                        }
                    },
                    grid: {
                        display: false
                    },
                    ticks: {
                        font: {
                            size: 11
                        }
                    }
                }
            }
        }
    });
}

function updateBlockChart(apiData) {
    if (!taskCompletionChartBlock) {
        console.error('Block chart not initialized');
        return;
    }
    // Extract location names and counts from API data
    const labels = apiData.map(item => item.location_name);
    const values = apiData.map(item => item.count);
    // Update chart with API data
    taskCompletionChartBlock.data.labels = labels;
    taskCompletionChartBlock.data.datasets[0].data = values;
    // Dynamically set y-axis max if there is data, else default to 1
    if (values.length > 0) {
        const maxValue = Math.max(...values);
        taskCompletionChartBlock.options.scales.y.max = Math.ceil(maxValue / 10) * 10 + 10;
    } else {
        taskCompletionChartBlock.options.scales.y.max = 1;
    }
    taskCompletionChartBlock.update();
    // Optionally show a message if no data
    const chartCanvas = document.getElementById('taskCompletionChartBlock');
    let noDataMsg = document.getElementById('block-no-data-msg');
    if (values.length === 0) {
        if (!noDataMsg && chartCanvas) {
            noDataMsg = document.createElement('div');
            noDataMsg.id = 'block-no-data-msg';
            noDataMsg.className = 'text-muted text-center py-4';
            noDataMsg.textContent = 'No data available for the selected filter.';
            chartCanvas.parentNode.appendChild(noDataMsg);
        }
    } else if (noDataMsg) {
        noDataMsg.remove();
    }
}

async function fetchResourceUsage(type = 'manuring') {
    try {
        // Get token from localStorage
        const token = localStorage.getItem('authToken');
        if (!token) {
            console.error('No authentication token found');
            return;
        }
        // Get filter values
        const sanitationType = document.getElementById('sanitationTypeFilter')?.value || 'spraying';
        const startDate = document.getElementById('resourceStartDate')?.value || `${new Date().getFullYear()}-01-01`;
        const endDate = document.getElementById('resourceEndDate')?.value || `${new Date().getFullYear()}-12-31`;
        const locationId = document.getElementById('resourceLocation')?.value || 1;
        // If sanitationType is 'slashing', show message and skip API call
        if (type === 'spraying' && sanitationType === 'slashing') {
            const resourceList = document.querySelector('.resources-list');
            if (resourceList) {
                resourceList.innerHTML = '<p class="text-danger text-center py-4">No data available for Slashing.</p>';
            }
            return;
        }
        // Show loading state
        const resourceList = document.querySelector('.resources-list');
        if (resourceList) {
            showLoading(resourceList.closest('.card-body'));
        }
        // Build API URL based on type and filters
        let url = `https://mwms.megacess.com/api/v1/analytics/resource-usage?start_date=${startDate}&end_date=${endDate}&location_id=${locationId}`;
        if (type === 'manuring') {
            url += `&task_type=manuring`;
        } else if (type === 'spraying') {
            url += `&task_type=sanitation`;
            // Always add sanitation_type if a real value is selected (not empty and not 'Select type')
            if (sanitationType && sanitationType !== '' && sanitationType !== 'Select type') {
                url += `&sanitation_type=${encodeURIComponent(sanitationType)}`;
            }
        }
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        console.log('Resource Usage API Response:', result);
        if (result.data && result.data.records) {
            console.log('Updating resource list with data:', result.data.records);
            updateResourceList(result.data);
        } else {
            updateResourceList({ records: [] });
            console.warn('No resource usage data found in API response');
        }
    } catch (error) {
        console.error('Error fetching resource usage:', error);
        updateResourceList({ records: [] });
    } finally {
        // Hide loading state
        const resourceList = document.querySelector('.resources-list');
        if (resourceList) {
            hideLoading(resourceList.closest('.card-body'));
        }
    }
}

function updateResourceList(data) {
    const resourceListContainer = document.querySelector('.resources-list');
    if (!resourceListContainer) {
        console.error('Resource list container not found');
        return;
    }
    
    // Clear existing items
    resourceListContainer.innerHTML = '';
    
    if (!data.records || data.records.length === 0) {
        resourceListContainer.innerHTML = '<p class="text-muted text-center py-4">No resource usage data available</p>';
        return;
    }
    
    // Store original data and resource type for filtering
    window.resourceUsageData = {
        records: data.records,
        resourceType: data.resource_type,
        unit: data.unit
    };
    
    // Create resource items from API data
    renderResourceItems(data.records, data.resource_type, data.unit);
    
    // Setup filter functionality
    setupResourceFilters();
    
    console.log('Resource list updated successfully');
}

function renderResourceItems(records, resourceType, unit) {
    const resourceListContainer = document.querySelector('.resources-list');
    if (!resourceListContainer) return;
    
    // Clear container
    resourceListContainer.innerHTML = '';
    
    if (records.length === 0) {
        resourceListContainer.innerHTML = '<p class="text-muted text-center py-4">No matching resources found</p>';
        return;
    }
    
    // Create resource items
    records.forEach(record => {
        const resourceItem = document.createElement('div');
        resourceItem.className = 'resource-item border rounded-4 p-3 mb-3';
        resourceItem.innerHTML = `
            <div class="row g-3">
                <div class="col-md-2">
                    <div class="text-muted small">Date:</div>
                    <div class="fw-semibold">${record.date}</div>
                </div>
                <div class="col-md-2">
                    <div class="text-muted small">Estate Officer:</div>
                    <div class="fw-semibold">${record.estate_officer}</div>
                </div>
                <div class="col-md-2">
                    <div class="text-muted small">Block:</div>
                    <div class="fw-semibold">${record.block}</div>
                </div>
                <div class="col-md-3">
                    <div class="text-muted small">${resourceType ? resourceType.charAt(0).toUpperCase() + resourceType.slice(1) : 'Resource'} type:</div>
                    <div class="fw-semibold">${record.fertilizer_type || record.resource_name || 'N/A'}</div>
                </div>
                <div class="col-md-3">
                    <div class="text-muted small">Amount (${unit || 'unit'}):</div>
                    <div class="fw-semibold">${record.amount}</div>
                </div>
            </div>
        `;
        resourceListContainer.appendChild(resourceItem);
    });
    
    // After rendering resource items, check if scroll is needed
    const resourceList = document.querySelector('.resources-list');
    if (resourceList) {
        const items = resourceList.querySelectorAll('.resource-item');
        if (items.length > 5) {
            resourceList.classList.add('scrollable-resource-list');
        } else {
            resourceList.classList.remove('scrollable-resource-list');
        }
    }
}

function setupResourceFilters() {
    const estateOfficerSearch = document.getElementById('resourceEstateOfficerSearch');
    // Removed dateFilter
    if (!estateOfficerSearch) return;
    // Remove existing event listener
    estateOfficerSearch.removeEventListener('input', handleResourceFilter);
    // Add event listener
    estateOfficerSearch.addEventListener('input', handleResourceFilter);
}

function handleResourceFilter() {
    if (!window.resourceUsageData) return;
    const estateOfficerSearch = document.getElementById('resourceEstateOfficerSearch');
    const searchTerm = estateOfficerSearch.value.toLowerCase().trim();
    let filteredRecords = window.resourceUsageData.records;
    // Filter by estate officer name
    if (searchTerm !== '') {
        filteredRecords = filteredRecords.filter(record => 
            record.estate_officer.toLowerCase().includes(searchTerm)
        );
    }
    // Render filtered results
    renderResourceItems(
        filteredRecords, 
        window.resourceUsageData.resourceType, 
        window.resourceUsageData.unit
    );
}

async function fetchEstateOfficerTasks(year, month) {
    try {
        // Get token from localStorage
        const token = localStorage.getItem('authToken');
        
        if (!token) {
            console.error('No authentication token found');
            return;
        }

        console.log('Fetching estate officer tasks for year:', year, 'month:', month);
        
        // Show loading state
        const officerList = document.querySelector('.estate-officers-list');
        if (officerList) {
            showLoading(officerList.closest('.card-body'));
        }

        let url = `https://mwms.megacess.com/api/v1/analytics/tasks-by-mandors?`;
        if (year && year !== '') url += `year=${year}&`;
        if (month && month !== '') url += `month=${month}&`;
        url = url.replace(/&$/, '');

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log('Estate Officer Tasks API Response:', result);
        
        if (result.data && result.data.records) {
            console.log('Updating estate officer list with data:', result.data.records);
            updateEstateOfficerList(result.data);
        } else {
            console.warn('No estate officer task data found in API response');
        }
    } catch (error) {
        console.error('Error fetching estate officer tasks:', error);
    } finally {
        // Hide loading state
        const officerList = document.querySelector('.estate-officers-list');
        if (officerList) {
            hideLoading(officerList.closest('.card-body'));
        }
    }
}

function updateEstateOfficerList(data) {
    const officerListContainer = document.querySelector('.estate-officers-list');
    if (!officerListContainer) {
        console.error('Estate officer list container not found');
        return;
    }
    
    // Update the period display
    const periodElement = document.querySelector('.estate-officers-list').closest('.card-body').querySelector('.text-muted');
    if (periodElement && data.period) {
        periodElement.textContent = data.period;
    }
    
    // Clear existing items
    officerListContainer.innerHTML = '';
    
    if (!data.records || data.records.length === 0) {
        officerListContainer.innerHTML = '<p class="text-muted text-center py-4">No estate officer task data available</p>';
        return;
    }
    
    // Store original data for filtering
    window.estateOfficerData = data.records;
    
    // Create estate officer items from API data
    renderEstateOfficers(data.records);
    
    // Setup search functionality
    setupEstateOfficerSearch();
    
    console.log('Estate officer list updated successfully');
}

function renderEstateOfficers(records) {
    const officerListContainer = document.querySelector('.estate-officers-list');
    if (!officerListContainer) return;
    
    // Clear container
    officerListContainer.innerHTML = '';
    
    if (records.length === 0) {
        officerListContainer.innerHTML = '<p class="text-muted text-center py-4">No matching estate officers found</p>';
        return;
    }
    
    // Create officer cards
    records.forEach(record => {
        const officerCard = document.createElement('div');
        officerCard.className = 'card border rounded-3 mb-3 estate-officer-item';
        officerCard.setAttribute('data-officer-name', record.estate_officer_name.toLowerCase());
        
        // Remove profile image/icon beside name
        officerCard.innerHTML = `
            <div class="card-body p-3">
                <div class="row align-items-center">
                    <div class="col">
                        <h6 class="mb-0 fw-bold">${record.estate_officer_name}</h6>
                    </div>
                    <div class="col-auto text-end">
                        <p class="text-muted mb-1 small">Team task completion:</p>
                        <h2 class="mb-0 fw-bold">${record.team_task_completion}</h2>
                    </div>
                </div>
            </div>
        `;
        officerListContainer.appendChild(officerCard);
    });
}

function setupEstateOfficerSearch() {
    const searchInput = document.getElementById('estateOfficerSearch');
    if (!searchInput) return;
    
    // Remove existing event listener if any
    searchInput.removeEventListener('input', handleEstateOfficerSearch);
    
    // Add search event listener
    searchInput.addEventListener('input', handleEstateOfficerSearch);
}

function handleEstateOfficerSearch(event) {
    const searchTerm = event.target.value.toLowerCase().trim();
    
    if (!window.estateOfficerData) return;
    
    if (searchTerm === '') {
        // Show all officers if search is empty
        renderEstateOfficers(window.estateOfficerData);
    } else {
        // Filter officers by name
        const filteredOfficers = window.estateOfficerData.filter(officer => 
            officer.estate_officer_name.toLowerCase().includes(searchTerm)
        );
        renderEstateOfficers(filteredOfficers);
    }
}

async function fetchAttendanceByMandors(year, month) {
    try {
        // Get token from localStorage
        const token = localStorage.getItem('authToken');
        
        if (!token) {
            console.error('No authentication token found');
            return;
        }

        console.log('Fetching attendance by mandors for year:', year, 'month:', month);
        
        // Show loading state
        const attendanceList = document.querySelector('.attendance-list');
        if (attendanceList) {
            showLoading(attendanceList.closest('.card-body'));
        }

        let url = `https://mwms.megacess.com/api/v1/analytics/attendance-by-mandors?`;
        if (year && year !== '') url += `year=${year}&`;
        if (month && month !== '') url += `month=${month}&`;
        url = url.replace(/&$/, '');

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log('Attendance API Response:', result);
        
        if (result.data && result.data.records) {
            console.log('Updating attendance list with data:', result.data.records);
            updateAttendanceList(result.data);
        } else {
            console.warn('No attendance data found in API response');
        }
    } catch (error) {
        console.error('Error fetching attendance data:', error);
    } finally {
        // Hide loading state
        const attendanceList = document.querySelector('.attendance-list');
        if (attendanceList) {
            hideLoading(attendanceList.closest('.card-body'));
        }
    }
}

function updateAttendanceList(data) {
    const attendanceListContainer = document.querySelector('.attendance-list');
    if (!attendanceListContainer) {
        console.error('Attendance list container not found');
        return;
    }
    
    // Update the period display
    const periodElement = document.querySelector('.attendance-period');
    if (periodElement && data.period) {
        periodElement.textContent = data.period;
    }
    
    // Clear existing items
    attendanceListContainer.innerHTML = '';
    
    if (!data.records || data.records.length === 0) {
        attendanceListContainer.innerHTML = '<p class="text-muted text-center py-4">No attendance data available</p>';
        return;
    }
    
    // Create attendance items from API data
    data.records.forEach(record => {
        const attendanceItem = document.createElement('div');
        attendanceItem.className = 'd-flex align-items-center justify-content-between border rounded-3 p-3 mb-3';
        attendanceItem.innerHTML = `
            <div class="d-flex align-items-center gap-3">
                <div class="rounded-circle bg-dark d-flex align-items-center justify-content-center" style="width: 50px; height: 50px;">
                    <i class="bi bi-person-fill text-white fs-4"></i>
                </div>
                <span class="fw-semibold">${record.estate_officer_name}</span>
            </div>
            <span class="fs-4 fw-bold">${record.attendance_rate}%</span>
        `;
        attendanceListContainer.appendChild(attendanceItem);
    });
    
    console.log('Attendance list updated successfully');
}

async function fetchAbsentWorkers(year, month) {
    try {
        // Get token from localStorage
        const token = localStorage.getItem('authToken');
        
        if (!token) {
            console.error('No authentication token found');
            return;
        }

        console.log('Fetching absent workers for year:', year, 'month:', month);
        
        // Show loading state
        const absentList = document.querySelector('.absent-list');
        if (absentList) {
            showLoading(absentList.closest('.card-body'));
        }

        let url = `https://mwms.megacess.com/api/v1/analytics/absent-workers?`;
        if (year && year !== '') url += `year=${year}&`;
        if (month && month !== '') url += `month=${month}&`;
        url = url.replace(/&$/, '');

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log('Absent Workers API Response:', result);
        
        if (result.data && result.data.records) {
            console.log('Updating absent workers list with data:', result.data.records);
            updateAbsentWorkersList(result.data);
        } else {
            console.warn('No absent workers data found in API response');
        }
    } catch (error) {
        console.error('Error fetching absent workers data:', error);
    } finally {
        // Hide loading state
        const absentList = document.querySelector('.absent-list');
        if (absentList) {
            hideLoading(absentList.closest('.card-body'));
        }
    }
}

function updateAbsentWorkersList(data) {
    const absentListContainer = document.querySelector('.absent-list');
    if (!absentListContainer) {
        console.error('Absent workers list container not found');
        return;
    }
    
    // Update the period display
    const periodElement = document.querySelector('.absent-period');
    if (periodElement && data.period) {
        periodElement.textContent = data.period;
    }
    
    // Clear existing items
    absentListContainer.innerHTML = '';
    
    if (!data.records || data.records.length === 0) {
        absentListContainer.innerHTML = '<p class="text-muted text-center py-4">No absent workers</p>';
        return;
    }
    
    // Create absent worker items from API data
    data.records.forEach(record => {
        const absentItem = document.createElement('div');
        absentItem.className = 'd-flex align-items-center gap-3 border rounded-3 p-3 mb-3';
        absentItem.innerHTML = `
            <div class="rounded-circle bg-dark d-flex align-items-center justify-content-center" style="width: 50px; height: 50px;">
                <i class="bi bi-person-fill text-white fs-4"></i>
            </div>
            <div>
                <div class="fw-semibold">${record.staff_name}</div>
                <small class="text-muted">${record.total_absent_days} day(s) absent</small>
            </div>
        `;
        absentListContainer.appendChild(absentItem);
    });
    
    console.log('Absent workers list updated successfully');
}

async function fetchAuditedSummary(year, month) {
    try {
        // Get token from localStorage
        const token = localStorage.getItem('authToken');
        
        if (!token) {
            console.error('No authentication token found');
            return;
        }

        console.log('Fetching audited summary for year:', year, 'month:', month);
        
        // Show loading state
        const summaryContainer = document.querySelector('.audited-summary-content');
        if (summaryContainer) {
            summaryContainer.innerHTML = `
                <div class="text-center py-5">
                    <div class="spinner-border text-success" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <p class="mt-3 text-muted">Loading audited summary...</p>
                </div>
            `;
        }

        let url = `https://mwms.megacess.com/api/v1/analytics/audited-summary?`;
        if (year && year !== '') url += `year=${year}&`;
        if (month && month !== '') url += `month=${month}&`;
        url = url.replace(/&$/, '');

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log('Audited Summary API Response:', result);
        
        if (result.data && result.data.summary) {
            console.log('Updating audited summary with data:', result.data.summary);
            updateAuditedSummary(result.data);
        } else {
            console.warn('No audited summary data found in API response');
        }
    } catch (error) {
        console.error('Error fetching audited summary:', error);
        const summaryContainer = document.querySelector('.audited-summary-content');
        if (summaryContainer) {
            summaryContainer.innerHTML = '<p class="text-danger text-center py-4">Error loading audited summary data</p>';
        }
    }
}

function updateAuditedSummary(data) {
    const summaryContainer = document.querySelector('.audited-summary-content');
    if (!summaryContainer) {
        console.error('Audited summary container not found');
        return;
    }
    
    // Clear existing content
    summaryContainer.innerHTML = '';
    
    if (!data.summary || data.summary.length === 0) {
        // Display empty state with cards
        const emptyRow = document.createElement('div');
        emptyRow.className = 'row g-3 mb-3';
        emptyRow.innerHTML = `
            <div class="col-md-6">
                <div class="card shadow-sm border-0 rounded-4 overflow-hidden">
                    <div class="bg-success text-white p-2"></div>
                    <div class="card-body p-4 text-center">
                        <p class="text-muted mb-0">No audited summary data available</p>
                    </div>
                </div>
            </div>
            <div class="col-md-6">
                <div class="card shadow-sm border-0 rounded-4 overflow-hidden">
                    <div class="bg-success text-white p-2"></div>
                    <div class="card-body p-4 text-center">
                        <p class="text-muted mb-0">No audited summary data available</p>
                    </div>
                </div>
            </div>
        `;
        summaryContainer.appendChild(emptyRow);
        return;
    }
    
    // Group data by task type and category
    const groupedData = {
        fertilizing: [],
        harvesting: [],
        pruning: [],
        sanitation: []
    };
    
    data.summary.forEach(item => {
        const taskType = item.task_type.toLowerCase();
        if (groupedData[taskType]) {
            groupedData[taskType].push(item);
        } else {
            // Create new category if not exists
            if (!groupedData.other) groupedData.other = [];
            groupedData.other.push(item);
        }
    });
    
    // Create sections based on available data
    
    // Fertilizing and Harvesting Section
    const fertHarvestData = [...groupedData.fertilizing, ...groupedData.harvesting];
    if (fertHarvestData.length > 0) {
        const fertHarvestRow = document.createElement('div');
        fertHarvestRow.className = 'row g-3 mb-3';
        
        fertHarvestData.forEach(item => {
            const col = document.createElement('div');
            col.className = 'col-md-6';
            
            const formattedDate = item.recent_block?.checked_at 
                ? formatDate(item.recent_block.checked_at) 
                : 'N/A';
            
            const totalValue = formatNumber(item.total_value);
            const recentValue = item.recent_block?.total_value 
                ? formatNumber(item.recent_block.total_value) 
                : 'N/A';
            
            col.innerHTML = `
                <div class="card shadow-sm border-0 rounded-4 overflow-hidden">
                    <div class="bg-success text-white p-2"></div>
                    <div class="card-body p-4">
                        <p class="text-muted mb-2">${item.category_name}:</p>
                        <h1 class="display-3 fw-bold mb-4">${totalValue}</h1>
                        <hr>
                        <p class="text-muted mb-2">Recent ${item.task_name.toLowerCase()} block:</p>
                        <p class="mb-0">
                            <strong>Area:</strong> ${item.recent_block?.location_name || 'N/A'}
                            ${item.recent_block?.total_value ? `<strong class="ms-3">Total:</strong> ${recentValue} ${item.unit}` : ''}
                        </p>
                    </div>
                </div>
            `;
            fertHarvestRow.appendChild(col);
        });
        
        summaryContainer.appendChild(fertHarvestRow);
    }
    
    // Pruning Section
    if (groupedData.pruning.length > 0) {
        const pruningRow = document.createElement('div');
        pruningRow.className = 'row g-3 mb-3';
        
        const pruningCard = document.createElement('div');
        pruningCard.className = 'col-12';
        
        let pruningColumns = '';
        groupedData.pruning.forEach((item, index) => {
            const formattedDate = item.recent_block?.checked_at 
                ? formatDate(item.recent_block.checked_at) 
                : 'N/A';
            const totalValue = formatNumber(item.total_value);
            const borderClass = index > 0 ? 'border-start' : '';
            
            pruningColumns += `
                <div class="col-md-${12 / groupedData.pruning.length} ${borderClass}">
                    <p class="text-muted mb-2">${item.category_name}:</p>
                    <h1 class="display-3 fw-bold mb-4">${totalValue}</h1>
                    <p class="text-muted mb-1">Recent pruned block:</p>
                    <p class="mb-1"><strong>Area:</strong> ${item.recent_block?.location_name || 'N/A'}</p>
                    <p class="mb-1"><strong>Checked by:</strong> ${item.recent_block?.checked_by || 'N/A'}</p>
                    <p class="mb-0"><strong>Checked at:</strong> ${formattedDate}</p>
                </div>
            `;
        });
        
        pruningCard.innerHTML = `
            <div class="card shadow-sm border-0 rounded-4 overflow-hidden">
                <div class="bg-success text-white p-2"></div>
                <div class="card-body p-4">
                    <div class="row">
                        ${pruningColumns}
                    </div>
                </div>
            </div>
        `;
        
        pruningRow.appendChild(pruningCard);
        summaryContainer.appendChild(pruningRow);
    }
    
    // Sanitation Section
    if (groupedData.sanitation.length > 0) {
        const sanitationRow = document.createElement('div');
        sanitationRow.className = 'row g-3 mb-3';
        
        const sanitationCard = document.createElement('div');
        sanitationCard.className = 'col-12';
        
        let sanitationColumns = '';
        groupedData.sanitation.forEach((item, index) => {
            const formattedDate = item.recent_block?.checked_at 
                ? formatDate(item.recent_block.checked_at) 
                : 'N/A';
            const totalValue = formatNumber(item.total_value);
            const borderClass = index > 0 ? 'border-start' : '';
            
            sanitationColumns += `
                <div class="col-md-${12 / groupedData.sanitation.length} ${borderClass}">
                    <p class="mb-2"><strong>${item.category_name}:</strong></p>
                    <h1 class="display-3 fw-bold mb-4">${totalValue}</h1>
                    <p class="text-muted mb-1">Recent ${item.category_name.toLowerCase()} block:</p>
                    <p class="mb-1"><strong>Area:</strong> ${item.recent_block?.location_name || 'N/A'}</p>
                    <p class="mb-1"><strong>Checked by:</strong> ${item.recent_block?.checked_by || 'N/A'}</p>
                    <p class="mb-0"><strong>Checked at:</strong> ${formattedDate}</p>
                </div>
            `;
        });
        
        sanitationCard.innerHTML = `
            <div class="card shadow-sm border-0 rounded-4 overflow-hidden">
                <div class="bg-success text-white p-2"></div>
                <div class="card-body p-4">
                    <p class="text-muted mb-3">Total acre sanitized:</p>
                    <div class="row">
                        ${sanitationColumns}
                    </div>
                </div>
            </div>
        `;
        
        sanitationRow.appendChild(sanitationCard);
        summaryContainer.appendChild(sanitationRow);
    }
    
    console.log('Audited summary updated successfully');
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    const options = { day: 'numeric', month: 'long', year: 'numeric' };
    return date.toLocaleDateString('en-GB', options);
}

function formatNumber(value) {
    if (value === null || value === undefined) return '0';
    
    // Round to 2 decimal places and remove unnecessary trailing zeros
    const rounded = Math.round(value * 100) / 100;
    return rounded % 1 === 0 ? rounded.toString() : rounded.toFixed(2);
}
