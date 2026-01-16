let customersTable;
let selectedCustomers = [];

// Initialize customer management
document.addEventListener('DOMContentLoaded', function() {
    initializeCustomersTable();
    loadApprovalQueue();
    setupEventListeners();
});

function initializeCustomersTable() {
    customersTable = $('#customersTable').DataTable({
        "processing": true,
        "serverSide": false,
        "pageLength": 25,
        "order": [[ 1, "desc" ]],
        "columnDefs": [
            {
                "targets": [0, -1],
                "orderable": false
            }
        ]
    });
    
    loadCustomers();
    
    // Select all checkbox
    document.getElementById('selectAllCustomers').addEventListener('change', function() {
        const checkboxes = document.querySelectorAll('input[name="customerCheckbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.checked = this.checked;
        });
        updateSelectedCustomers();
    });
}

function setupEventListeners() {
    document.getElementById('filterEmployee').addEventListener('change', applyCustomerFilters);
    document.getElementById('filterCustomerStatus').addEventListener('change', applyCustomerFilters);
    document.getElementById('filterCity').addEventListener('input', applyCustomerFilters);
}

function loadCustomers() {
    Utils.showLoader('Loading customers...');
    
    // In a real implementation, this would fetch from Google Sheets
    setTimeout(() => {
        Utils.hideLoader();
        // Mock data for demonstration
        const mockCustomers = [
            {
                Customer_ID: 'CUST001',
                Name: 'ABC Corporation',
                Mobile: '9876543210',
                City: 'Mumbai',
                Address: '123 Business Park',
                Assigned_To: 'EMP001',
                Status: 'Approved',
                Created: '2023-06-15'
            },
            {
                Customer_ID: 'CUST002',
                Name: 'XYZ Industries',
                Mobile: '9876543211',
                City: 'Delhi',
                Address: '456 Industrial Area',
                Assigned_To: 'EMP002',
                Status: 'Pending',
                Created: '2023-06-16'
            }
        ];
        populateCustomersTable(mockCustomers);
    }, 1000);
}

function populateCustomersTable(customers) {
    customersTable.clear();
    
    customers.forEach(customer => {
        const statusChip = `<span class="chip chip-${customer.Status.toLowerCase()}">${customer.Status}</span>`;
        const checkbox = `<input type="checkbox" name="customerCheckbox" value="${customer.Customer_ID}">`;
        const actions = `
            <div class="action-buttons">
                <button class="btn btn-sm btn-outline-primary" onclick="viewCustomer('${customer.Customer_ID}')">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn-sm btn-outline-warning" onclick="editCustomer('${customer.Customer_ID}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteCustomer('${customer.Customer_ID}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        customersTable.row.add([
            checkbox,
            customer.Customer_ID,
            customer.Name,
            customer.Mobile,
            customer.City,
            customer.Address,
            customer.Assigned_To,
            statusChip,
            Utils.formatDate(customer.Created),
            actions
        ]);
    });
    
    customersTable.draw();
    
    // Add event listeners to checkboxes
    document.querySelectorAll('input[name="customerCheckbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', updateSelectedCustomers);
    });
}

function updateSelectedCustomers() {
    selectedCustomers = Array.from(document.querySelectorAll('input[name="customerCheckbox"]:checked'))
                             .map(cb => cb.value);
    console.log('Selected customers:', selectedCustomers);
}

function loadApprovalQueue() {
    // Load pending customer approvals
    console.log('Loading approval queue...');
    // Implementation would fetch pending approvals from Google Sheets
}

function showBulkOperations() {
    const modal = new bootstrap.Modal(document.getElementById('bulkOperationsModal'));
    modal.show();
}

function showTransferBulk() {
    if (selectedCustomers.length === 0) {
        Utils.showToast('Please select at least one customer to transfer', 'warning');
        return;
    }
    
    // Populate selected customers list
    const selectedList = document.getElementById('selectedCustomersList');
    selectedList.innerHTML = '';
    selectedCustomers.forEach(id => {
        const item = document.createElement('div');
        item.className = 'mb-1';
        item.innerHTML = `<i class="fas fa-user me-2"></i>${id}`;
        selectedList.appendChild(item);
    });
    
    document.getElementById('selectedCount').textContent = selectedCustomers.length;
    
    // Hide bulk operations modal and show transfer modal
    bootstrap.Modal.getInstance(document.getElementById('bulkOperationsModal')).hide();
    const transferModal = new bootstrap.Modal(document.getElementById('transferModal'));
    transferModal.show();
}

function executeTransfer() {
    const targetEmployee = document.getElementById('targetEmployee').value;
    
    if (!targetEmployee) {
        Utils.showToast('Please select a target employee', 'warning');
        return;
    }
    
    if (selectedCustomers.length === 0) {
        Utils.showToast('No customers selected for transfer', 'warning');
        return;
    }
    
    Utils.showLoader(`Transferring ${selectedCustomers.length} customers...`);
    
    // In a real implementation, this would call Google Apps Script
    setTimeout(() => {
        Utils.hideLoader();
        Utils.showToast(`${selectedCustomers.length} customers transferred successfully`, 'success');
        bootstrap.Modal.getInstance(document.getElementById('transferModal')).hide();
        loadCustomers(); // Refresh the table
    }, 2000);
}

function deleteCustomer(customerId) {
    if (confirm('Are you sure you want to delete this customer? This action cannot be undone.')) {
        Utils.showLoader('Deleting customer...');
        
        // In a real implementation, this would call Google Apps Script
        setTimeout(() => {
            Utils.hideLoader();
            Utils.showToast('Customer deleted successfully', 'success');
            loadCustomers(); // Refresh the table
        }, 1000);
    }
}

function exportCustomers() {
    Utils.showLoader('Exporting customers...');
    
    // In a real implementation, this would download a CSV
    setTimeout(() => {
        Utils.hideLoader();
        Utils.showToast('Customer export started', 'success');
    }, 1000);
}

function downloadCustomerTemplate() {
    // Create and download CSV template
    const headers = ['Customer_Name', 'Mobile', 'Email', 'City', 'Address', 'Pin_Code', 'GST_Number', 'Status'];
    const csvContent = headers.join(',') + '\n';
    
    Utils.downloadCSV(csvContent, 'customer_template.csv');
    bootstrap.Modal.getInstance(document.getElementById('bulkOperationsModal')).hide();
}

function applyCustomerFilters() {
    // This would implement client-side filtering
    console.log('Customer filters applied');
}

function clearCustomerFilters() {
    document.getElementById('filterEmployee').value = '';
    document.getElementById('filterCustomerStatus').value = '';
    document.getElementById('filterCity').value = '';
    applyCustomerFilters();
}

function viewCustomer(customerId) {
    Utils.showToast(`Viewing customer ${customerId}`, 'info');
    // Implementation would show customer details
}

function editCustomer(customerId) {
    Utils.showToast(`Editing customer ${customerId}`, 'info');
    // Implementation would open edit modal
}
