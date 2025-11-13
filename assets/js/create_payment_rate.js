// create_payment_rate.js

const API_BASE_URL = "https://mwms.megacess.com/api/v1/payment-rates";
const TOKEN_KEYS = ['authToken', 'auth_token', 'token', 'access_token'];

/* -------------------- Token Utilities -------------------- */
function getToken() {
  for (const key of TOKEN_KEYS) {
    const token = localStorage.getItem(key) || sessionStorage.getItem(key);
    if (token) return token;
  }
  console.error("No authentication token found.");
  return null;
}

function getHeaders() {
  const token = getToken();
  return {
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json",
    "Accept": "application/json"
  };
}

/* -------------------- Page Ready -------------------- */
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("createPaymentRateForm");
  const addCategoryBtn = document.getElementById("addCategoryBtn");

  if (!form) return;

  /* Handle form submit */
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Base fields
    const task_name = document.getElementById("task_name").value.trim();
    const description = document.getElementById("description").value.trim();
    const is_active = document.getElementById("is_active").checked;

    // Categories
    const categoryCards = document.querySelectorAll(".category-card");
    const categories = Array.from(categoryCards).map((card) => {
      const category_name = card.querySelector(".category_name").value.trim();
      const rate = parseFloat(card.querySelector(".rate").value);
      const unit = card.querySelector(".unit").value.trim();

      const condition_type = card.querySelector(".condition_type").value.trim();
      const condition_min = card.querySelector(".condition_min").value;
      const condition_max = card.querySelector(".condition_max").value;
      const condition_unit = card.querySelector(".condition_unit").value.trim();

      let condition = null;
      if (condition_type || condition_min || condition_max || condition_unit) {
        condition = {
          type: condition_type || "",
          min_quantity: condition_min ? Number(condition_min) : null,
          max_quantity: condition_max ? Number(condition_max) : null,
          unit: condition_unit || ""
        };
      }

      return {
        category_name,
        category_key: category_name.toLowerCase().replace(/\s+/g, "_"),
        rate,
        unit,
        ...(condition ? { condition } : {})
      };
    });

    const body = {
      task_name,
      description,
      is_active,
      categories
    };

    console.log("Sending data:", body);

    try {
      const response = await fetch(API_BASE_URL, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(body)
      });

      const result = await response.json();
      console.log("Server response:", result);

      if (response.ok && result.success) {
        alert("Payment rate created successfully!");
        window.location.href = "/megacessweb/pages/manage-payment-rate.html?type=work";
      } else {
        let msg = result.message || "Failed to create payment rate.";
        if (result.errors) {
          msg += "\n" + Object.entries(result.errors)
            .map(([key, val]) => `${key}: ${val.join(", ")}`)
            .join("\n");
        }
        alert(msg);
      }

    } catch (error) {
      console.error("Error creating payment rate:", error);
      alert("An unexpected error occurred while creating the payment rate.");
    }
  });

  /* Add New Category Logic */
  addCategoryBtn.addEventListener("click", () => {
    const categorySection = document.querySelector(".category-section");
    const categoryCount = document.querySelectorAll(".category-card").length + 1;

    const newCategoryHTML = `
      <div class="category-card card mb-4">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-center">
            <h5><strong>Category ${categoryCount}</strong></h5>
            <button type="button" class="btn btn-danger btn-sm remove-category-btn">
              <i class="bi bi-x-circle"></i> Remove
            </button>
          </div>

          <div class="mb-3 mt-3">
            <label class="form-label fw-semibold">Category Name *:</label>
            <input type="text" class="form-control category_name" placeholder="e.g Routine Pruning" required>
          </div>

          <div class="row mb-3">
            <div class="col-md-6">
              <label class="form-label fw-semibold">Rate (RM) *:</label>
              <input type="number" class="form-control rate" placeholder="e.g 4.00" required>
            </div>
            <div class="col-md-6">
              <label class="form-label fw-semibold">Unit *:</label>
              <input type="text" class="form-control unit" placeholder="per palm" required>
            </div>
          </div>

          <hr>
          <h6 class="mb-3"><strong>Condition (optional)</strong></h6>

          <div class="row mb-3">
            <div class="col-md-3">
              <label class="form-label fw-semibold">Type:</label>
              <input type="text" class="form-control condition_type" placeholder="e.g, Weight">
            </div>
            <div class="col-md-3">
              <label class="form-label fw-semibold">Min:</label>
              <input type="number" class="form-control condition_min" placeholder="e.g, 0">
            </div>
            <div class="col-md-3">
              <label class="form-label fw-semibold">Max:</label>
              <input type="number" class="form-control condition_max" placeholder="e.g, 30">
            </div>
            <div class="col-md-3">
              <label class="form-label fw-semibold">Unit:</label>
              <input type="text" class="form-control condition_unit" placeholder="e.g, kg or ton">
            </div>

            <div class="col-md-12 mt-3">
              <label class="form-label fw-semibold">Display Order:</label>
              <input type="number" class="form-control display_order" placeholder="0">
            </div>
          </div>
        </div>
      </div>
    `;

    categorySection.insertAdjacentHTML("beforeend", newCategoryHTML);
  });

  /* Delegate event: Remove Category */
  document.addEventListener("click", (e) => {
    if (e.target.closest(".remove-category-btn")) {
      const card = e.target.closest(".category-card");
      if (card) card.remove();

      // Re-label categories after removal
      const allCards = document.querySelectorAll(".category-card");
      allCards.forEach((c, idx) => {
        const title = c.querySelector("h5 strong");
        if (title) title.textContent = `Category ${idx + 1}`;
      });
    }
  });
});
