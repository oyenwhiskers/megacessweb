// update_base_salary_user.js handles updating base salary for the selected user

// Base API URL
const BASE_URL = "https://mwms.megacess.com/api/v1/users";

// Helper: Get user_id from URL (e.g., ?user_id=5)
function getUserIdFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get("user_id");
}

// Render input form dynamically inside #baseSalaryContainer
function renderBaseSalaryForm(currentSalary = "") {
  const container = document.getElementById("baseSalaryContainer");

  container.innerHTML = `
    <form id="updateBaseSalaryForm" class="p-3">
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
  const userId = getUserIdFromURL();

  if (!userId) {
    alert(" User ID not found in URL.");
    return;
  }

  try {
    const token = getToken(); // Use your existing helper
    const response = await fetch(`${BASE_URL}/${userId}/base-salary`, {
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
      alert(` ${result.message}\n\nBase Salary updated to RM ${result.base_salary}`);
    } else {
      // Error message based on backend validation
      if (result.status_code === 422 || result.status_code === 404) {
        alert(` ${result.message}`);
      } else {
        alert(` Unexpected error: ${result.message || "Something went wrong."}`);
      }
    }
  } catch (error) {
    console.error("Error updating base salary:", error);
    alert(" Failed to update base salary. Please check your network or token.");
  }
}

// Initialize form and attach event listener
document.addEventListener("DOMContentLoaded", () => {
  const userId = getUserIdFromURL();

  // Render the form dynamically (you can optionally fetch current salary to display)
  renderBaseSalaryForm();

  // Handle submit
  document.addEventListener("submit", (e) => {
    if (e.target.id === "updateBaseSalaryForm") {
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
