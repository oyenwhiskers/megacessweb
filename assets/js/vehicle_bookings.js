// ==================== GET /vehicle-bookings ====================
async function getVehicleBookings({
  vehicle_id = '',
  user_id = '',
  staff_id = '',
  per_page = 10,
  token,
} = {}) {
  const apiUrl = new URL('https://mwms.megacess.com/api/v1/vehicle-bookings');

  // Add optional filters as query params
  if (vehicle_id) apiUrl.searchParams.append('vehicle_id', vehicle_id);
  if (user_id) apiUrl.searchParams.append('user_id', user_id);
  if (staff_id) apiUrl.searchParams.append('staff_id', staff_id);
  if (per_page) apiUrl.searchParams.append('per_page', per_page);

  try {
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    const result = await response.json();

    if (result.success) {
      renderVehicleBookings(result.data);
    } else {
      console.error('Failed to fetch bookings:', result.message);
    }
  } catch (error) {
    console.error('Error fetching vehicle bookings:', error);
  }
}

// ==================== RENDER BOOKINGS INTO UI ====================
function renderVehicleBookings(bookings) {
  const tableBody = document.getElementById('vehicleBookingsList');
  if (!tableBody) return console.error('Element #vehicleBookingsList not found.');

  tableBody.innerHTML = ''; // Clear previous rows

  if (!bookings.length) {
    tableBody.innerHTML = `
      <div class="content-row py-2 text-center text-muted">
        No vehicle bookings found.
      </div>
    `;
    return;
  }

  tableBody.innerHTML = bookings.map(b => {
    let statusClass = 'bg-secondary';
    const vehicleStatus = b.vehicle?.status?.toLowerCase() || '';
    if (vehicleStatus === 'available') statusClass = 'bg-success';
    else if (vehicleStatus === 'in use') statusClass = 'bg-warning text-dark';
    else if (vehicleStatus === 'under maintenance') statusClass = 'bg-danger';

    return `
      <div class="content-row d-flex align-items-center border-bottom py-2">
        <div class="col">${b.vehicle?.vehicle_name || '-'}</div>
        <div class="col">${b.vehicle?.plate_number || '-'}</div>
        <div class="col"><span class="${statusClass} px-2 py-1 rounded">${b.vehicle?.status || '-'}</span></div>
        <div class="col">
          ${b.staff 
            ? `${b.staff.staff_fullname}` 
            : 'Unassigned'}
        </div>
        <div class="col">${new Date(b.datetime_booking).toLocaleString()}</div>
        <div class="col">${b.datetime_return ? new Date(b.datetime_return).toLocaleString() : '-'}</div>
        <div class="col text-center">
          <button class="btn btn-sm btn-outline-primary" onclick="viewBooking(${b.id})">View</button>
        </div>
      </div>
    `;
  }).join('');
}

// Example usage:
const token = '69|Pqml1FrUSJP2y2LbluqZH826kI3hb8RtwOajuPos9e9fd0f0';
getVehicleBookings({ token });
