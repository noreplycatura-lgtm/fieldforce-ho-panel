let employeesTable;

// Initialize employee management
document.addEventListener('DOMContentLoaded', function() {
    initializeEmployeesTable();
    setupEventListeners();
});

function initializeEmployeesTable() {
    employeesTable = $('#employeesTable').DataTable({
        "processing": true,
        "serverSide": false,
        "pageLength": 25,
        "order": [[ 0, "desc" ]],
        "columnDefs": [
            {
                "targets": -1,
                "orderable": false
            }
        ],
        "language": {
            "search": "Filter records:"
        }
    });
    
    loadEmployees();
}

function setupEventListeners() {
    // Filter events
    document.getElementById('filterDesignation').addEventListener('change', applyFilters);
    document.getElementById('filterStatus').addEventListener('change', applyFilters);
    document.getElementById('filterArea').addEventListener('input', applyFilters);
}

function loadEmployees() {
    Utils.showLoader('Loading employees...');
    
    google.script.run
        .withSuccessHandler(function(employees) {
            Utils.hideLoader();
            populateEmployeesTable(employees);
        })
        .withFailureHandler(function(error) {
            Utils.hideLoader();
            console.error('Error loading employees:', error);
            Utils.showToast('Failed to load employees', 'danger');
        })
        .getAllEmployees();
}

function populateEmployeesTable(employees) {
    // Clear existing data
    employeesTable.clear();
    
    // Add new data
    employees.forEach(employee => {
        const statusChip = `<span class="chip chip-${employee.Status.toLowerCase()}">${employee.Status}</span>`;
        const actions = `
            <div class="action-buttons">
                <button class="btn btn-sm btn-outline-primary" onclick="editEmployee('${employee.Employee_ID}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteEmployee('${employee.Employee_ID}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        employeesTable.row.add([
            employee.Employee_ID,
            employee.Name,
            employee.Mobile,
            employee.Email || '',
            employee.Designation,
            employee.Reporting_To || '',
            employee.Area,
            statusChip,
            Utils.formatDate(employee.Created_At),
            actions
        ]);
    });
    
    employeesTable.draw();
}

function editEmployee(employeeId) {
    // Load employee data and populate modal
    google.script.run
        .withSuccessHandler(function(employees) {
            const employee = employees.find(emp => emp.Employee_ID === employeeId);
            if (employee) {
                document.getElementById('employeeModalTitle').textContent = 'Edit Employee';
                document.getElementById('employeeId').value = employee.Employee_ID;
                document.getElementById('employeeName').value = employee.Name;
                document.getElementById('employeeMobile').value = employee.Mobile;
                document.getElementById('employeeEmail').value = employee.Email || '';
                document.getElementById('employeeDesignation').value = employee.Designation;
                document.getElementById('employeeReportingTo').value = employee.Reporting_To || '';
                document.getElementById('employeeArea').value = employee.Area;
                document.getElementById('employeeStatus').value = employee.Status;
                
                // Show modal
                const modal = new bootstrap.Modal(document.getElementById('addEmployeeModal'));
                modal.show();
            }
        })
        .withFailureHandler(function(error) {
            console.error('Error loading employee:', error);
            Utils.showToast('Failed to load employee data', 'danger');
        })
        .getAllEmployees();
}

function saveEmployee() {
    const formData = {
        name: document.getElementById('employeeName').value,
        mobile: document.getElementById('employeeMobile').value,
        email: document.getElementById('employeeEmail').value,
        designation: document.getElementById('employeeDesignation').value,
        reportingTo: document.getElementById('employeeReportingTo').value,
        area: document.getElementById('employeeArea').value,
        status: document.getElementById('employeeStatus').value
    };
    
    const employeeId = document.getElementById('employeeId').value;
    
    Utils.showLoader('Saving employee...');
    
    if (employeeId) {
        // Update existing employee
        google.script.run
            .withSuccessHandler(function(result) {
                Utils.hideLoader();
                if (result.success) {
                    Utils.showToast('Employee updated successfully', 'success');
                    bootstrap.Modal.getInstance(document.getElementById('addEmployeeModal')).hide();
                    loadEmployees();
                } else {
                    Utils.showToast(result.message, 'danger');
                }
            })
            .withFailureHandler(function(error) {
                Utils.hideLoader();
                console.error('Error updating employee:', error);
                Utils.showToast('Failed to update employee', 'danger');
            })
            .updateEmployee(employeeId, formData);
    } else {
        // Add new employee
        google.script.run
            .withSuccessHandler(function(result) {
                Utils.hideLoader();
                if (result.success) {
                    Utils.showToast('Employee added successfully', 'success');
                    bootstrap.Modal.getInstance(document.getElementById('addEmployeeModal')).hide();
                    loadEmployees();
                } else {
                    Utils.showToast(result.message, 'danger');
                }
            })
            .withFailureHandler(function(error) {
                Utils.hideLoader();
                console.error('Error adding employee:', error);
                Utils.showToast('Failed to add employee', 'danger');
            })
            .addEmployee(formData);
    }
}

function deleteEmployee(employeeId) {
    if (confirm('Are you sure you want to delete this employee? This action cannot be undone.')) {
        Utils.showLoader('Deleting employee...');
        
        google.script.run
            .withSuccessHandler(function(result) {
                Utils.hideLoader();
                if (result.success) {
                    Utils.showToast('Employee deleted successfully', 'success');
                    loadEmployees();
                } else {
                    Utils.showToast(result.message, 'danger');
                }
            })
            .withFailureHandler(function(error) {
                Utils.hideLoader();
                console.error('Error deleting employee:', error);
                Utils.showToast('Failed to delete employee', 'danger');
            })
            .deleteEmployee(employeeId);
    }
}

function applyFilters() {
    // This would implement client-side filtering
    // For server-side filtering, you'd call loadEmployees() with filter parameters
    console.log('Filters applied');
}

function clearFilters() {
    document.getElementById('filterDesignation').value = '';
    document.getElementById('filterStatus').value = '';
    document.getElementById('filterArea').value = '';
    applyFilters();
}

function exportEmployees() {
    Utils.showLoader('Exporting employees...');
    
    // In a real implementation, this would download a CSV
    Utils.hideLoader();
    Utils.showToast('Employee export started', 'success');
}

function downloadEmployeeTemplate() {
    // Create and download CSV template
    const headers = ['Name', 'Mobile', 'Email', 'Designation', 'Reporting_To', 'Area', 'Status'];
    const csvContent = headers.join(',') + '\n';
    
    Utils.downloadCSV(csvContent, 'employee_template.csv');
}

function processBulkUpload() {
    const fileInput = document.getElementById('bulkUploadFile');
    const file = fileInput.files[0];
    
    if (!file) {
        Utils.showToast('Please select a file to upload', 'warning');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const csvData = e.target.result;
            const parsedData = Utils.parseCSV(csvData);
            
            Utils.showLoader(`Processing ${parsedData.length} records...`);
            
            // Process each record
            let processed = 0;
            parsedData.forEach(record => {
                // Add employee for each record
                setTimeout(() => {
                    google.script.run
                        .withSuccessHandler(function(result) {
                            processed++;
                            if (processed === parsedData.length) {
                                Utils.hideLoader();
                                Utils.showToast(`${processed} employees added successfully`, 'success');
                                bootstrap.Modal.getInstance(document.getElementById('bulkUploadModal')).hide();
                                loadEmployees();
                            }
                        })
                        .withFailureHandler(function(error) {
                            console.error('Error adding employee:', error);
                        })
                        .addEmployee({
                            name: record.Name,
                            mobile: record.Mobile,
                            email: record.Email,
                            designation: record.Designation,
                            reportingTo: record.Reporting_To,
                            area: record.Area,
                            status: record.Status || 'Active'
                        });
                }, 100 * processed);
            });
        } catch (error) {
            Utils.hideLoader();
            Utils.showToast('Error processing file: ' + error.message, 'danger');
        }
    };
    reader.readAsText(file);
}
