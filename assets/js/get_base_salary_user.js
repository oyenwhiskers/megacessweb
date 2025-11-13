// get_base_salary_user.js - Fetch and edit base salary with staff info

$(document).ready(function () {
  const API_BASE = "https://mwms.megacess.com/api/v1/users";
  const token = getToken(); // from main.js

  if (!token) {
    console.error("Token not found. User must be authenticated.");
    $("#baseSalaryContainer").html('<p class="text-danger">Authentication required.</p>');
    return;
  }

  const headers = {
    "Authorization": "Bearer " + token,
    "Content-Type": "application/json",
    "Accept": "application/json",
  };

  // Get user ID from URL
  const params = new URLSearchParams(window.location.search);
  const userId = params.get("id");
  const container = $("#baseSalaryContainer");

  if (!userId) {
    console.error("No user ID provided in URL.");
    container.html('<p class="text-danger">No user selected.</p>');
    return;
  }

  container.html('<p>Loading staff base salary...</p>');

  // -------------------------
  // Render Base Salary Form
  // -------------------------
  function renderUserForm(data) {
    container.empty();

    const baseSalary = data.base_salary ? parseFloat(data.base_salary).toFixed(2) : "0.00";
    const updatedAt = data.updated_at
      ? new Date(data.updated_at).toLocaleString()
      : "—";

    const html = `
      <div class="card p-3 shadow-sm">
        <div class="mb-3">
          <label class="form-label fw-semibold">Current Base Salary (RM)</label>
          <input type="text" class="form-control" value="${baseSalary}" disabled>
        </div>

        <div class="mb-3">
          <label class="form-label fw-semibold">New Base Salary (RM)</label>
          <div class="input-group">
            <span class="input-group-text">RM</span>
            <input type="number" class="form-control" id="newBaseSalary" value="${baseSalary}" step="any">
          </div>
        </div>

        <p class="text-muted small">Last updated: ${updatedAt}</p>

        <div class="text-end mt-3">
          <button id="saveSalaryBtn" class="btn btn-success">Save Changes</button>
        </div>
      </div>
    `;

    container.append(html);

    // -------------------------
    // Save Updated Salary
    // -------------------------
    $("#saveSalaryBtn").on("click", function () {
      const newSalary = parseFloat($("#newBaseSalary").val());
      if (isNaN(newSalary)) {
        alert("Please enter a valid numeric value.");
        return;
      }

      $(this).prop("disabled", true).text("Saving...");

      $.ajax({
        url: `${API_BASE}/${userId}/base-salary`,
        method: "PUT", // or PATCH depending on backend
        headers: headers,
        contentType: "application/json",
        data: JSON.stringify({ base_salary: newSalary }),
        success: function (res) {
          alert("Base salary updated successfully!");
          renderUserForm(res); // re-render with updated data
        },
        error: function (xhr) {
          console.error("Failed to update base salary:", xhr.responseText);
          alert("Failed to update base salary. Please try again.");
          $("#saveSalaryBtn").prop("disabled", false).text("Save Changes");
        }
      });
    });
  }

  // -------------------------
  // Fetch Base Salary
  // -------------------------
  $.ajax({
    url: `${API_BASE}/${userId}/base-salary`,
    method: "GET",
    headers: headers,
    success: function (data) {
      renderUserForm(data);
    },
    error: function (xhr) {
      console.error("Error fetching base salary:", xhr.responseText);
      container.html('<p class="text-danger">Failed to load base salary.</p>');
    }
  });
});
