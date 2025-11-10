/*
  GET /vehicles
  Fetches a list of vehicles with optional search and status filters.
*/

// Function to fetch all vehicles
async function getAllVehicles({ search = '', status = '', per_page = 15 } = {}) {
  const token = '69|Pqml1FrUSJP2y2LbluqZH826kI3hb8RtwOajuPos9e9fd0f0'; // replace with your actual token
  const apiUrl = new URL('https://mwms.megacess.com/api/v1/vehicles');

  // Add optional query parameters
  if (search) apiUrl.searchParams.append('search', search);
  if (status) apiUrl.searchParams.append('status', status);
  if (per_page) apiUrl.searchParams.append('per_page', per_page);

  const loading = document.getElementById('loading');
  const tableBody = document.getElementById('vehicleTableBody');

  // Show loading spinner
  loading.style.display = 'block';
  tableBody.innerHTML = ''; // Clear previous rows while loading

  try {
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    const result = await response.json();

    // Hide loading spinner
    loading.style.display = 'none';

    if (response.ok && result.success) {
      if (result.data.length > 0) {
        populateVehicleTable(result.data);
      } else {
        tableBody.innerHTML = `<div class="text-center text-muted py-3">No vehicles found</div>`;
      }
    } else {
      tableBody.innerHTML = `<div class="text-center text-danger py-3">Error: ${result.message}</div>`;
      console.error('Error fetching vehicles:', result.message);
    }
  } catch (error) {
    loading.style.display = 'none';
    tableBody.innerHTML = `<div class="text-center text-danger py-3">Failed to load vehicles</div>`;
    console.error('Fetch error:', error);
  }
}

// Function to populate vehicle table
function populateVehicleTable(vehicles) {
  const tableBody = document.getElementById('vehicleTableBody');
  tableBody.innerHTML = ''; // Clear previous rows

  vehicles.forEach(vehicle => {
    const row = document.createElement('div');
    row.className = 'vehicle-row d-flex border-bottom py-2';

    // Determine the badge color based on status
    let statusClass = 'bg-secondary'; // default gray
    if (vehicle.status.toLowerCase() === 'available') statusClass = 'bg-success';
    else if (vehicle.status.toLowerCase() === 'in use') statusClass = 'bg-warning text-dark';
    else if (vehicle.status.toLowerCase() === 'under maintenance') statusClass = 'bg-danger';

    row.innerHTML = `
      <div class="col ps-3">${vehicle.vehicle_name}</div>
      <div class="col">${vehicle.plate_number}</div>
      <div class="col"><span class="badge ${statusClass}">${vehicle.status}</span></div>
      <div class="col text-center">
        <button class="btn btn-sm btn-warning me-2"><i class="bi bi-pencil"></i> Edit</button>
        <button class="btn btn-sm btn-danger delete-vehicle-btn" data-id="${vehicle.id}"><i class="bi bi-trash"></i> Delete</button>
      </div>
    `;

    tableBody.appendChild(row);
  });

  // Attach delete event listeners
  attachDeleteListeners();
}

// Call the function on page load
window.addEventListener('DOMContentLoaded', () => {
  getAllVehicles();
});

//debounce helper function
function debounce(func, delay) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => func.apply(this, args), delay);
  };
}

// Event listeners for search and filter
function updateVehicleTable() {
  const searchValue = document.getElementById('vehicleSearch').value.trim() || undefined;
  const statusValue = document.getElementById('vehicleStatus').value || undefined; // empty string becomes undefined
  getAllVehicles({ search: searchValue, status: statusValue });
}
const handleSearch = debounce(updateVehicleTable, 100);
document.getElementById('vehicleSearch').addEventListener('input', handleSearch);
document.getElementById('vehicleStatus').addEventListener('change', updateVehicleTable);

/*
  POST api/v1/vehicles
  Creates a new vehicle.
*/
document.addEventListener('DOMContentLoaded', () => {
  const addBtn = document.getElementById('addVehicleBtn');

  addBtn.addEventListener('click', async () => {
    const token = '69|Pqml1FrUSJP2y2LbluqZH826kI3hb8RtwOajuPos9e9fd0f0';

    const vehicleName = document.getElementById('vehicleName').value.trim();
    const plateNo = document.getElementById('plateNo').value.trim();
    const statusSelect = document.getElementById('addVehicleStatus');
    const status = statusSelect.value;

    if (!vehicleName || !plateNo || !status || status === 'Choose status') {
      alert('Please fill in all fields.');
      return;
    }

    // Disable button + loading text
    addBtn.disabled = true;
    const originalText = addBtn.textContent;
    addBtn.textContent = 'Adding...';

    try {
      const response = await fetch('https://mwms.megacess.com/api/v1/vehicles', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          vehicle_name: vehicleName,
          plate_number: plateNo,
          status: status
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('addVehicleModal'));
        modal.hide();

        // Reset form
        document.getElementById('vehicleName').value = '';
        document.getElementById('plateNo').value = '';
        statusSelect.value = 'Choose status';

        // Refresh vehicle table
        getAllVehicles();

        alert('Vehicle added successfully!');
      } else {
        alert('Error: ' + result.message);
      }
    } catch (error) {
      console.error('Error adding vehicle:', error);
      alert('Failed to add vehicle. Please try again.');
    } finally {
      addBtn.disabled = false;
      addBtn.textContent = originalText;
    }
  });
});

/*
  DELETE api/v1/vehicles/{id}
  Deletes a vehicle by ID.
*/
// Function to delete vehicle

function showLoading() {
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) overlay.classList.remove('d-none');
}

function hideLoading() {
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) overlay.classList.add('d-none');
}

async function deleteVehicle(vehicleId) {
  const token = '69|Pqml1FrUSJP2y2LbluqZH826kI3hb8RtwOajuPos9e9fd0f0';

  // Confirmation
  if (!confirm('Are you sure you want to delete this vehicle?')) return;

  showLoading(); // show overlay spinner

  try {
    const response = await fetch(`https://mwms.megacess.com/api/v1/vehicles/${vehicleId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    const result = await response.json();

    if (response.ok && result.success) {
      alert(result.message); // or use toast notification
      getAllVehicles(); // refresh the table
    } else {
      alert('Error: ' + result.message);
    }
  } catch (error) {
    console.error('Error deleting vehicle:', error);
    alert('Failed to delete vehicle. Please try again.');
  } finally {
    hideLoading(); // hide overlay spinner
  }
}

// Attach delete event listeners to buttons
function attachDeleteListeners() {
  const deleteButtons = document.querySelectorAll('.delete-vehicle-btn');
  deleteButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const vehicleId = btn.getAttribute('data-id');
      deleteVehicle(vehicleId);
    });
  });
}

// In your populateVehicleTable function, after appending rows:
populateVehicleTable(result.data);
attachDeleteListeners();

/*
  PUT api/v1/vehicles/{id}
  Updates a vehicle by ID.
*/