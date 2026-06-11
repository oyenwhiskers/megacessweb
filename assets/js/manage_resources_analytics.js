document.addEventListener("DOMContentLoaded", () => {
  const periodSelect = document.getElementById("analyticsPeriod");
  if (periodSelect) {
    periodSelect.addEventListener("change", function () {
      fetchAnalyticsData(this.value);
    });
    // Initial fetch
    fetchAnalyticsData(periodSelect.value);
  } else {
    fetchAnalyticsData();
  }
});

async function fetchAnalyticsData(period = "year") {
  setLoadingState();
  try {
    // Using apiFetch from utils.js
    const response = await apiFetch(
      `/analytics/resources-usage?period=${period}`
    );
    if (response.success && response.data) {
      updateVehicleAnalytics(response.data.vehicle_analytics);
      updateToolAnalytics(response.data.tools_analytics);
      updateFuelAnalytics(response.data.fuel_analytics);
    } else {
      console.error("Failed to load analytics data");
      setErrorState();
    }
  } catch (error) {
    console.error("Error fetching analytics:", error);
    setErrorState();
  }
}

function setLoadingState() {
  const ids = [
    "vehicle-total",
    "vehicle-available",
    "vehicle-in-use",
    "vehicle-maintenance",
    "tools-total",
    "tools-available",
    "tools-in-use",
    "tools-broken",
    "fuel-remaining",
    "fuel-total-bought",
    "fuel-total-used",
    "fuelPetValue",
    "fuelDiesValue",
    "fuelH10Value",
    "fuelH40Value",
    "fuelH68Value",
    "fuelH90Value",
  ];

  const spinner =
    '<div class="spinner-border spinner-border-sm text-primary" role="status"><span class="visually-hidden">Loading...</span></div>';

  ids.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = spinner;
  });
}

function setErrorState() {
  const ids = [
    "vehicle-total",
    "vehicle-available",
    "vehicle-in-use",
    "vehicle-maintenance",
    "tools-total",
    "tools-available",
    "tools-in-use",
    "tools-broken",
    "fuel-remaining",
    "fuel-total-bought",
    "fuel-total-used",
    "fuelPetValue",
    "fuelDiesValue",
    "fuelH10Value",
    "fuelH40Value",
    "fuelH68Value",
    "fuelH90Value",
  ];

  ids.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.textContent = "-";
  });
}

function updateVehicleAnalytics(data) {
  if (!data) return;

  const totalEl = document.getElementById("vehicle-total");
  const availableEl = document.getElementById("vehicle-available");
  const inUseEl = document.getElementById("vehicle-in-use");
  const maintenanceEl = document.getElementById("vehicle-maintenance");

  if (totalEl) totalEl.textContent = data.total_vehicles || 0;
  if (availableEl) availableEl.textContent = data.available || 0;
  if (inUseEl) inUseEl.textContent = data.in_use || 0;
  if (maintenanceEl) maintenanceEl.textContent = data.under_maintenance || 0;

  if (data.bookings_trend) {
    initVehicleChart(data.bookings_trend);
  } else if (data.monthly_bookings) {
    // Fallback for backward compatibility if needed, or just remove
    initVehicleChart(data.monthly_bookings);
  }
}

function updateToolAnalytics(data) {
  if (!data) return;

  const totalEl = document.getElementById("tools-total");
  const availableEl = document.getElementById("tools-available");
  const inUseEl = document.getElementById("tools-in-use");
  const brokenEl = document.getElementById("tools-broken");

  if (totalEl) totalEl.textContent = data.total_spare_parts || 0;
  if (availableEl) availableEl.textContent = data.available || 0;
  if (inUseEl) inUseEl.textContent = data.used || 0;
  // broken is not provided in new JSON found, usually we assume broken = total - available - used, or explicitly 0 if not provided
  // JSON provided: total_spare_parts: 3, available: 2, used: 1. 2+1=3. So broken is 0.
  // If broken is not in data, we can try to derive or just show 0
  if (brokenEl) brokenEl.textContent = 0;

  if (data.status_distribution) {
    initToolChart(data.status_distribution);
  }
}

function updateFuelAnalytics(data) {
  if (!data) return;

  const remainingEl = document.getElementById("fuel-remaining");
  const totalBoughtEl = document.getElementById("fuel-total-bought");
  const totalUsedEl = document.getElementById("fuel-total-used");

  if (remainingEl) remainingEl.textContent = data.remaining_fuel || 0;
  if (totalBoughtEl) totalBoughtEl.textContent = data.total_fuel_bought || 0;
  if (totalUsedEl) totalUsedEl.textContent = data.total_fuel_used || 0;

  // Fuel Breakdown
  if (data.fuel_by_type && Array.isArray(data.fuel_by_type)) {
    const typeToId = {
      Petrol: "fuelPetValue",
      Diesel: "fuelDiesValue",
      "Hydraulic Oil 10": "fuelH10Value",
      "Hydraulic Oil 40": "fuelH40Value",
      "Hydraulic Oil 68": "fuelH68Value",
      "Hydraulic Oil 90": "fuelH90Value",
    };

    let breakdownMap = {};
    data.fuel_by_type.forEach((item) => {
      if (item.fuel_type)
        breakdownMap[item.fuel_type] = item.remaining_fuel || 0;
    });

    Object.entries(typeToId).forEach(([type, id]) => {
      const el = document.getElementById(id);
      if (el) el.textContent = breakdownMap[type] || 0;
    });
  }

  if (data.fuel_usage_trend) {
    initFuelChart(data.fuel_usage_trend);
  } else if (data.monthly_fuel_usage) {
    initFuelChart(data.monthly_fuel_usage);
  }
}

// Chart instances
let vehicleChartInstance = null;
let toolChartInstance = null;
let fuelChartInstance = null;

function initVehicleChart(dataItems) {
  const ctx = document.getElementById("vehicleChart");
  if (!ctx) return;

  // Handle both new "period_label" and old "month_name"
  const labels = dataItems.map((item) => item.period_label || item.month_name);
  const data = dataItems.map((item) => item.bookings);

  if (vehicleChartInstance) vehicleChartInstance.destroy();

  vehicleChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Bookings",
          data: data,
          backgroundColor: "#0d6efd",
          borderRadius: 6,
        },
      ],
    },
    options: {
      maintainAspectRatio: false,
      scales: { y: { beginAtZero: true } },
    },
  });
}

function initToolChart(statusDistribution) {
  const ctx = document.getElementById("toolsChart");
  if (!ctx) return;

  // Map status to colors
  const colorMap = {
    Available: "#198754",
    "In Use": "#0d6efd",
    Broken: "#ffc107",
    "Under Maintenance": "#ffc107",
  };

  const labels = statusDistribution.map((item) => item.status);
  const data = statusDistribution.map((item) => item.count);
  const backgroundColor = labels.map((label) => colorMap[label] || "#6c757d");

  if (toolChartInstance) toolChartInstance.destroy();

  toolChartInstance = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: labels,
      datasets: [{ data: data, backgroundColor: backgroundColor }],
    },
    options: {
      maintainAspectRatio: false,
      plugins: { legend: { position: "bottom", labels: { padding: 20 } } },
    },
  });
}

function initFuelChart(dataItems) {
  const ctx = document.getElementById("fuelChart");
  if (!ctx) return;

  const labels = dataItems.map((item) => item.period_label || item.month_name);
  const data = dataItems.map((item) => item.fuel_used);

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
    options: {
      maintainAspectRatio: false,
      scales: { y: { beginAtZero: true } },
    },
  });
}
