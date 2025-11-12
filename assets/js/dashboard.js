// Dashboard API Integration
let taskCompletionChart = null;

document.addEventListener('DOMContentLoaded', function() {
    // Get current month and year
    const currentDate = new Date();
    const month = currentDate.getMonth() + 1; // JavaScript months are 0-indexed
    const year = currentDate.getFullYear();
    
    // Initialize chart
    initializeChart();
    
    // Fetch dashboard data
    fetchDashboardData(month, year);
    
    // Fetch chart data
    fetchTasksByBlocks(year, month);
});

async function fetchDashboardData(month, year) {
    try {
        // Get token from localStorage or sessionStorage
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        
        if (!token) {
            console.error('No authentication token found');
            return;
        }

        const response = await fetch(
            `https://mwms.megacess.com/api/v1/analytics/dashboard?month=${month}&year=${year}`,
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
        
        if (result.data) {
            updateDashboard(result.data);
        }
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        // Keep the placeholder values if API fails
    }
}

function updateDashboard(data) {
    // Update pending leave
    const pendingLeaveElement = document.getElementById('pending-leave');
    if (pendingLeaveElement && data.pending_leave !== undefined) {
        pendingLeaveElement.textContent = data.pending_leave;
    }

    // Update number of absence
    const absenceElement = document.getElementById('number-absence');
    if (absenceElement && data.number_of_absence !== undefined) {
        absenceElement.textContent = data.number_of_absence;
    }

    // Update pending payroll
    const pendingPayrollElement = document.getElementById('pending-payroll');
    if (pendingPayrollElement && data.pending_payroll !== undefined) {
        pendingPayrollElement.textContent = data.pending_payroll;
    }

    // Update total yield harvested
    if (data.total_yield_harvested) {
        const yieldTotalElement = document.getElementById('yield-total');
        if (yieldTotalElement) {
            yieldTotalElement.textContent = data.total_yield_harvested.total.toFixed(2);
        }

        // Update recent harvested area
        if (data.total_yield_harvested.recent_harvested_area) {
            const areaNameElement = document.getElementById('area-name');
            const areaTotalElement = document.getElementById('area-total');
            
            if (areaNameElement) {
                areaNameElement.textContent = data.total_yield_harvested.recent_harvested_area.location_name;
            }
            
            if (areaTotalElement) {
                areaTotalElement.textContent = data.total_yield_harvested.recent_harvested_area.total.toFixed(2) + ' ton';
            }
        }
    }

    // Update total equipment used
    if (data.total_equipment_used) {
        const bagsElement = document.getElementById('equipment-bags');
        const litersElement = document.getElementById('equipment-liters');
        
        if (bagsElement && data.total_equipment_used.bags !== undefined) {
            bagsElement.textContent = data.total_equipment_used.bags + ' bags';
        }
        
        if (litersElement && data.total_equipment_used.liters !== undefined) {
            litersElement.textContent = data.total_equipment_used.liters + ' litre';
        }
    }
}

async function fetchTasksByBlocks(year, month, week = null) {
    try {
        // Get token from localStorage or sessionStorage
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        
        if (!token) {
            console.error('No authentication token found');
            return;
        }

        // Build URL with parameters
        let url = `https://mwms.megacess.com/api/v1/analytics/tasks-by-blocks?year=${year}&month=${month}`;
        if (week) {
            url += `&week=${week}`;
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
            updateChart(result.data.data);
        }
    } catch (error) {
        console.error('Error fetching tasks by blocks:', error);
        // Keep the default chart data if API fails
    }
}

function initializeChart() {
    const ctx = document.getElementById('taskCompletionChart');
    if (!ctx) return;
    
    // Default data matching the image
    const defaultData = {
        labels: ['A01', 'A02', 'B01', 'B02', 'C01', 'C02', 'D01', 'D02', 'E01', 'E02', 'F01', 'F02'],
        values: [15, 20, 25, 20, 15, 15, 25, 25, 15, 20, 20, 15]
    };
    
    taskCompletionChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: defaultData.labels,
            datasets: [{
                label: 'Task Completed',
                data: defaultData.values,
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
                    max: 35,
                    ticks: {
                        stepSize: 5,
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

function updateChart(apiData) {
    if (!taskCompletionChart) return;
    
    // Extract labels and values from API data
    const labels = apiData.map(item => item.location_name);
    const values = apiData.map(item => item.count);
    
    // Update chart with API data
    taskCompletionChart.data.labels = labels;
    taskCompletionChart.data.datasets[0].data = values;
    taskCompletionChart.update();
}
