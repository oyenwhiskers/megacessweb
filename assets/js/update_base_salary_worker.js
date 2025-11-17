// update_base_salary_worker.js handles updating base salary for the selected worker

// Base API URL
const BASE_URL = "https://mwms.megacess.com/api/v1/staff";

// Helper: Get staff_id from URL (e.g., ?staff_id=5)
function getStaffIdFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get("staff_id");
}

// Render input form dynamically inside #workerBaseSalaryContainer
function renderBaseSalaryForm(currentSalary = "") {
  const container = document.getElementById("workerBaseSalaryContainer");

  container.innerHTML = `
    <form id="updateWorkerBaseSalaryForm" class="p-3">
      <div class="mb-3">
        <label for="baseSalaryInput" class="form-label fw-semibold">New Base Salary (RM)</label>
        <input type="number" id="baseSalaryInput" class="form-control" placeholder="Enter new base salary" value="${currentSalary}" min="0" step="0.01">
      </div>

      <button type="submit" id="saveBaseSalaryBtn" class="btn btn-primary">
        <i class="bi bi-save"></i> Save
      </button>
    </form>
  `;
}

// Function to handle base salary update
async function updateBaseSalary(baseSalary) {
  const staffId = getStaffIdFromURL();

  if (!staffId) {
    console.alert(" Worker ID not found in URL.");
    Swal.fire({
      icon: "warning",
      title: "Worker ID not found in URL."
    });
    return;
  }

  try {
    const token = getToken(); // Use your existing helper
    const response = await fetch(`${BASE_URL}/${staffId}/base-salary`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({ base_salary: baseSalary }),
    });

    const result = await response.json();

    if (response.ok) {
      console.log(` ${result.message}\n\nBase Salary updated to RM ${result.base_salary}`);
      Swal.fire({
        icon: "success",
        title: `${result.message}`,
        text: `Base Salary updated to RM ${result.base_salary}`,
        timer: 2500,
        timerProgressBar: true,
      });
    } else {
      // Error message based on backend validation
      if (result.status_code === 422 || result.status_code === 404) {
        console.error(` ${result.message}`);
        Swal.fire({
          icon: "error",
          title: "Error!",
          text: `${result.message}`,
          showCloseButton: true
        });
      } else {
        console.error(` Unexpected error: ${result.message || "Something went wrong."}`);
        Swal.fire({
          icon: "error",
          title: "Unexpected error!",
          text: `${result.message || "Something went wrong."}`,
          showCloseButton: true
        });
      }
    }
  } catch (error) {
    console.error("Error updating base salary:", error);
    console.error(" Failed to update base salary. Please check your network or token.");
    Swal.fire({
      icon: "warning",
      title: "Authentication Required!",
      text: "Please login first before proceeding.",
      confirmButtonText: "Log in now."
    }).then((result) => {
      if (result.isConfirmed){
        window.location.href = "/megacessweb/assets/pages/log-in.html"
      }
    });
  }
}

// Initialize form and attach event listener
document.addEventListener("DOMContentLoaded", () => {
  const staffId = getStaffIdFromURL();

  // Render the form dynamically (you can optionally fetch current salary to display)
  renderBaseSalaryForm();

  // Handle submit
  document.addEventListener("submit", (e) => {
    if (e.target.id === "updateWorkerBaseSalaryForm") {
      e.preventDefault();
      const baseSalary = document.getElementById("baseSalaryInput").value.trim();

      if (isNaN(baseSalary) || baseSalary === "") {
        alert("Please enter a valid numeric base salary.");
        return;
      }

      if (parseFloat(baseSalary) < 0) {
        alert("Base salary cannot be less than 0.");
        return;
      }
      updateBaseSalary(baseSalary);
    }
  });
});
