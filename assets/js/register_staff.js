document.addEventListener('DOMContentLoaded', function() {
  const form = document.getElementById('registerStaffForm');
  if (!form) return;

  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    const fd = new FormData(form);
    const body = {
      user_nickname: fd.get('nickname') || '',
      user_fullname: fd.get('fullname') || '',
      password: fd.get('password') || '',
      user_role: fd.get('role') || '',
      user_gender: fd.get('gender') || '',
      user_dob: fd.get('dob') ? new Date(fd.get('dob')).toISOString() : '',
      user_phone: fd.get('phone') || '',
      user_ic: fd.get('ic') || '',
      user_bank_name: fd.get('banktype') || '',
      user_bank_number: fd.get('bankaccount') || '',
      user_kwsp_number: fd.get('kwsp') || '',
      user_img: '', // You can add image upload logic here if needed
      staff_employment_start_date: fd.get('staff_employment_start_date') || ''
    };

    console.log('Register Staff Payload:', body); // Debugging line to show payload

    const url = new URL("https://mwms.megacess.com/api/v1/auth/register");
    const headers = {
      "Content-Type": "application/json",
      "Accept": "application/json",
    };

    try {
      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (response.ok) {
        alert('Staff registered successfully!');
        form.reset();
        // Optionally close modal
        const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('registerStaffModal'));
        modal.hide();
      } else {
        alert(result.message || 'Registration failed.');
      }
    } catch (err) {
      alert('Network error. Please try again.');
    }
  });
});
