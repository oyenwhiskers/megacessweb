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
    
    // Create resource items from API data
    data.records.forEach(record => {
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
                    <div class="text-muted small">${data.resource_type ? data.resource_type.charAt(0).toUpperCase() + data.resource_type.slice(1) : 'Resource'} type:</div>
                    <div class="fw-semibold">${record.fertilizer_type || record.resource_name || 'N/A'}</div>
                </div>
                <div class="col-md-3">
                    <div class="text-muted small">Amount (${data.unit || 'unit'}):</div>
                    <div class="fw-semibold">${record.amount}</div>
                </div>
            </div>
        `;
        resourceListContainer.appendChild(resourceItem);
    });
    
    console.log('Resource list updated successfully');
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
