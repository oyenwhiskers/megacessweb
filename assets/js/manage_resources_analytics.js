document.addEventListener('DOMContentLoaded', () => {
    fetchAnalyticsData();
});

async function fetchAnalyticsData() {
    try {
        // Using apiFetch from utils.js
        const response = await apiFetch('/analytics/resources-usage');
        if (response.success && response.data) {
            updateVehicleAnalytics(response.data.vehicle_analytics);
            updateToolAnalytics(response.data.tools_analytics);
            updateFuelAnalytics(response.data.fuel_analytics);
        } else {
            console.error('Failed to load analytics data');
        }
    } catch (error) {
        console.error('Error fetching analytics:', error);
    }
}

function updateVehicleAnalytics(data) {
    if (!data) return;

    const totalEl = document.getElementById('vehicle-total');
    const availableEl = document.getElementById('vehicle-available');
    const inUseEl = document.getElementById('vehicle-in-use');
    const maintenanceEl = document.getElementById('vehicle-maintenance');

    if (totalEl) totalEl.textContent = data.total_vehicles || 0;
    if (availableEl) availableEl.textContent = data.available || 0;
    if (inUseEl) inUseEl.textContent = data.in_use || 0;
    if (maintenanceEl) maintenanceEl.textContent = data.under_maintenance || 0;

    if (data.monthly_bookings) {
        initVehicleChart(data.monthly_bookings);
    }
}

function updateToolAnalytics(data) {
    if (!data) return;

    const totalEl = document.getElementById('tools-total');
    const availableEl = document.getElementById('tools-available');
    const inUseEl = document.getElementById('tools-in-use');
    const brokenEl = document.getElementById('tools-broken');

    if (totalEl) totalEl.textContent = data.total_tools || 0;
    if (availableEl) availableEl.textContent = data.available || 0;
    if (inUseEl) inUseEl.textContent = data.in_use || 0;
    if (brokenEl) brokenEl.textContent = data.broken || 0;

    if (data.status_distribution) {
        initToolChart(data.status_distribution);
    }
}

function updateFuelAnalytics(data) {
    if (!data) return;

    const remainingEl = document.getElementById('fuel-remaining');
    if (remainingEl) remainingEl.textContent = data.remaining_fuel || 0;

    if (data.monthly_fuel_usage) {
        initFuelChart(data.monthly_fuel_usage);
    }
}

// Chart instances
let vehicleChartInstance = null;
let toolChartInstance = null;
let fuelChartInstance = null;

function initVehicleChart(monthlyBookings) {
    const ctx = document.getElementById("vehicleChart");
    if (!ctx) return;

    const labels = monthlyBookings.map(item => item.month_name);
    const data = monthlyBookings.map(item => item.bookings);

    if (vehicleChartInstance) vehicleChartInstance.destroy();

    vehicleChartInstance = new Chart(ctx, {
        type: "bar",
        data: {
            labels: labels,
            datasets: [{ label: "Bookings", data: data, backgroundColor: "#0d6efd", borderRadius: 6 }],
        },
        options: { maintainAspectRatio: false, scales: { y: { beginAtZero: true } } },
    });
}

function initToolChart(statusDistribution) {
    const ctx = document.getElementById("toolsChart");
    if (!ctx) return;

    // Map status to colors
    const colorMap = {
        "Available": "#198754",
        "In Use": "#0d6efd",
        "Broken": "#ffc107",
        "Under Maintenance": "#ffc107"
    };

    const labels = statusDistribution.map(item => item.status);
    const data = statusDistribution.map(item => item.count);
    const backgroundColor = labels.map(label => colorMap[label] || "#6c757d");

    if (toolChartInstance) toolChartInstance.destroy();

    toolChartInstance = new Chart(ctx, {
        type: "doughnut",
        data: {
            labels: labels,
            datasets: [{ data: data, backgroundColor: backgroundColor }],
        },
        options: { maintainAspectRatio: false, plugins: { legend: { position: "bottom" } } },
    });
}

function initFuelChart(monthlyFuelUsage) {
    const ctx = document.getElementById("fuelChart");
    if (!ctx) return;

    const labels = monthlyFuelUsage.map(item => item.month_name);
    const data = monthlyFuelUsage.map(item => item.fuel_used);

    if (fuelChartInstance) fuelChartInstance.destroy();

    fuelChartInstance = new Chart(ctx, {
        type: "line",
        data: {
            labels: labels,
            datasets: [
                {
                    label: "Fuel Used (L)",
                    data: data,
                    fill: true,
                    backgroundColor: "rgba(13,110,253,0.1)",
                    borderColor: "#0d6efd",
                    tension: 0.3,
                },
            ],
        },
        options: { maintainAspectRatio: false, scales: { y: { beginAtZero: true } } },
    });
}
