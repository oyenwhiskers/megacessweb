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
