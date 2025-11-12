/* This JS file will include the deletion of the payment rate */

// delete_payment_rate.js

const API_BASE_URL = "https://mwms.megacess.com/api/v1/payment-rates";

/**
 * Delete a payment rate by ID
 * @param {number|string} id - The payment rate ID to delete
 */
async function deletePaymentRate(id) {
  if (!id) {
    alert("Invalid payment rate ID.");
    return;
  }

  const token = localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
  if (!token) {
    alert("Authentication token not found. Please log in again.");
    return;
  }

  if (!confirm("Are you sure you want to delete this payment rate? This action cannot be undone.")) {
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/${id}`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
    });

    const result = await response.json();

    if (response.ok && result.success) {
      // Hide or remove the deleted payment rate UI section
      $(`#workSection .task-editor .card-body`).empty(); // clear editor content
      alert(result.message || "Payment rate deleted successfully.");

      // Optional: if you’re displaying a list, remove that item from the list UI
      $(`[data-id='${id}']`).remove();

    } else {
      alert(result.message || "Failed to delete payment rate.");
    }
  } catch (error) {
    console.error("Delete failed:", error);
    alert("An error occurred while deleting the payment rate.");
  }
}
