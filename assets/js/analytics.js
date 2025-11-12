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
