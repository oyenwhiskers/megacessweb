// Register Staff functionality
(function() {
    // Configuration
    const API_BASE_URL = 'https://mwms.megacess.com/api/v1';
    
    // Get the register staff form and modal
    const registerStaffForm = document.getElementById('registerStaffForm');
    const registerStaffModal = document.getElementById('registerStaffModal');
    let modalInstance = null;
    
    // Get auth token
    function getAuthToken() {
        const token = localStorage.getItem('auth_token') || 
                     sessionStorage.getItem('auth_token') || 
                     localStorage.getItem('authToken') ||
                     sessionStorage.getItem('authToken');
        
        if (!token) {
            window.location.href = '/pages/log-in.html';
            return null;
        }
        
        return token;
    }
    
    // Show loading state on form
    function showFormLoading(show = true) {
        const submitBtn = registerStaffForm.querySelector('button[type="submit"]');
        const formInputs = registerStaffForm.querySelectorAll('input, select');
        
        if (show) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Creating...';
            formInputs.forEach(input => input.disabled = true);
        } else {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Create';
            formInputs.forEach(input => input.disabled = false);
        }
    }
    
    // Show success message using SweetAlert2
    function showSuccess(message, staffData) {
        Swal.fire({
            icon: 'success',
            title: 'Success!',
            html: message + (staffData ? `<br><small class="text-muted">Staff ID: ${staffData.id}</small>` : ''),
            showConfirmButton: true,
            confirmButtonText: 'OK',
            confirmButtonColor: '#0d6832',
            timer: 3000,
            timerProgressBar: true
        });
    }
    
    // Show error message using SweetAlert2
    function showError(message) {
        Swal.fire({
            icon: 'error',
            title: 'Error!',
            text: message,
            confirmButtonText: 'OK',
            confirmButtonColor: '#dc3545',
            timer: 5000,
            timerProgressBar: true
        });
    }
    
    // Validate form data
    function validateForm(formData) {
        const errors = [];
        
        // Required fields
        if (!formData.ic?.trim()) {
            errors.push('IC / Document ID is required');
        }
        
        if (!formData.fullname?.trim()) {
            errors.push('Full Name is required');
        }
        
        if (!formData.phone?.trim()) {
            errors.push('Phone Number is required');
        }
        
        if (!formData.dob || formData.dob.trim() === '') {
            errors.push('Date of Birth is required');
        }
        
        if (!formData.gender || formData.gender.trim() === '') {
            errors.push('Gender is required');
        }
        
        if (!formData.role || formData.role.trim() === '') {
            errors.push('Role is required');
        }
        
        if (!formData.password?.trim()) {
            errors.push('Password is required');
        }
        
        if (!formData.user_employment_start_date || formData.user_employment_start_date.trim() === '') {
            errors.push('Employment Start Date is required');
        }
        
        // Validate start date (must be valid if present)
        if (formData.user_employment_start_date) {
            const startDate = new Date(formData.user_employment_start_date);
            const today = new Date();
            if (isNaN(startDate.getTime())) {
                errors.push('Start Date is invalid');
            } else if (startDate > today) {
                errors.push('Start Date cannot be in the future');
            }
        }
        
        // Validate password strength
        if (formData.password && formData.password.trim().length < 6) {
            errors.push('Password must be at least 6 characters');
        }
        
        // Validate phone number format (basic validation)
        if (formData.phone && !/^[\+]?[0-9\-\s\(\)]+$/.test(formData.phone.trim())) {
            errors.push('Please enter a valid phone number');
        }
        
        // Validate date of birth (must be in the past and not too old)
        if (formData.dob) {
            const dob = new Date(formData.dob);
            const today = new Date();
            const age = today.getFullYear() - dob.getFullYear();
            
            if (dob > today) {
                errors.push('Date of Birth cannot be in the future');
            } else if (age < 16) {
                errors.push('Staff must be at least 16 years old');
            } else if (age > 100) {
                errors.push('Please enter a valid Date of Birth');
            }
        }
        
        return errors;
    }
    
    // Format form data for API
    function formatFormDataForAPI(formData, imageFile = null) {
        // Create JSON object for staff registration
        const apiData = {
            user_nickname: formData.nickname?.trim() || '',
            user_fullname: formData.fullname?.trim() || '',
            password: formData.password?.trim() || '',
            user_role: formData.role || '',
            user_gender: formData.gender || '',
            user_dob: formData.dob || '',
            user_phone: formData.phone?.trim() || '',
            user_ic: formData.ic?.trim() || '',
            user_bank_name: formData.banktype?.trim() || '',
            user_bank_number: formData.bankaccount?.trim() || '',
            user_kwsp_number: formData.kwsp?.trim() || '',
            user_img: '', // Image upload handled separately if needed
            user_employment_start_date: formData.user_employment_start_date || ''
        };
        
        return apiData;
    }
    
    // Reset form
    function resetForm() {
        registerStaffForm.reset();
        
        // Reset image preview to placeholder generated from default name
        const imagePreview = document.getElementById('staffProfilePreview');
        if (imagePreview) {
            const placeholderImage = `https://ui-avatars.com/api/?name=${encodeURIComponent('Staff')}&background=0d6efd&color=fff&size=128&bold=true&rounded=true`;
            imagePreview.src = placeholderImage;
        }
        
        // Remove any alerts
        const existingAlert = registerStaffModal.querySelector('.alert');
        if (existingAlert) {
            existingAlert.remove();
        }
        
        // Remove validation classes
        const inputs = registerStaffForm.querySelectorAll('.form-control, .form-select');
        inputs.forEach(input => {
            input.classList.remove('is-valid', 'is-invalid');
        });
        
        // Reset form state
        showFormLoading(false);
    }
    
    // Main function to register staff
    async function registerStaff(formData) {
        try {
            showFormLoading(true);

            // Validate form
            const errors = validateForm(formData);
            if (errors.length > 0) {
                throw new Error(errors.join(', '));
            }

            // Get image file if uploaded
            const imageInput = document.getElementById('staffProfileImageInput');
            const imageFile = imageInput && imageInput.files.length > 0 ? imageInput.files[0] : null;

            // Format data for API
            const apiData = formatFormDataForAPI(formData, imageFile);
            
            // Make API request
            const response = await fetch(`${API_BASE_URL}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(apiData)
            });
            
            const result = await response.json();
            
            if (!response.ok) {
                // Handle different error types
                if (response.status === 401) {
                    throw new Error('Authentication failed. Please log in again.');
                } else if (response.status === 403) {
                    throw new Error('Access denied. You do not have permission to register staff.');
                } else if (response.status === 422) {
                    // Validation errors from server
                    const errorMessages = [];
                    if (result.errors) {
                        Object.keys(result.errors).forEach(field => {
                            if (Array.isArray(result.errors[field])) {
                                errorMessages.push(...result.errors[field]);
                            }
                        });
                    }
                    throw new Error(errorMessages.length > 0 ? errorMessages.join(', ') : result.message || 'Validation failed');
                } else if (response.status === 429) {
                    throw new Error('Too many requests. Please wait a moment and try again.');
                } else {
                    throw new Error(result.message || `HTTP ${response.status}: ${response.statusText}`);
                }
            }
            
            // Success - show SweetAlert2
            Swal.fire({
                icon: 'success',
                title: 'Staff Registered!',
                html: `Staff "<strong>${formData.fullname}</strong>" has been registered successfully!` + 
                      (result.data?.id ? `<br><small class="text-muted">Staff ID: ${result.data.id}</small>` : ''),
                showConfirmButton: true,
                confirmButtonText: 'OK',
                confirmButtonColor: '#0d6832',
                timer: 3000,
                timerProgressBar: true
            }).then(() => {
                resetForm();
                
                // Close modal after successful registration
                if (modalInstance) {
                    modalInstance.hide();
                }
                
                // Refresh the staff list if it's visible and the function exists
                if (window.fetchStaffList && 
                    document.getElementById('staffView') && 
                    !document.getElementById('staffView').classList.contains('d-none')) {
                    
                    const searchInput = document.getElementById('accountSearch');
                    const currentRole = document.querySelector('#roleFilterContainer .btn.btn-success')?.getAttribute('data-role') || 'all';
                    window.fetchStaffList(searchInput ? searchInput.value : '', currentRole);
                }
            });
            
        } catch (error) {
            showError(error.message || 'Failed to register staff. Please try again.');
        } finally {
            showFormLoading(false);
        }
    }
    
    // Initialize the form handler
    function initializeRegisterStaff() {
        if (!registerStaffForm) {
            return;
        }
        
        // Initialize Bootstrap modal
        if (registerStaffModal) {
            modalInstance = new bootstrap.Modal(registerStaffModal);
            
            // Reset form when modal is opened
            registerStaffModal.addEventListener('show.bs.modal', function() {
                resetForm();
                
                // Set max date for date of birth (today's date)
                const dobInput = registerStaffForm.querySelector('input[name="dob"]');
                if (dobInput) {
                    const today = new Date();
                    const maxDate = today.toISOString().split('T')[0];
                    dobInput.setAttribute('max', maxDate);
                    
                    // Set a reasonable min date (100 years ago)
                    const minDate = new Date();
                    minDate.setFullYear(today.getFullYear() - 100);
                    dobInput.setAttribute('min', minDate.toISOString().split('T')[0]);
                }
            });
        }
        
        // Handle form submission
        registerStaffForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Get form data
            const formData = new FormData(registerStaffForm);
            const data = Object.fromEntries(formData.entries());
            
            // Register staff
            registerStaff(data);
        });
        
        // Add real-time validation
        const inputs = registerStaffForm.querySelectorAll('input[required], select[required]');
        inputs.forEach(input => {
            input.addEventListener('blur', function() {
                validateField(this);
            });
            
            input.addEventListener('input', function() {
                if (this.classList.contains('is-invalid')) {
                    validateField(this);
                }
            });
        });
        
        // Phone number formatting
        const phoneInput = registerStaffForm.querySelector('input[name="phone"]');
        if (phoneInput) {
            phoneInput.addEventListener('input', function() {
                // Remove non-numeric characters except +, -, (, ), and spaces
                this.value = this.value.replace(/[^\d\+\-\(\)\s]/g, '');
                validateField(this);
            });
        }
        
        // Bank account and KWSP number validation
        const bankAccountInput = registerStaffForm.querySelector('input[name="bankaccount"]');
        const kwspInput = registerStaffForm.querySelector('input[name="kwsp"]');
        
        [bankAccountInput, kwspInput].forEach(input => {
            if (input) {
                input.addEventListener('input', function() {
                    // Allow only numbers and hyphens
                    this.value = this.value.replace(/[^0-9\-]/g, '');
                });
            }
        });
    }
    
    // Validate individual field
    function validateField(field) {
        let isValid = true;
        
        if (field.hasAttribute('required') && !field.value.trim()) {
            isValid = false;
        } else if (field.name === 'fullname' && field.value.trim().length < 2) {
            isValid = false;
        } else if (field.name === 'password' && field.value.trim().length < 6) {
            isValid = false;
        } else if (field.name === 'phone' && field.value.trim() && !/^[\+]?[0-9\-\s\(\)]+$/.test(field.value.trim())) {
            isValid = false;
        } else if (field.name === 'dob' && field.value) {
            const dob = new Date(field.value);
            const today = new Date();
            const age = today.getFullYear() - dob.getFullYear();
            
            if (dob > today || age < 16 || age > 100) {
                isValid = false;
            }
        }
        
        if (isValid) {
            field.classList.remove('is-invalid');
            field.classList.add('is-valid');
        } else {
            field.classList.remove('is-valid');
            field.classList.add('is-invalid');
        }
        
        return isValid;
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeRegisterStaff);
    } else {
        initializeRegisterStaff();
    }
    
})();

