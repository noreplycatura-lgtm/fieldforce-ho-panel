// ============================================
// MAIN APPLICATION
// ============================================

// Global Variables
let currentUser = null;
let employees = [];
let customers = [];
let stockists = [];
let products = [];
let areas = [];

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    initApp();
});

function initApp() {
    // Check if logged in
    const savedUser = localStorage.getItem('hoUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        showMainApp();
        loadDashboard();
    }
    
    // Event Listeners
    setupEventListeners();
    
    // Set current date
    document.getElementById('currentDate').textContent = formatDate(new Date());
    
    // Set current month in expense filter
    const now = new Date();
    document.getElementById('expenseMonthFilter').value = now.getMonth() + 1;
    document.getElementById('expenseYearFilter').value = now.getFullYear();
    
    // Set default date range for reports
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    document.getElementById('reportStartDate').value = formatDateISO(thirtyDaysAgo);
    document.getElementById('reportEndDate').value = formatDateISO(now);
}

function setupEventListeners() {
    // Login Form
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    
    // Sidebar Toggle
    document.getElementById('sidebarToggle').addEventListener('click', toggleSidebar);
    
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const page = this.dataset.page;
            showPage(page);
        });
    });
    
    // Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const tab = this.dataset.tab;
            switchTab(tab, this);
        });
    });
    
    // Select All Customers
    document.getElementById('selectAllCustomers').addEventListener('change', function() {
        document.querySelectorAll('.customer-checkbox').forEach(cb => {
            cb.checked = this.checked;
        });
    });
    
    // Search Filters
    document.getElementById('employeeSearch').addEventListener('input', filterEmployees);
    document.getElementById('employeeStatusFilter').addEventListener('change', filterEmployees);
    document.getElementById('customerSearch').addEventListener('input', filterCustomers);
    document.getElementById('customerStatusFilter').addEventListener('change', filterCustomers);
    document.getElementById('customerAreaFilter').addEventListener('change', filterCustomers);
    document.getElementById('stockistSearch').addEventListener('input', filterStockists);
    document.getElementById('productSearch').addEventListener('input', filterProducts);
    document.getElementById('areaSearch').addEventListener('input', filterAreas);
    
    // Settings Form
    document.getElementById('settingsForm').addEventListener('submit', handleSaveSettings);
}

// ============================================
// AUTHENTICATION
// ============================================

async function handleLogin(e) {
    e.preventDefault();
    
    const userCode = document.getElementById('loginUserCode').value;
    const password = document.getElementById('loginPassword').value;
    
    showLoading();
    
    const result = await API.hoLogin(userCode, password);
    
    hideLoading();
    
    if (result.success) {
        currentUser = result.user;
        localStorage.setItem('hoUser', JSON.stringify(currentUser));
        showMainApp();
        loadDashboard();
        showToast('Login successful!', 'success');
    } else {
        document.getElementById('loginError').textContent = result.error || 'Invalid credentials';
        document.getElementById('loginError').classList.remove('hidden');
    }
}

function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        currentUser = null;
        localStorage.removeItem('hoUser');
        document.getElementById('loginScreen').classList.remove('hidden');
        document.getElementById('mainApp').classList.add('hidden');
        document.getElementById('loginForm').reset();
        document.getElementById('loginError').classList.add('hidden');
    }
}

function showMainApp() {
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('mainApp').classList.remove('hidden');
    document.getElementById('userName').textContent = currentUser.Name || 'Admin';
}

// ============================================
// NAVIGATION
// ============================================

function showPage(pageName) {
    // Update nav
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.page === pageName) {
            item.classList.add('active');
        }
    });
    
    // Update page
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(pageName + 'Page').classList.add('active');
    
    // Update title
    const titles = {
        dashboard: 'Dashboard',
        employees: 'Employees',
        customers: 'Customers',
        stockists: 'Stockists',
        products: 'Products',
        areas: 'Areas',
        expenses: 'Expenses',
        approvals: 'Approvals',
        reports: 'Reports',
        announcements: 'Announcements',
        hierarchy: 'Hierarchy & Mapping',
        settings: 'Settings'
    };
    document.getElementById('pageTitle').textContent = titles[pageName] || pageName;
    
    // Load data
    switch(pageName) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'employees':
            loadEmployees();
            break;
        case 'customers':
            loadCustomers();
            break;
        case 'stockists':
            loadStockists();
            break;
        case 'products':
            loadProducts();
            break;
        case 'areas':
            loadAreas();
            break;
        case 'expenses':
            loadExpenses();
            break;
        case 'approvals':
            loadApprovals();
            break;
        case 'announcements':
            loadAnnouncements();
            break;
        case 'hierarchy':
            loadHierarchy();
            break;
        case 'settings':
            loadSettings();
            break;
    }
    
    // Close sidebar on mobile
    document.querySelector('.sidebar').classList.remove('open');
}

function toggleSidebar() {
    document.querySelector('.sidebar').classList.toggle('open');
}

function switchTab(tabName, btn) {
    // Update buttons
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    // Update content
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById(tabName + 'Tab').classList.add('active');
}

// ============================================
// DASHBOARD
// ============================================

async function loadDashboard() {
    showLoading();
    
    const result = await API.getDashboard();
    
    hideLoading();
    
    if (result.success) {
        const d = result.dashboard;
        
        document.getElementById('statActiveEmployees').textContent = d.active_employees || 0;
        document.getElementById('statTodayPunches').textContent = d.today_punches || 0;
        document.getElementById('statTodayVisits').textContent = d.today_visits || 0;
        document.getElementById('statTodayPOB').textContent = '₹' + formatNumber(d.today_pob || 0);
        document.getElementById('statPendingCustomers').textContent = d.pending_customers || 0;
        document.getElementById('statPendingExpenses').textContent = d.pending_expenses || 0;
        
        // Update approval badge
        const totalPending = (d.pending_customers || 0) + (d.pending_expenses || 0);
        const badge = document.getElementById('approvalBadge');
        if (totalPending > 0) {
            badge.textContent = totalPending;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
        
        // Recent visits
        const tbody = document.getElementById('recentVisitsTable');
        if (d.recent_visits && d.recent_visits.length > 0) {
            tbody.innerHTML = d.recent_visits.map(v => `
                <tr>
                    <td>${v.emp_name || '-'}</td>
                    <td>${v.customer_name || '-'}</td>
                    <td>${v.time || '-'}</td>
                    <td>${v.is_pob === 'Yes' ? '<span class="text-success">Yes</span>' : '-'}</td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No visits today</td></tr>';
        }
    }
}

// ============================================
// EMPLOYEES
// ============================================

async function loadEmployees() {
    const tbody = document.getElementById('employeesTableBody');
    tbody.innerHTML = '<tr><td colspan="7" class="text-center">Loading...</td></tr>';
    
    const result = await API.getAllEmployees();
    
    if (result.success) {
        employees = result.employees || [];
        renderEmployees();
    } else {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-danger">Error loading data</td></tr>';
    }
}

function renderEmployees() {
    const search = document.getElementById('employeeSearch').value.toLowerCase();
    const status = document.getElementById('employeeStatusFilter').value;
    
    let filtered = employees.filter(emp => {
        const matchSearch = emp.emp_name.toLowerCase().includes(search) ||
                           emp.mobile.includes(search) ||
                           emp.emp_id.toLowerCase().includes(search);
        const matchStatus = status === 'all' || emp.status === status;
        return matchSearch && matchStatus;
    });
    
    const tbody = document.getElementById('employeesTableBody');
    
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No employees found</td></tr>';
        return;
    }
    
    tbody.innerHTML = filtered.map(emp => `
        <tr>
            <td>${emp.emp_id}</td>
            <td>${emp.emp_name}</td>
            <td>${emp.mobile}</td>
            <td>${emp.designation || '-'}</td>
            <td>${getEmployeeName(emp.reporting_to)}</td>
            <td><span class="status status-${emp.status.toLowerCase()}">${emp.status}</span></td>
            <td>
                <div class="btn-group">
                    <button class="btn btn-sm btn-outline" onclick="showEmployeeModal('${emp.emp_id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    ${emp.status === 'Active' ? 
                        `<button class="btn btn-sm btn-warning" onclick="blockEmployee('${emp.emp_id}', true)">
                            <i class="fas fa-ban"></i>
                        </button>` :
                        emp.status === 'Blocked' ?
                        `<button class="btn btn-sm btn-success" onclick="blockEmployee('${emp.emp_id}', false)">
                            <i class="fas fa-check"></i>
                        </button>` : ''
                    }
                    <button class="btn btn-sm btn-danger" onclick="deleteEmployee('${emp.emp_id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function filterEmployees() {
    renderEmployees();
}

function getEmployeeName(empId) {
    const emp = employees.find(e => e.emp_id === empId);
    return emp ? emp.emp_name : '-';
}

function showEmployeeModal(empId = null) {
    const emp = empId ? employees.find(e => e.emp_id === empId) : null;
    const title = emp ? 'Edit Employee' : 'Add Employee';
    
    const designationOptions = CONFIG.DESIGNATIONS.map(d => 
        `<option value="${d}" ${emp && emp.designation === d ? 'selected' : ''}>${d}</option>`
    ).join('');
    
    const reportingOptions = employees
        .filter(e => e.status === 'Active' && (!emp || e.emp_id !== emp.emp_id))
        .map(e => `<option value="${e.emp_id}" ${emp && emp.reporting_to === e.emp_id ? 'selected' : ''}>${e.emp_name} (${e.designation})</option>`)
        .join('');
    
    const html = `
        <form id="employeeForm">
            <input type="hidden" id="empId" value="${emp ? emp.emp_id : ''}">
            
            <div class="form-group">
                <label>Employee Name *</label>
                <input type="text" id="empName" value="${emp ? emp.emp_name : ''}" required>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label>Mobile *</label>
                    <input type="tel" id="empMobile" value="${emp ? emp.mobile : ''}" pattern="[0-9]{10}" required>
                </div>
                <div class="form-group">
                    <label>Password ${emp ? '' : '*'}</label>
                    <input type="text" id="empPassword" value="" placeholder="${emp ? 'Leave blank to keep' : ''}">
                </div>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label>Designation *</label>
                    <select id="empDesignation" required>
                        <option value="">Select</option>
                        ${designationOptions}
                    </select>
                </div>
                <div class="form-group">
                    <label>Reporting To</label>
                    <select id="empReportingTo">
                        <option value="">None</option>
                        ${reportingOptions}
                    </select>
                </div>
            </div>
            
            <div class="form-group">
                <label>Email</label>
                <input type="email" id="empEmail" value="${emp ? emp.email || '' : ''}">
            </div>
            
            <div class="form-group">
                <label>Address</label>
                <textarea id="empAddress" rows="2">${emp ? emp.address || '' : ''}</textarea>
            </div>
            
            <div class="form-group">
                <label>Emergency Contact</label>
                <input type="tel" id="empEmergency" value="${emp ? emp.emergency_contact || '' : ''}">
            </div>
            
            <div class="modal-footer">
                <button type="button" class="btn btn-outline" onclick="closeModal()">Cancel</button>
                <button type="submit" class="btn btn-primary">
                    <i class="fas fa-save"></i> ${emp ? 'Update' : 'Add'} Employee
                </button>
            </div>
        </form>
    `;
    
    showModal(title, html);
    
    document.getElementById('employeeForm').addEventListener('submit', handleEmployeeSubmit);
}

async function handleEmployeeSubmit(e) {
    e.preventDefault();
    
    const empId = document.getElementById('empId').value;
    const data = {
        emp_name: document.getElementById('empName').value,
        mobile: document.getElementById('empMobile').value,
        designation: document.getElementById('empDesignation').value,
        reporting_to: document.getElementById('empReportingTo').value,
        email: document.getElementById('empEmail').value,
        address: document.getElementById('empAddress').value,
        emergency_contact: document.getElementById('empEmergency').value
    };
    
    const password = document.getElementById('empPassword').value;
    if (password) {
        data.password = password;
    }
    
    showLoading();
    
    let result;
    if (empId) {
        data.emp_id = empId;
        result = await API.updateEmployee(data);
    } else {
        if (!password) {
            hideLoading();
            showToast('Password is required for new employee', 'error');
            return;
        }
        result = await API.addEmployee(data);
    }
    
    hideLoading();
    
    if (result.success) {
        closeModal();
        showToast(result.message || 'Employee saved successfully', 'success');
        loadEmployees();
    } else {
        showToast(result.error || 'Error saving employee', 'error');
    }
}

async function blockEmployee(empId, block) {
    const action = block ? 'block' : 'unblock';
    if (!confirm(`Are you sure you want to ${action} this employee?`)) return;
    
    showLoading();
    const result = await API.blockEmployee(empId, block);
    hideLoading();
    
    if (result.success) {
        showToast(result.message, 'success');
        loadEmployees();
    } else {
        showToast(result.error, 'error');
    }
}

async function deleteEmployee(empId) {
    if (!confirm('Are you sure you want to delete this employee?')) return;
    
    showLoading();
    const result = await API.deleteEmployee(empId);
    hideLoading();
    
    if (result.success) {
        showToast(result.message, 'success');
        loadEmployees();
    } else {
        showToast(result.error, 'error');
    }
}

// ============================================
// CUSTOMERS
// ============================================

async function loadCustomers() {
    const tbody = document.getElementById('customersTableBody');
    tbody.innerHTML = '<tr><td colspan="9" class="text-center">Loading...</td></tr>';
    
    // Load areas for filter
    if (areas.length === 0) {
        const areasResult = await API.getAllAreas();
        if (areasResult.success) {
            areas = areasResult.areas || [];
            populateAreaFilter();
        }
    }
    
    // Load employees for transfer
    if (employees.length === 0) {
        const empResult = await API.getAllEmployees();
        if (empResult.success) {
            employees = empResult.employees || [];
        }
    }
    
    const result = await API.getAllCustomers();
    
    if (result.success) {
        customers = result.customers || [];
        renderCustomers();
    } else {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center text-danger">Error loading data</td></tr>';
    }
}

function populateAreaFilter() {
    const select = document.getElementById('customerAreaFilter');
    select.innerHTML = '<option value="all">All Areas</option>' + 
        areas.filter(a => a.status === 'Active').map(a => 
            `<option value="${a.area_id}">${a.area_name}</option>`
        ).join('');
}

function renderCustomers() {
    const search = document.getElementById('customerSearch').value.toLowerCase();
    const status = document.getElementById('customerStatusFilter').value;
    const areaId = document.getElementById('customerAreaFilter').value;
    
    let filtered = customers.filter(cust => {
        const matchSearch = cust.customer_name.toLowerCase().includes(search) ||
                           (cust.mobile && cust.mobile.includes(search)) ||
                           cust.customer_id.toLowerCase().includes(search);
        const matchStatus = status === 'all' || cust.status === status;
        const matchArea = areaId === 'all' || cust.area_id === areaId;
        return matchSearch && matchStatus && matchArea;
    });
    
    const tbody = document.getElementById('customersTableBody');
    
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center text-muted">No customers found</td></tr>';
        return;
    }
    
    tbody.innerHTML = filtered.map(cust => {
        const area = areas.find(a => a.area_id === cust.area_id);
        return `
            <tr>
                <td><input type="checkbox" class="customer-checkbox" value="${cust.customer_id}"></td>
                <td>${cust.customer_id}</td>
                <td>${cust.customer_name}</td>
                <td>${cust.specialty || '-'}</td>
                <td>${area ? area.area_name : '-'}</td>
                <td>${cust.mobile || '-'}</td>
                <td>${cust.created_by_name || '-'}</td>
                <td><span class="status status-${cust.status.toLowerCase()}">${cust.status}</span></td>
                <td>
                    <div class="btn-group">
                        <button class="btn btn-sm btn-outline" onclick="showCustomerDetails('${cust.customer_id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-secondary" onclick="showTransferModal('${cust.customer_id}')">
                            <i class="fas fa-exchange-alt"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function filterCustomers() {
    renderCustomers();
}

function showCustomerDetails(customerId) {
    const cust = customers.find(c => c.customer_id === customerId);
    if (!cust) return;
    
    const area = areas.find(a => a.area_id === cust.area_id);
    
    const html = `
        <div class="customer-details">
            <table class="table">
                <tr><td><strong>ID</strong></td><td>${cust.customer_id}</td></tr>
                <tr><td><strong>Name</strong></td><td>${cust.customer_name}</td></tr>
                <tr><td><strong>Code</strong></td><td>${cust.customer_code || '-'}</td></tr>
                <tr><td><strong>Specialty</strong></td><td>${cust.specialty || '-'}</td></tr>
                <tr><td><strong>Area</strong></td><td>${area ? area.area_name : '-'}</td></tr>
                <tr><td><strong>City</strong></td><td>${cust.city || '-'}</td></tr>
                <tr><td><strong>Address</strong></td><td>${cust.address || '-'}</td></tr>
                <tr><td><strong>Mobile</strong></td><td>${cust.mobile || '-'}</td></tr>
                <tr><td><strong>Email</strong></td><td>${cust.email || '-'}</td></tr>
                <tr><td><strong>Location</strong></td><td>${cust.lat}, ${cust.long}</td></tr>
                <tr><td><strong>Radius</strong></td><td>${cust.radius || 300}m</td></tr>
                <tr><td><strong>Status</strong></td><td><span class="status status-${cust.status.toLowerCase()}">${cust.status}</span></td></tr>
                <tr><td><strong>Created By</strong></td><td>${cust.created_by_name || cust.created_by || '-'}</td></tr>
                <tr><td><strong>Created At</strong></td><td>${cust.created_at || '-'}</td></tr>
            </table>
        </div>
    `;
    
    showModal('Customer Details', html);
}

function showTransferModal(customerId) {
    const empOptions = employees
        .filter(e => e.status === 'Active')
        .map(e => `<option value="${e.emp_id}">${e.emp_name} (${e.designation})</option>`)
        .join('');
    
    const html = `
        <form id="transferForm">
            <input type="hidden" id="transferCustomerId" value="${customerId}">
            
            <div class="form-group">
                <label>Transfer to Employee *</label>
                <select id="transferToEmp" required>
                    <option value="">Select Employee</option>
                    ${empOptions}
                </select>
            </div>
            
            <div class="modal-footer">
                <button type="button" class="btn btn-outline" onclick="closeModal()">Cancel</button>
                <button type="submit" class="btn btn-primary">Transfer</button>
            </div>
        </form>
    `;
    
    showModal('Transfer Customer', html);
    
    document.getElementById('transferForm').addEventListener('submit', handleTransfer);
}

async function handleTransfer(e) {
    e.preventDefault();
    
    const customerId = document.getElementById('transferCustomerId').value;
    const newEmpId = document.getElementById('transferToEmp').value;
    
    showLoading();
    const result = await API.transferCustomer(customerId, newEmpId);
    hideLoading();
    
    if (result.success) {
        closeModal();
        showToast(result.message, 'success');
        loadCustomers();
    } else {
        showToast(result.error, 'error');
    }
}

function showBulkTransferModal() {
    const selectedIds = Array.from(document.querySelectorAll('.customer-checkbox:checked')).map(cb => cb.value);
    
    if (selectedIds.length === 0) {
        showToast('Please select at least one customer', 'error');
        return;
    }
    
    const empOptions = employees
        .filter(e => e.status === 'Active')
        .map(e => `<option value="${e.emp_id}">${e.emp_name} (${e.designation})</option>`)
        .join('');
    
    const html = `
        <form id="bulkTransferForm">
            <p class="mb-15"><strong>${selectedIds.length}</strong> customers selected</p>
            
            <div class="form-group">
                <label>Transfer to Employee *</label>
                <select id="bulkTransferToEmp" required>
                    <option value="">Select Employee</option>
                    ${empOptions}
                </select>
            </div>
            
            <div class="modal-footer">
                <button type="button" class="btn btn-outline" onclick="closeModal()">Cancel</button>
                <button type="submit" class="btn btn-primary">Transfer All</button>
            </div>
        </form>
    `;
    
    showModal('Bulk Transfer Customers', html);
    
    document.getElementById('bulkTransferForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const newEmpId = document.getElementById('bulkTransferToEmp').value;
        
        showLoading();
        const result = await API.bulkTransferCustomers(selectedIds, newEmpId);
        hideLoading();
        
        if (result.success) {
            closeModal();
            showToast(result.message, 'success');
            loadCustomers();
        } else {
            showToast(result.error, 'error');
        }
    });
}
