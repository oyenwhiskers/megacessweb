// Dashboard API Integration
document.addEventListener('DOMContentLoaded', function() {
    // Get current month and year
    const currentDate = new Date();
    const month = currentDate.getMonth() + 1; // JavaScript months are 0-indexed
    const year = currentDate.getFullYear();
    
    // Fetch dashboard data
    fetchDashboardData(month, year);
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
