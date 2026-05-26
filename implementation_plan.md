# Megacess Work Monitoring System Adjustments and Fixes (21/5/2026)

This plan outlines the changes required to satisfy the three new system requirements:
1. Allow payroll overrides for Lateness and Early Out deductions.
2. Adjust worker designation displays dynamically (Harvester, Operator, Maintenance) on payslips instead of hardcoding "Worker".
3. Add fields for "No IC" and "Role" under Worker registration, view details, and edit modals.

---

## Proposed Changes

### Database Migration

#### [NEW] [2026_05_22_090000_add_ic_and_designation_to_staff_table.php](file:///c:/laragon/www/megacessBackend/database/migrations/2026_05_22_090000_add_ic_and_designation_to_staff_table.php)
- Create a migration to add `staff_ic` (nullable string) and `designation` (nullable string) to the `staff` table.
- designation field supports values: `harvester`, `operator`, `maintenance`.

---

### Backend API & Models

#### [MODIFY] [Staff.php](file:///c:/laragon/www/megacessBackend/app/Models/Staff.php)
- Add `'staff_ic'` and `'designation'` to the `$fillable` array.

#### [MODIFY] [StaffController.php](file:///c:/laragon/www/megacessBackend/app/Http/Controllers/Api/V1/StaffController.php)
- Update `register` validation rules to validate:
  - `'staff_ic' => ['nullable', 'string', 'max:50']`
  - `'designation' => ['nullable', 'string', 'in:harvester,operator,maintenance']`
- Update `update` validation rules to validate:
  - `'staff_ic' => ['sometimes', 'nullable', 'string', 'max:50']`
  - `'designation' => ['sometimes', 'nullable', 'string', 'in:harvester,operator,maintenance']`

#### [MODIFY] [StaffPayrollController.php](file:///c:/laragon/www/megacessBackend/app/Http/Controllers/Api/V1/StaffPayrollController.php)
- Update `index`, `overview`, `generate`, and `show` response payloads to include `designation` and `staff_ic` in the mapped `staff` payload.

#### [MODIFY] [staff.blade.php](file:///c:/laragon/www/megacessBackend/resources/views/payslips/staff.blade.php)
- Replace NRIC / No Passport value with `{{ $payslipData['staff']['staff_ic'] ?? ($payslipData['staff']['staff_doc'] ?? 'N/A') }}`.
- Replace hardcoded `Worker` designation with dynamic designation display:
  `{{ isset($payslipData['staff']['designation']) ? ucfirst($payslipData['staff']['designation']) : 'Worker' }}`.

---

### Frontend HTML & JS Pages

#### [MODIFY] [manage-account.html](file:///c:/laragon/www/megacessWeb/pages/manage-account.html)
- Add "No IC" input field (optional) to the Register Worker modal under `registerWorkerForm`.
- Add "Role" select dropdown field (required, options: Harvester, Operator, Maintenance) to the Register Worker modal.

#### [MODIFY] [register_worker.js](file:///c:/laragon/www/megacessWeb/assets/js/register_worker.js)
- Read and append `staff_ic` and `designation` values to the `FormData` payload submitted to `/api/v1/staff/register`.

#### [MODIFY] [worker_list.js](file:///c:/laragon/www/megacessWeb/assets/js/worker_list.js)
- Display the dynamic role (`designation`) instead of the hardcoded fallback "Worker" in the worker list row and details modal.
- Add "No IC" text field to the worker details modal.
- In edit mode, convert the "No IC" field to an editable text input and convert the "Role" field to a selection dropdown.
- Collect and append `staff_ic` and `designation` to the edit request body.

#### [MODIFY] [manage-payroll.html](file:///c:/laragon/www/megacessWeb/pages/manage-payroll.html)
- Add two input fields in the Payslip Generation modal:
  - **Lateness Override (RM)**
  - **Early Out Override (RM)**
  These fields will have placeholders explaining that they can be left empty for automated attendance calculation.

#### [MODIFY] [manage_payroll.js](file:///c:/laragon/www/megacessWeb/assets/js/manage_payroll.js)
- Reset the lateness and early out override fields to empty when the modal opens.
- Read values from lateness and early out override fields when generating the payslip. If filled, append them as manual deductions to the `deductions` array (e.g. `{ deduction_type: 'Lateness', deduction_amount: ... }` / `{ deduction_type: 'Early Out', deduction_amount: ... }`) before generating the request payload.
- Update the details modal to show `staff_ic` (No IC) and dynamic designation for worker records.

---

## Verification Plan

### Automated & Manual Verification
1. Run database migration `php artisan migrate`.
2. Register a new worker, specifying "No IC" and selecting a specific role (e.g., Harvester).
3. Verify that the new worker record is saved in the database with the designated role and IC number.
4. Edit the worker details, changing the role to "Operator" or "Maintenance" and updating the IC, and verify the changes are correctly saved.
5. In the Payroll module, click on "Generate Payslip" for the worker:
   - Generate without overrides, and verify that automated lateness/early out calculations are applied based on attendance records.
   - Generate with explicit overrides (e.g., 0.00 or a specific amount like 15.00), and verify the generated payslip overrides the calculations with the input value.
6. Open the generated payslip HTML/PDF view and verify the designation shows the sub-role (e.g., Operator) and the NRIC field displays the correct IC number.
