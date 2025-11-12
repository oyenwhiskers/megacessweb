// Analytics API Integration
let taskCompletionChartMonth = null;
let taskCompletionChartBlock = null;

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
});

async function fetchMonthlyTaskCompletion(year, locationId = 1) {
    try {
        // Get token from localStorage (using 'authToken' key)
        const token = localStorage.getItem('authToken');
        
        if (!token) {
            console.error('No authentication token found');
            return;
        }

        console.log('Fetching monthly task completion for year:', year, 'location:', locationId);

        const response = await fetch(
            `https://mwms.megacess.com/api/v1/analytics/task-completion?year=${year}&location_id=${locationId}`,
            {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            }
        );

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log('API Response:', result);
        
        if (result.data && result.data.data) {
            console.log('Updating chart with data:', result.data.data);
            updateMonthlyChart(result.data.data);
        } else {
            console.warn('No data found in API response');
        }
    } catch (error) {
        console.error('Error fetching monthly task completion:', error);
        // Keep the default chart data if API fails
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

async function fetchBlockTaskCompletion(year) {
    try {
        // Get token from localStorage
        const token = localStorage.getItem('authToken');
        
        if (!token) {
            console.error('No authentication token found');
            return;
        }

        console.log('Fetching block task completion for year:', year);

        const response = await fetch(
            `https://mwms.megacess.com/api/v1/analytics/tasks-by-blocks?year=${year}`,
            {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            }
        );

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log('Block API Response:', result);
        
        if (result.data && result.data.data) {
            console.log('Updating block chart with data:', result.data.data);
            console.log('Total completed tasks:', result.data.total_completed);
            updateBlockChart(result.data.data);
        } else {
            console.warn('No data found in API response for blocks');
        }
    } catch (error) {
        console.error('Error fetching block task completion:', error);
        // Keep the default chart data if API fails
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
    
    console.log('Updating block chart with API data:', apiData);
    
    // Extract location names and counts from API data
    const labels = apiData.map(item => item.location_name);
    const values = apiData.map(item => item.count);
    
    console.log('Block Labels:', labels);
    console.log('Block Values:', values);
    
    // Find the maximum value to set appropriate scale
    const maxValue = Math.max(...values);
    const yAxisMax = Math.ceil(maxValue / 10) * 10 + 10; // Round up and add padding
    
    // Update chart with API data
    taskCompletionChartBlock.data.labels = labels;
    taskCompletionChartBlock.data.datasets[0].data = values;
    taskCompletionChartBlock.options.scales.y.max = yAxisMax;
    taskCompletionChartBlock.update();
    
    console.log('Block chart updated successfully');
}

async function fetchResourceUsage() {
    try {
        // Get token from localStorage
        const token = localStorage.getItem('authToken');
        
        if (!token) {
            console.error('No authentication token found');
            return;
        }

        // Set date range for current year
        const currentDate = new Date();
        const year = currentDate.getFullYear();
        const startDate = `${year}-01-01`;
        const endDate = `${year}-12-31`;
        
        console.log('Fetching resource usage data...');

        const response = await fetch(
            `https://mwms.megacess.com/api/v1/analytics/resource-usage?task_type=manuring&sanitation_type=spraying&start_date=${startDate}&end_date=${endDate}&location_id=1`,
            {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            }
        );

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log('Resource Usage API Response:', result);
        
        if (result.data && result.data.records) {
            console.log('Updating resource list with data:', result.data.records);
            updateResourceList(result.data);
        } else {
            console.warn('No resource usage data found in API response');
        }
    } catch (error) {
        console.error('Error fetching resource usage:', error);
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
}

function setupResourceFilters() {
    const estateOfficerSearch = document.getElementById('resourceEstateOfficerSearch');
    const dateFilter = document.getElementById('resourceDateFilter');
    
    if (!estateOfficerSearch || !dateFilter) return;
    
    // Remove existing event listeners
    estateOfficerSearch.removeEventListener('input', handleResourceFilter);
    dateFilter.removeEventListener('change', handleResourceFilter);
    
    // Add event listeners
    estateOfficerSearch.addEventListener('input', handleResourceFilter);
    dateFilter.addEventListener('change', handleResourceFilter);
}

function handleResourceFilter() {
    if (!window.resourceUsageData) return;
    
    const estateOfficerSearch = document.getElementById('resourceEstateOfficerSearch');
    const dateFilter = document.getElementById('resourceDateFilter');
    
    const searchTerm = estateOfficerSearch.value.toLowerCase().trim();
    const filterDate = dateFilter.value;
    
    let filteredRecords = window.resourceUsageData.records;
    
    // Filter by estate officer name
    if (searchTerm !== '') {
        filteredRecords = filteredRecords.filter(record => 
            record.estate_officer.toLowerCase().includes(searchTerm)
        );
    }
    
    // Filter by date
    if (filterDate) {
        filteredRecords = filteredRecords.filter(record => 
            record.date === filterDate
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

        const response = await fetch(
            `https://mwms.megacess.com/api/v1/analytics/tasks-by-mandors?year=${year}&month=${month}`,
            {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            }
        );

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
        
        // Check if profile image exists, otherwise use default icon
        const profileImageHTML = record.profile_image || record.avatar || record.image_url
            ? `<img src="${record.profile_image || record.avatar || record.image_url}" 
                    alt="${record.estate_officer_name}" 
                    class="rounded-circle" 
                    style="width: 60px; height: 60px; object-fit: cover;"
                    onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
               <div class="rounded-circle bg-dark d-none align-items-center justify-content-center" style="width: 60px; height: 60px;">
                   <i class="bi bi-person-fill text-white fs-3"></i>
               </div>`
            : `<div class="rounded-circle bg-dark d-flex align-items-center justify-content-center" style="width: 60px; height: 60px;">
                   <i class="bi bi-person-fill text-white fs-3"></i>
               </div>`;
        
        officerCard.innerHTML = `
            <div class="card-body p-3">
                <div class="row align-items-center">
                    <div class="col-auto">
                        ${profileImageHTML}
                    </div>
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

        const response = await fetch(
            `https://mwms.megacess.com/api/v1/analytics/attendance-by-mandors?year=${year}&month=${month}`,
            {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            }
        );

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

        const response = await fetch(
            `https://mwms.megacess.com/api/v1/analytics/absent-workers?year=${year}&month=${month}`,
            {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            }
        );

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

        const response = await fetch(
            `https://mwms.megacess.com/api/v1/analytics/audited-summary?year=${year}&month=${month}`,
            {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            }
        );

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
