// Register Worker functionality
(function() {
    // Configuration
    const API_BASE_URL = 'https://mwms.megacess.com/api/v1';
    
    // Get the register worker form and modal
    const registerWorkerForm = document.getElementById('registerWorkerForm');
    const registerWorkerModal = document.getElementById('registerWorkerModal');
    let modalInstance = null;
    
    // Get auth token (same as worker_list.js)
    function getAuthToken() {
        const token = localStorage.getItem('auth_token') || 
                     sessionStorage.getItem('auth_token') || 
                     localStorage.getItem('authToken') ||
                     sessionStorage.getItem('authToken');
        
        if (!token) {
            console.warn('No authentication token found. Please ensure user is logged in.');
        }
        
        return token || 'YOUR_TOKEN';
    }
    
    // Show loading state on form
    function showFormLoading(show = true) {
        const submitBtn = registerWorkerForm.querySelector('button[type="submit"]');
        const formInputs = registerWorkerForm.querySelectorAll('input, select');
        
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
    
    // Show success message
    function showSuccess(message, workerData) {
        // Create success alert
        const alertHTML = `
            <div class="alert alert-success alert-dismissible fade show" role="alert">
                <i class="bi bi-check-circle me-2"></i>
                <strong>Success!</strong> ${message}
                ${workerData ? `<br><small class="text-muted">Worker ID: ${workerData.id}</small>` : ''}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
        
        // Insert at the top of modal body
        const modalBody = registerWorkerModal.querySelector('.modal-body');
        modalBody.insertAdjacentHTML('afterbegin', alertHTML);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            const alert = modalBody.querySelector('.alert-success');
            if (alert) {
                alert.remove();
            }
        }, 5000);
    }
    
    // Show error message
    function showError(message) {
        // Remove existing alerts
        const existingAlert = registerWorkerModal.querySelector('.alert');
        if (existingAlert) {
            existingAlert.remove();
        }
        
        // Create error alert
        const alertHTML = `
            <div class="alert alert-danger alert-dismissible fade show" role="alert">
                <i class="bi bi-exclamation-triangle me-2"></i>
                <strong>Error!</strong> ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
        
        // Insert at the top of modal body
        const modalBody = registerWorkerModal.querySelector('.modal-body');
        modalBody.insertAdjacentHTML('afterbegin', alertHTML);
        
        // Auto-remove after 8 seconds
        setTimeout(() => {
            const alert = modalBody.querySelector('.alert-danger');
            if (alert) {
                alert.remove();
            }
        }, 8000);
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
        
        if (!formData.dob) {
            errors.push('Date of Birth is required');
        }
        
        if (!formData.gender) {
            errors.push('Gender is required');
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
                errors.push('Worker must be at least 16 years old');
            } else if (age > 100) {
                errors.push('Please enter a valid Date of Birth');
            }
        }
        
        return errors;
    }
    
    // Format form data for API
    function formatFormDataForAPI(formData) {
        return {
            staff_fullname: formData.fullname.trim(),
            staff_phone: formData.phone.trim(),
            staff_dob: formData.dob,
            staff_gender: formData.gender,
            staff_doc: formData.ic.trim(), // Using IC as document ID
            staff_bank_name: formData.banktype?.trim() || null,
            staff_bank_number: formData.bankaccount?.trim() || null,
            staff_kwsp_number: formData.kwsp?.trim() || null,
            staff_img: null // Will be implemented later for file uploads
        };
    }
    
    // Reset form
    function resetForm() {
        registerWorkerForm.reset();
        
        // Remove any alerts
        const existingAlert = registerWorkerModal.querySelector('.alert');
        if (existingAlert) {
            existingAlert.remove();
        }
        
        // Remove validation classes
        const inputs = registerWorkerForm.querySelectorAll('.form-control, .form-select');
        inputs.forEach(input => {
            input.classList.remove('is-valid', 'is-invalid');
        });
        
        // Reset form state
        showFormLoading(false);
    }
    
    // Main function to register worker
    async function registerWorker(formData) {
        try {
            showFormLoading(true);
            
            // Validate form
            const errors = validateForm(formData);
            if (errors.length > 0) {
                throw new Error(errors.join(', '));
            }
            
            // Format data for API
            const apiData = formatFormDataForAPI(formData);
            
            // Make API request
            const response = await fetch(`${API_BASE_URL}/staff/register`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${getAuthToken()}`,
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
                    throw new Error('Access denied. You do not have permission to register workers.');
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
            
            // Success
            showSuccess(`Worker "${apiData.staff_fullname}" has been registered successfully!`, result.data);
            
            // Reset form after a short delay
            setTimeout(() => {
                resetForm();
                
                // Close modal after successful registration
                if (modalInstance) {
                    modalInstance.hide();
                }
                
                // Refresh the workers list if it's visible and the function exists
                if (window.fetchWorkersList && 
                    document.getElementById('workersView') && 
                    !document.getElementById('workersView').classList.contains('d-none')) {
                    
                    const searchInput = document.getElementById('accountSearch');
                    const currentGender = document.querySelector('#genderFilterGroup .btn.active')?.getAttribute('data-gender') || 'all';
                    window.fetchWorkersList(searchInput ? searchInput.value : '', 1, currentGender);
                }
            }, 2000);
            
        } catch (error) {
            console.error('Error registering worker:', error);
            showError(error.message || 'Failed to register worker. Please try again.');
        } finally {
            showFormLoading(false);
        }
    }
    
    // Initialize the form handler
    function initializeRegisterWorker() {
        if (!registerWorkerForm) {
            console.warn('Register worker form not found');
            return;
        }
        
        // Initialize Bootstrap modal
        if (registerWorkerModal) {
            modalInstance = new bootstrap.Modal(registerWorkerModal);
            
            // Reset form when modal is opened
            registerWorkerModal.addEventListener('show.bs.modal', function() {
                resetForm();
                
                // Set max date for date of birth (today's date)
                const dobInput = registerWorkerForm.querySelector('input[name="dob"]');
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
        registerWorkerForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Get form data
            const formData = new FormData(registerWorkerForm);
            const data = Object.fromEntries(formData.entries());
            
            // Register worker
            registerWorker(data);
        });
        
        // Add real-time validation
        const inputs = registerWorkerForm.querySelectorAll('input[required], select[required]');
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
        const phoneInput = registerWorkerForm.querySelector('input[name="phone"]');
        if (phoneInput) {
            phoneInput.addEventListener('input', function() {
                // Remove non-numeric characters except +, -, (, ), and spaces
                this.value = this.value.replace(/[^\d\+\-\(\)\s]/g, '');
                validateField(this);
            });
        }
        
        // Bank account and KWSP number validation
        const bankAccountInput = registerWorkerForm.querySelector('input[name="bankaccount"]');
        const kwspInput = registerWorkerForm.querySelector('input[name="kwsp"]');
        
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
        document.addEventListener('DOMContentLoaded', initializeRegisterWorker);
    } else {
        initializeRegisterWorker();
    }
    
    // Expose function globally for external access
    window.registerWorker = registerWorker;
    
})();
