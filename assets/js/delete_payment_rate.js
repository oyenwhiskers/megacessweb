const API_BASE_URL = "https://mwms.megacess.com/api/v1/payment-rates";

/**
 * Delete a payment rate by ID
 * @param {number|string} id - The payment rate ID to delete
 */
async function deletePaymentRate(id) {
  if (!id) {
    console.error("Invalid payment rate ID.");
    return;
  }

  const token = localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
  if (!token) {
    console.error("Token not found. Please ensure user is authenticated.");
    Swal.fire({
      icon: "error",
      title: "Authentication Required!",
      text: "Please login first before proceeding.",
      confirmButtonText: "Log in now."
    }).then((result) => {
      if (result.isConfirmed){
        window.location.href = "/megacessweb/assets/pages/log-in.html"
      }
    });
    return;
  }

   const result = await Swal.fire({
    title: "Delete payment rate?",
    text: "This action cannot be undone. Do you want to delete this payment rate?",
    icon: "warning",
    showCancelButton: true,
    reverseButtons: true,
    confirmButtonText: "Delete",
    cancelButtonText: "Cancel",
    focusCancel: true,
    showLoaderOnConfirm: true,
    preConfirm: () => {
      return fetch(`${API_BASE_URL}/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Accept": "application/json",
          "Content-Type": "application/json"
        }
      })
      .then(async (resp) => {
        const json = await resp.json().catch(() => ({}));
        if (!resp.ok) {
          const msg = json.message || `Request failed (${resp.status})`;
          throw new Error(msg);
        }
        return json;
      })
      .catch((err) => {
        Swal.showValidationMessage(err.message || "Delete request failed");
        throw err;
      });
    }
  });

  if (result.isConfirmed && result.value) {
    const json = result.value;
    if (json.success) {
      $(`#workSection [data-id='${id}']`).remove();
      $('#workSection .task-editor .card-body').empty();

      Swal.fire({
        icon: "success",
        title: "Deleted",
        text: json.message || "Payment rate deleted successfully.",
        timer: 1600,
        showConfirmButton: false
      });

      if (typeof getPaymentRates === 'function') {
        getPaymentRates();
      }
    } else {
      Swal.fire({
        icon: "error",
        title: "Failed to delete",
        text: json.message || "Unable to delete the payment rate."
      });
    }
  }
}

/**
 * Delete a payment rate category
 * @param {number|string} id - The parent payment rate ID
 * @param {number|string} categoryId - The category ID to delete
 */
async function deletePaymentRateCategory(id, categoryId) {
  if (!id || !categoryId) {
    console.error("Invalid payment rate ID or category ID.");
    return;
  }

  const token = localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
  if (!token) {
    console.error("Token not found. Please ensure user is authenticated.");
    Swal.fire({
      icon: "error",
      title: "Authentication Required!",
      text: "Please login first before proceeding.",
      confirmButtonText: "Log in now."
    }).then((result) => {
      if (result.isConfirmed) {
        window.location.href = "/megacessweb/assets/pages/log-in.html"
      }
    });
    return;
  }

  const result = await Swal.fire({
    title: "Delete category?",
    text: "This action cannot be undone. Do you want to delete this category?",
    icon: "warning",
    showCancelButton: true,
    reverseButtons: true,
    confirmButtonText: "Delete",
    cancelButtonText: "Cancel",
    focusCancel: true,
    showLoaderOnConfirm: true,
    preConfirm: () => {
      return fetch(`${API_BASE_URL}/${id}/categories/${categoryId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Accept": "application/json",
          "Content-Type": "application/json"
        }
      })
      .then(async (resp) => {
        const json = await resp.json().catch(() => ({}));
        if (!resp.ok) {
          const msg = json.message || `Request failed (${resp.status})`;
          throw new Error(msg);
        }
        return json;
      })
      .catch((err) => {
        Swal.showValidationMessage(err.message || "Delete request failed");
        throw err;
      });
    }
  });

  if (result.isConfirmed && result.value) {
    const json = result.value;
    if (json.success) {
      $(`#workSection .category-block[data-category*='"id":${categoryId}']`).remove();

      Swal.fire({
        icon: "success",
        title: "Deleted",
        text: json.message || "Category deleted successfully.",
        timer: 1600,
        showConfirmButton: false
      });

      if (typeof getPaymentRates === 'function') {
        getPaymentRates();
      }
    } else {
      Swal.fire({
        icon: "error",
        title: "Failed to delete",
        text: json.message || "Unable to delete the category."
      });
    }
  }
}