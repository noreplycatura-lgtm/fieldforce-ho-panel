// ============================================
// FIELD REP HO ADMIN PANEL - JAVASCRIPT
// ============================================

// API Configuration
const API_URL = 'https://script.google.com/macros/s/AKfycbyo9YciQoWC_Z7Ak3IYtF_fZKrPUxpoZTsbDHY-9laLcd4oj9_AlK6EGmlJu-XVTmUxXQ/exec';

// Global Variables
let currentUser = null;
let allEmployees = [];
let allCustomers = [];
let allStockists = [];
let allProducts = [];
let allAreas = [];
let allAnnouncements = [];
let currentBulkUploadType = '';

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    // Check if already logged in
    const savedUser = localStorage.getItem('hoUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        showMainApp();
        loadDashboard();
    }

    // Setup event listeners
    setupEventListeners();
    updateDateTime();
    setInterval(updateDateTime, 60000);

    // Set default dates for reports
    setDefaultDates();
});

function setupEventListeners() {
    // Login Form
    document.getElementById('loginForm').addEventListener('submit', handleLogin);

    // Sidebar Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function() {
            const page = this.dataset.page;
            navigateTo(page);
        });
    });

    // Sidebar Toggle
    document.getElementById('sidebarToggle').addEventListener('click', toggleSidebar);
    document.getElementById('mobileMenuBtn').addEventListener('click', toggleMobileSidebar);

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);

    // Refresh Button
    document.getElementById('refreshBtn').addEventListener('click', refreshCurrentPage);

    // Tabs
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const tabName = this.dataset.tab;
            switchTab(this, tabName);
        });
    });

    // Search Inputs
    document.getElementById('empSearch')?.addEventListener('input', filterEmployees);
    document.getElementById('custSearch')?.addEventListener('input', filterCustomers);
    document.getElementById('stockSearch')?.addEventListener('input', filterStockists);
    document.getElementById('prodSearch')?.addEventListener('input', filterProducts);
    document.getElementById('areaSearch')?.addEventListener('input', filterAreas);

    // Filter dropdowns
    document.getElementById('custStatusFilter')?.addEventListener('change', filterCustomers);
    document.getElementById('transferFromEmp')?.addEventListener('change', loadTransferCustomers);

    // Form Submissions
    document.getElementById('employeeForm').addEventListener('submit', handleEmployeeSubmit);
    document.getElementById('stockistForm').addEventListener('submit', handleStockistSubmit);
    document.getElementById('productForm').addEventListener('submit', handleProductSubmit);
    document.getElementById('areaForm').addEventListener('submit', handleAreaSubmit);
    document.getElementById('announcementForm').addEventListener('submit', handleAnnouncementSubmit);
    document.getElementById('counterForm').addEventListener('submit', handleCounterSubmit);

    // Bulk Upload File
    document.getElementById('bulkUploadFile')?.addEventListener('change', previewBulkUpload);

    // Close modals on outside click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.remove('active');
            }
        });
    });
}

function updateDateTime() {
    const now = new Date();
    const options = { 
        weekday: 'short', 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    document.getElementById('dateTime').textContent = now.toLocaleDateString('en-IN', options);
}

function setDefaultDates() {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    
    document.getElementById('reportStartDate').valueAsDate = firstDay;
    document.getElementById('reportEndDate').valueAsDate = today;
}

// ============================================
// AUTHENTICATION
// ============================================

async function handleLogin(e) {
    e.preventDefault();
    
    const userCode = document.getElementById('userCode').value.trim();
    const password = document.getElementById('password').value.trim();
    
    if (!userCode || !password) {
        showLoginError('Please enter User Code and Password');
        return;
    }

    showLoading();

    try {
        const response = await apiCall('hoLogin', {
            user_code: userCode,
            password: password
        });

        hideLoading();

        if (response.success) {
            currentUser = response.user;
            localStorage.setItem('hoUser', JSON.stringify(currentUser));
            showMainApp();
            loadDashboard();
        } else {
            showLoginError(response.error || 'Invalid credentials');
        }
    } catch (error) {
        hideLoading();
        showLoginError('Connection error. Please try again.');
        console.error('Login error:', error);
    }
}

function showLoginError(message) {
    const errorDiv = document.getElementById('loginError');
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
}

function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        currentUser = null;
        localStorage.removeItem('hoUser');
        document.getElementById('loginPage').classList.add('active');
        document.getElementById('mainApp').classList.add('hidden');
        document.getElementById('loginForm').reset();
        document.getElementById('loginError').classList.add('hidden');
    }
}

function showMainApp() {
    document.getElementById('loginPage').classList.remove('active');
    document.getElementById('mainApp').classList.remove('hidden');
    document.getElementById('currentUserName').textContent = currentUser.Name || 'Admin';
}

// ============================================
// API CALLS
// ============================================

async function apiCall(action, data = {}) {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain',
            },
            body: JSON.stringify({
                action: action,
                ...data
            })
        });

        const text = await response.text();
        return JSON.parse(text);
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// ============================================
// NAVIGATION
// ============================================

function navigateTo(page) {
    // Update nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.page === page) {
            item.classList.add('active');
        }
    });

    // Update page title
    const titles = {
        dashboard: 'Dashboard',
        employees: 'Employee Management',
        customers: 'Customer Management',
        stockists: 'Stockist Management',
        products: 'Product Management',
        areas: 'Area Management',
        expenses: 'Expense Management',
        hierarchy: 'Hierarchy & Mapping',
        announcements: 'Announcements',
        reports: 'Reports',
        settings: 'Settings'
    };
    document.getElementById('pageTitle').textContent = titles[page] || 'Dashboard';

    // Show/hide pages
    document.querySelectorAll('.content-page').forEach(p => {
        p.classList.remove('active');
    });
    document.getElementById(page + 'Page')?.classList.add('active');

    // Load page data
    loadPageData(page);

    // Close mobile sidebar
    document.getElementById('sidebar').classList.remove('open');
}

function loadPageData(page) {
    switch(page) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'employees':
            loadEmployees();
            break;
        case 'customers':
            loadPendingCustomers();
            loadAllCustomers();
            loadEmployeesForTransfer();
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
            loadPendingExpenses();
            break;
        case 'hierarchy':
            loadHierarchy();
            loadEmployeesForMapping();
            loadAreasForMapping();
            break;
        case 'announcements':
            loadAnnouncements();
            break;
        case 'settings':
            loadSettings();
            break;
    }
}

function refreshCurrentPage() {
    const activePage = document.querySelector('.nav-item.active');
    if (activePage) {
        loadPageData(activePage.dataset.page);
        showToast('Data refreshed');
    }
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('collapsed');
}

function toggleMobileSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
}

function switchTab(tabElement, tabName) {
    // Update tab buttons
    tabElement.parentElement.querySelectorAll('.tab').forEach(t => {
        t.classList.remove('active');
    });
    tabElement.classList.add('active');

    // Show/hide tab content
    const tabContents = tabElement.closest('.content-page').querySelectorAll('.tab-content');
    tabContents.forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(tabName + 'Tab')?.classList.add('active');
}

// ============================================
// DASHBOARD
// ============================================

async function loadDashboard() {
    showLoading();

    try {
        const response = await apiCall('getHODashboard');
        hideLoading();

        if (response.success) {
            const data = response.dashboard;

            // Update stats
            document.getElementById('statEmployees').textContent = data.active_employees || 0;
            document.getElementById('statTodayPunches').textContent = data.today_punches || 0;
            document.getElementById('statTodayVisits').textContent = data.today_visits || 0;
            document.getElementById('statTodayPOB').textContent = '₹' + formatNumber(data.today_pob || 0);

            // Update pending counts
            document.getElementById('pendingCustomers').textContent = data.pending_customers || 0;
            document.getElementById('pendingExpenses').textContent = data.pending_expenses || 0;

            // Update recent visits
            renderRecentVisits(data.recent_visits || []);

            // Load performance data
            loadPerformanceData();
        }
    } catch (error) {
        hideLoading();
        console.error('Dashboard error:', error);
    }
}

function renderRecentVisits(visits) {
    const container = document.getElementById('recentVisitsList');
    
    if (visits.length === 0) {
        container.innerHTML = '<p class="text-muted">No recent visits</p>';
        return;
    }

    container.innerHTML = visits.slice(0, 8).map(visit => `
        <div class="activity-item">
            <div class="activity-icon">
                <i class="fas fa-map-marker-alt"></i>
            </div>
            <div class="activity-info">
                <div class="activity-text">
                    <strong>${visit.emp_name}</strong> visited <strong>${visit.customer_name}</strong>
                </div>
                <div class="activity-time">${visit.time} | ${visit.is_pob === 'Yes' ? '✓ POB' : 'No Order'}</div>
            </div>
        </div>
    `).join('');
}

async function loadPerformanceData() {
    try {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        
        const response = await apiCall('getHOReports', {
            report_type: 'employee_performance',
            start_date: formatDate(firstDay),
            end_date: formatDate(today)
        });

        if (response.success && response.report) {
            const report = response.report;
            
            // Calculate totals
            const totalCalls = report.reduce((sum, r) => sum + (r.total_calls || 0), 0);
            const productiveCalls = report.reduce((sum, r) => sum + (r.productive_calls || 0), 0);
            const totalPOB = report.reduce((sum, r) => sum + (r.total_pob || 0), 0);
            
            const maxCalls = Math.max(totalCalls, 1);
            const maxPOB = Math.max(totalPOB, 1);

            document.getElementById('performanceBars').innerHTML = `
                <div class="performance-bar-item">
                    <span class="performance-bar-label">Total Calls</span>
                    <div class="performance-bar-container">
                        <div class="performance-bar" style="width: 100%"></div>
                    </div>
                    <span class="performance-bar-value">${formatNumber(totalCalls)}</span>
                </div>
                <div class="performance-bar-item">
                    <span class="performance-bar-label">Productive</span>
                    <div class="performance-bar-container">
                        <div class="performance-bar" style="width: ${(productiveCalls/maxCalls*100)}%; background: linear-gradient(90deg, #10b981, #34d399)"></div>
                    </div>
                    <span class="performance-bar-value">${formatNumber(productiveCalls)}</span>
                </div>
                <div class="performance-bar-item">
                    <span class="performance-bar-label">Total POB</span>
                    <div class="performance-bar-container">
                        <div class="performance-bar" style="width: 100%; background: linear-gradient(90deg, #f59e0b, #fbbf24)"></div>
                    </div>
                    <span class="performance-bar-value">₹${formatNumber(totalPOB)}</span>
                </div>
                <div class="performance-bar-item">
                    <span class="performance-bar-label">Productivity %</span>
                    <div class="performance-bar-container">
                        <div class="performance-bar" style="width: ${totalCalls > 0 ? (productiveCalls/totalCalls*100) : 0}%; background: linear-gradient(90deg, #8b5cf6, #a78bfa)"></div>
                    </div>
                    <span class="performance-bar-value">${totalCalls > 0 ? Math.round(productiveCalls/totalCalls*100) : 0}%</span>
                </div>
            `;
        }
    } catch (error) {
        console.error('Performance data error:', error);
    }
}

// ============================================
// EMPLOYEES
// ============================================

async function loadEmployees() {
    showLoading();

    try {
        const response = await apiCall('getAllEmployees');
        hideLoading();

        if (response.success) {
            allEmployees = response.employees;
            renderEmployeesTable(allEmployees);
            populateEmployeeDropdowns();
        }
    } catch (error) {
        hideLoading();
        console.error('Load employees error:', error);
    }
}

function renderEmployeesTable(employees) {
    const tbody = document.getElementById('employeesTableBody');

    if (employees.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No employees found</td></tr>';
        return;
    }

    tbody.innerHTML = employees.map(emp => {
        const reportingToName = allEmployees.find(e => e.emp_id === emp.reporting_to)?.emp_name || '-';
        return `
            <tr>
                <td>${emp.emp_id}</td>
                <td>${emp.emp_name}</td>
                <td>${emp.mobile}</td>
                <td>${emp.designation}</td>
                <td>${reportingToName}</td>
                <td><span class="status ${emp.status?.toLowerCase()}">${emp.status}</span></td>
                <td class="actions">
                    <button class="btn btn-sm btn-secondary" onclick="editEmployee('${emp.emp_id}')" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-warning" onclick="toggleBlockEmployee('${emp.emp_id}', ${emp.status === 'Blocked'})" title="${emp.status === 'Blocked' ? 'Unblock' : 'Block'}">
                        <i class="fas fa-${emp.status === 'Blocked' ? 'unlock' : 'ban'}"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteEmployee('${emp.emp_id}')" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function filterEmployees() {
    const search = document.getElementById('empSearch').value.toLowerCase();
    const filtered = allEmployees.filter(emp => 
        emp.emp_name?.toLowerCase().includes(search) ||
        emp.mobile?.includes(search) ||
        emp.emp_id?.toLowerCase().includes(search) ||
        emp.designation?.toLowerCase().includes(search)
    );
    renderEmployeesTable(filtered);
}

function populateEmployeeDropdowns() {
    const activeEmployees = allEmployees.filter(e => e.status === 'Active');
    
    // Reporting To dropdown
    const reportingTo = document.getElementById('empReportingTo');
    reportingTo.innerHTML = '<option value="">None</option>' + 
        activeEmployees.map(e => `<option value="${e.emp_id}">${e.emp_name} (${e.designation})</option>`).join('');

    // Transfer dropdowns
    const transferFrom = document.getElementById('transferFromEmp');
    const transferTo = document.getElementById('transferToEmp');
    
    if (transferFrom) {
        transferFrom.innerHTML = '<option value="">Select Employee</option>' + 
            activeEmployees.map(e => `<option value="${e.emp_id}">${e.emp_name}</option>`).join('');
    }
    
    if (transferTo) {
        transferTo.innerHTML = '<option value="">Select Employee</option>' + 
            activeEmployees.map(e => `<option value="${e.emp_id}">${e.emp_name}</option>`).join('');
    }

    // Mapping dropdown
    const mappingEmployee = document.getElementById('mappingEmployee');
    if (mappingEmployee) {
        mappingEmployee.innerHTML = '<option value="">Select Employee</option>' + 
            activeEmployees.map(e => `<option value="${e.emp_id}">${e.emp_name} (${e.designation})</option>`).join('');
    }
}

function openEmployeeModal(empId = null) {
    const modal = document.getElementById('employeeModal');
    const form = document.getElementById('employeeForm');
    const title = document.getElementById('employeeModalTitle');

    form.reset();
    document.getElementById('empId').value = '';

    if (empId) {
        title.textContent = 'Edit Employee';
        const emp = allEmployees.find(e => e.emp_id === empId);
        if (emp) {
            document.getElementById('empId').value = emp.emp_id;
            document.getElementById('empName').value = emp.emp_name || '';
            document.getElementById('empMobile').value = emp.mobile || '';
            document.getElementById('empDesignation').value = emp.designation || '';
            document.getElementById('empReportingTo').value = emp.reporting_to || '';
            document.getElementById('empEmail').value = emp.email || '';
            document.getElementById('empAddress').value = emp.address || '';
            document.getElementById('empEmergency').value = emp.emergency_contact || '';
        }
    } else {
        title.textContent = 'Add Employee';
    }

    modal.classList.add('active');
}

function editEmployee(empId) {
    openEmployeeModal(empId);
}

async function handleEmployeeSubmit(e) {
    e.preventDefault();
    showLoading();

    const empId = document.getElementById('empId').value;
    const data = {
        emp_name: document.getElementById('empName').value,
        mobile: document.getElementById('empMobile').value,
        designation: document.getElementById('empDesignation').value,
        reporting_to: document.getElementById('empReportingTo').value,
        email: document.getElementById('empEmail').value,
        password: document.getElementById('empPassword').value,
        address: document.getElementById('empAddress').value,
        emergency_contact: document.getElementById('empEmergency').value
    };

    try {
        let response;
        if (empId) {
            data.emp_id = empId;
            response = await apiCall('updateEmployee', data);
        } else {
            response = await apiCall('addEmployee', data);
        }

        hideLoading();

        if (response.success) {
            closeModal('employeeModal');
            loadEmployees();
            showToast(empId ? 'Employee updated successfully' : 'Employee added successfully', 'success');
        } else {
            showToast(response.error || 'Error saving employee', 'error');
        }
    } catch (error) {
        hideLoading();
        showToast('Connection error', 'error');
    }
}

async function toggleBlockEmployee(empId, isBlocked) {
    const action = isBlocked ? 'unblock' : 'block';
    if (!confirm(`Are you sure you want to ${action} this employee?`)) return;

    showLoading();

    try {
        const response = await apiCall('blockEmployee', {
            emp_id: empId,
            block: !isBlocked
        });

        hideLoading();

        if (response.success) {
            loadEmployees();
            showToast(`Employee ${action}ed successfully`, 'success');
        } else {
            showToast(response.error || 'Error updating employee', 'error');
        }
    } catch (error) {
        hideLoading();
        showToast('Connection error', 'error');
    }
}

async function deleteEmployee(empId) {
    if (!confirm('Are you sure you want to delete this employee? This action cannot be undone.')) return;

    showLoading();

    try {
        const response = await apiCall('deleteEmployee', { emp_id: empId });
        hideLoading();

        if (response.success) {
            loadEmployees();
            showToast('Employee deleted successfully', 'success');
        } else {
            showToast(response.error || 'Error deleting employee', 'error');
        }
    } catch (error) {
        hideLoading();
        showToast('Connection error', 'error');
    }
}
// ============================================
// CUSTOMERS
// ============================================

async function loadPendingCustomers() {
    try {
        const response = await apiCall('getPendingCustomers');
        
        if (response.success) {
            renderPendingCustomers(response.customers || []);
        }
    } catch (error) {
        console.error('Load pending customers error:', error);
    }
}

function renderPendingCustomers(customers) {
    const tbody = document.getElementById('pendingCustomersBody');

    if (customers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No pending approvals</td></tr>';
        return;
    }

    tbody.innerHTML = customers.map(cust => `
        <tr>
            <td>${cust.customer_name}</td>
            <td>${cust.specialty || '-'}</td>
            <td>${cust.area_id || '-'}</td>
            <td>${cust.mobile}</td>
            <td>${cust.created_by_name || cust.created_by}</td>
            <td>${formatDisplayDate(cust.created_at)}</td>
            <td class="actions">
                <button class="btn btn-sm btn-success" onclick="approveCustomer('${cust.customer_id}')" title="Approve">
                    <i class="fas fa-check"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="rejectCustomer('${cust.customer_id}')" title="Reject">
                    <i class="fas fa-times"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

async function approveCustomer(customerId) {
    if (!confirm('Approve this customer?')) return;

    showLoading();

    try {
        const response = await apiCall('approveCustomer', {
            customer_id: customerId,
            approved_by: currentUser.User_Code
        });

        hideLoading();

        if (response.success) {
            loadPendingCustomers();
            loadAllCustomers();
            loadDashboard();
            showToast('Customer approved', 'success');
        } else {
            showToast(response.error || 'Error approving customer', 'error');
        }
    } catch (error) {
        hideLoading();
        showToast('Connection error', 'error');
    }
}

async function rejectCustomer(customerId) {
    if (!confirm('Reject this customer?')) return;

    showLoading();

    try {
        const response = await apiCall('rejectCustomer', {
            customer_id: customerId,
            rejected_by: currentUser.User_Code
        });

        hideLoading();

        if (response.success) {
            loadPendingCustomers();
            loadDashboard();
            showToast('Customer rejected', 'success');
        } else {
            showToast(response.error || 'Error rejecting customer', 'error');
        }
    } catch (error) {
        hideLoading();
        showToast('Connection error', 'error');
    }
}

async function loadAllCustomers() {
    try {
        const response = await apiCall('getAllCustomersHO');
        
        if (response.success) {
            allCustomers = response.customers || [];
            renderAllCustomers(allCustomers);
        }
    } catch (error) {
        console.error('Load all customers error:', error);
    }
}

function renderAllCustomers(customers) {
    const tbody = document.getElementById('allCustomersBody');

    if (customers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">No customers found</td></tr>';
        return;
    }

    tbody.innerHTML = customers.map(cust => `
        <tr>
            <td>${cust.customer_code || '-'}</td>
            <td>${cust.customer_name}</td>
            <td>${cust.specialty || '-'}</td>
            <td>${cust.area_id || '-'}</td>
            <td>${cust.city || '-'}</td>
            <td>${cust.mobile}</td>
            <td><span class="status ${cust.status?.toLowerCase()}">${cust.status}</span></td>
            <td>${cust.created_by_name || cust.created_by}</td>
        </tr>
    `).join('');
}

function filterCustomers() {
    const search = document.getElementById('custSearch')?.value.toLowerCase() || '';
    const status = document.getElementById('custStatusFilter')?.value || 'all';

    let filtered = allCustomers;

    if (search) {
        filtered = filtered.filter(cust => 
            cust.customer_name?.toLowerCase().includes(search) ||
            cust.mobile?.includes(search) ||
            cust.customer_code?.toLowerCase().includes(search)
        );
    }

    if (status !== 'all') {
        filtered = filtered.filter(cust => cust.status === status);
    }

    renderAllCustomers(filtered);
}

async function loadEmployeesForTransfer() {
    if (allEmployees.length === 0) {
        await loadEmployees();
    }
    populateEmployeeDropdowns();
}

async function loadTransferCustomers() {
    const fromEmpId = document.getElementById('transferFromEmp').value;
    const container = document.getElementById('transferCustomersList');

    if (!fromEmpId) {
        container.innerHTML = '<p class="text-muted">Select "From Employee" first</p>';
        return;
    }

    const empCustomers = allCustomers.filter(c => c.created_by === fromEmpId && c.status === 'Approved');

    if (empCustomers.length === 0) {
        container.innerHTML = '<p class="text-muted">No customers found for this employee</p>';
        return;
    }

    container.innerHTML = `
        <div class="checkbox-item">
            <input type="checkbox" id="selectAllCust" onchange="toggleSelectAllCustomers(this)">
            <label for="selectAllCust"><strong>Select All</strong></label>
        </div>
    ` + empCustomers.map(cust => `
        <div class="checkbox-item">
            <input type="checkbox" class="transfer-cust-checkbox" value="${cust.customer_id}" id="cust_${cust.customer_id}">
            <label for="cust_${cust.customer_id}">${cust.customer_name} (${cust.customer_code})</label>
        </div>
    `).join('');
}

function toggleSelectAllCustomers(checkbox) {
    document.querySelectorAll('.transfer-cust-checkbox').forEach(cb => {
        cb.checked = checkbox.checked;
    });
}

async function bulkTransferCustomers() {
    const toEmpId = document.getElementById('transferToEmp').value;
    
    if (!toEmpId) {
        showToast('Please select target employee', 'error');
        return;
    }

    const selectedCustomers = [];
    document.querySelectorAll('.transfer-cust-checkbox:checked').forEach(cb => {
        selectedCustomers.push(cb.value);
    });

    if (selectedCustomers.length === 0) {
        showToast('Please select customers to transfer', 'error');
        return;
    }

    if (!confirm(`Transfer ${selectedCustomers.length} customers?`)) return;

    showLoading();

    try {
        const response = await apiCall('bulkTransferCustomers', {
            customer_ids: selectedCustomers,
            new_emp_id: toEmpId
        });

        hideLoading();

        if (response.success) {
            loadAllCustomers();
            document.getElementById('transferCustomersList').innerHTML = '<p class="text-muted">Select "From Employee" first</p>';
            showToast(response.message || 'Customers transferred', 'success');
        } else {
            showToast(response.error || 'Error transferring customers', 'error');
        }
    } catch (error) {
        hideLoading();
        showToast('Connection error', 'error');
    }
}

// ============================================
// STOCKISTS
// ============================================

async function loadStockists() {
    showLoading();

    try {
        const response = await apiCall('getAllStockistsHO');
        hideLoading();

        if (response.success) {
            allStockists = response.stockists || [];
            renderStockistsTable(allStockists);
        }
    } catch (error) {
        hideLoading();
        console.error('Load stockists error:', error);
    }
}

function renderStockistsTable(stockists) {
    const tbody = document.getElementById('stockistsTableBody');

    if (stockists.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No stockists found</td></tr>';
        return;
    }

    tbody.innerHTML = stockists.map(stock => `
        <tr>
            <td>${stock.stockist_code || '-'}</td>
            <td>${stock.stockist_name}</td>
            <td>${stock.city || '-'}</td>
            <td>${stock.mobile}</td>
            <td><span class="status ${stock.status?.toLowerCase()}">${stock.status}</span></td>
            <td class="actions">
                <button class="btn btn-sm btn-secondary" onclick="editStockist('${stock.stockist_id}')" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteStockist('${stock.stockist_id}')" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function filterStockists() {
    const search = document.getElementById('stockSearch').value.toLowerCase();
    const filtered = allStockists.filter(stock => 
        stock.stockist_name?.toLowerCase().includes(search) ||
        stock.mobile?.includes(search) ||
        stock.city?.toLowerCase().includes(search)
    );
    renderStockistsTable(filtered);
}

function openStockistModal(stockistId = null) {
    const modal = document.getElementById('stockistModal');
    const form = document.getElementById('stockistForm');
    const title = document.getElementById('stockistModalTitle');

    form.reset();
    document.getElementById('stockistId').value = '';

    if (stockistId) {
        title.textContent = 'Edit Stockist';
        const stock = allStockists.find(s => s.stockist_id === stockistId);
        if (stock) {
            document.getElementById('stockistId').value = stock.stockist_id;
            document.getElementById('stockistName').value = stock.stockist_name || '';
            document.getElementById('stockistCity').value = stock.city || '';
            document.getElementById('stockistMobile').value = stock.mobile || '';
            document.getElementById('stockistAddress').value = stock.address || '';
            document.getElementById('stockistEmail').value = stock.email || '';
        }
    } else {
        title.textContent = 'Add Stockist';
    }

    modal.classList.add('active');
}

function editStockist(stockistId) {
    openStockistModal(stockistId);
}

async function handleStockistSubmit(e) {
    e.preventDefault();
    showLoading();

    const stockistId = document.getElementById('stockistId').value;
    const data = {
        stockist_name: document.getElementById('stockistName').value,
        city: document.getElementById('stockistCity').value,
        mobile: document.getElementById('stockistMobile').value,
        address: document.getElementById('stockistAddress').value,
        email: document.getElementById('stockistEmail').value
    };

    try {
        let response;
        if (stockistId) {
            data.stockist_id = stockistId;
            response = await apiCall('updateStockist', data);
        } else {
            response = await apiCall('addStockist', data);
        }

        hideLoading();

        if (response.success) {
            closeModal('stockistModal');
            loadStockists();
            showToast(stockistId ? 'Stockist updated' : 'Stockist added', 'success');
        } else {
            showToast(response.error || 'Error saving stockist', 'error');
        }
    } catch (error) {
        hideLoading();
        showToast('Connection error', 'error');
    }
}

async function deleteStockist(stockistId) {
    if (!confirm('Delete this stockist?')) return;

    showLoading();

    try {
        const response = await apiCall('deleteStockist', { stockist_id: stockistId });
        hideLoading();

        if (response.success) {
            loadStockists();
            showToast('Stockist deleted', 'success');
        } else {
            showToast(response.error || 'Error deleting stockist', 'error');
        }
    } catch (error) {
        hideLoading();
        showToast('Connection error', 'error');
    }
}

// ============================================
// PRODUCTS
// ============================================

async function loadProducts() {
    showLoading();

    try {
        const response = await apiCall('getAllProducts');
        hideLoading();

        if (response.success) {
            allProducts = response.products || [];
            renderProductsTable(allProducts);
        }
    } catch (error) {
        hideLoading();
        console.error('Load products error:', error);
    }
}

function renderProductsTable(products) {
    const tbody = document.getElementById('productsTableBody');

    if (products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">No products found</td></tr>';
        return;
    }

    tbody.innerHTML = products.map(prod => `
        <tr>
            <td>${prod.product_code || '-'}</td>
            <td>${prod.product_name}</td>
            <td>${prod.category || '-'}</td>
            <td>₹${prod.mrp || 0}</td>
            <td>₹${prod.pts || 0}</td>
            <td>₹${prod.ptr || 0}</td>
            <td><span class="status ${prod.status?.toLowerCase()}">${prod.status}</span></td>
            <td class="actions">
                <button class="btn btn-sm btn-secondary" onclick="editProduct('${prod.product_id}')" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteProduct('${prod.product_id}')" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function filterProducts() {
    const search = document.getElementById('prodSearch').value.toLowerCase();
    const filtered = allProducts.filter(prod => 
        prod.product_name?.toLowerCase().includes(search) ||
        prod.product_code?.toLowerCase().includes(search) ||
        prod.category?.toLowerCase().includes(search)
    );
    renderProductsTable(filtered);
}

function openProductModal(productId = null) {
    const modal = document.getElementById('productModal');
    const form = document.getElementById('productForm');
    const title = document.getElementById('productModalTitle');

    form.reset();
    document.getElementById('productId').value = '';

    if (productId) {
        title.textContent = 'Edit Product';
        const prod = allProducts.find(p => p.product_id === productId);
        if (prod) {
            document.getElementById('productId').value = prod.product_id;
            document.getElementById('productName').value = prod.product_name || '';
            document.getElementById('productCode').value = prod.product_code || '';
            document.getElementById('productCategory').value = prod.category || '';
            document.getElementById('productUnit').value = prod.unit || 'Pcs';
            document.getElementById('productMRP').value = prod.mrp || '';
            document.getElementById('productPTS').value = prod.pts || '';
            document.getElementById('productPTR').value = prod.ptr || '';
        }
    } else {
        title.textContent = 'Add Product';
    }

    modal.classList.add('active');
}

function editProduct(productId) {
    openProductModal(productId);
}

async function handleProductSubmit(e) {
    e.preventDefault();
    showLoading();

    const productId = document.getElementById('productId').value;
    const data = {
        product_name: document.getElementById('productName').value,
        product_code: document.getElementById('productCode').value,
        category: document.getElementById('productCategory').value,
        unit: document.getElementById('productUnit').value,
        mrp: parseFloat(document.getElementById('productMRP').value) || 0,
        pts: parseFloat(document.getElementById('productPTS').value) || 0,
        ptr: parseFloat(document.getElementById('productPTR').value) || 0
    };

    try {
        let response;
        if (productId) {
            data.product_id = productId;
            response = await apiCall('updateProduct', data);
        } else {
            response = await apiCall('addProduct', data);
        }

        hideLoading();

        if (response.success) {
            closeModal('productModal');
            loadProducts();
            showToast(productId ? 'Product updated' : 'Product added', 'success');
        } else {
            showToast(response.error || 'Error saving product', 'error');
        }
    } catch (error) {
        hideLoading();
        showToast('Connection error', 'error');
    }
}

async function deleteProduct(productId) {
    if (!confirm('Delete this product?')) return;

    showLoading();

    try {
        const response = await apiCall('deleteProduct', { product_id: productId });
        hideLoading();

        if (response.success) {
            loadProducts();
            showToast('Product deleted', 'success');
        } else {
            showToast(response.error || 'Error deleting product', 'error');
        }
    } catch (error) {
        hideLoading();
        showToast('Connection error', 'error');
    }
}

// ============================================
// AREAS
// ============================================

async function loadAreas() {
    showLoading();

    try {
        const response = await apiCall('getAllAreas');
        hideLoading();

        if (response.success) {
            allAreas = response.areas || [];
            renderAreasTable(allAreas);
        }
    } catch (error) {
        hideLoading();
        console.error('Load areas error:', error);
    }
}

function renderAreasTable(areas) {
    const tbody = document.getElementById('areasTableBody');

    if (areas.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No areas found</td></tr>';
        return;
    }

    tbody.innerHTML = areas.map(area => `
        <tr>
            <td>${area.area_id}</td>
            <td>${area.area_name}</td>
            <td>${area.city || '-'}</td>
            <td>${area.state || '-'}</td>
            <td><span class="status ${area.status?.toLowerCase()}">${area.status}</span></td>
            <td class="actions">
                <button class="btn btn-sm btn-secondary" onclick="editArea('${area.area_id}')" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteArea('${area.area_id}')" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function filterAreas() {
    const search = document.getElementById('areaSearch').value.toLowerCase();
    const filtered = allAreas.filter(area => 
        area.area_name?.toLowerCase().includes(search) ||
        area.city?.toLowerCase().includes(search) ||
        area.state?.toLowerCase().includes(search)
    );
    renderAreasTable(filtered);
}

function openAreaModal(areaId = null) {
    const modal = document.getElementById('areaModal');
    const form = document.getElementById('areaForm');
    const title = document.getElementById('areaModalTitle');

    form.reset();
    document.getElementById('areaId').value = '';

    if (areaId) {
        title.textContent = 'Edit Area';
        const area = allAreas.find(a => a.area_id === areaId);
        if (area) {
            document.getElementById('areaId').value = area.area_id;
            document.getElementById('areaName').value = area.area_name || '';
            document.getElementById('areaCity').value = area.city || '';
            document.getElementById('areaState').value = area.state || '';
        }
    } else {
        title.textContent = 'Add Area';
    }

    modal.classList.add('active');
}

function editArea(areaId) {
    openAreaModal(areaId);
}

async function handleAreaSubmit(e) {
    e.preventDefault();
    showLoading();

    const areaId = document.getElementById('areaId').value;
    const data = {
        area_name: document.getElementById('areaName').value,
        city: document.getElementById('areaCity').value,
        state: document.getElementById('areaState').value
    };

    try {
        let response;
        if (areaId) {
            data.area_id = areaId;
            response = await apiCall('updateArea', data);
        } else {
            response = await apiCall('addArea', data);
        }

        hideLoading();

        if (response.success) {
            closeModal('areaModal');
            loadAreas();
            showToast(areaId ? 'Area updated' : 'Area added', 'success');
        } else {
            showToast(response.error || 'Error saving area', 'error');
        }
    } catch (error) {
        hideLoading();
        showToast('Connection error', 'error');
    }
}

async function deleteArea(areaId) {
    if (!confirm('Delete this area?')) return;

    showLoading();

    try {
        const response = await apiCall('deleteArea', { area_id: areaId });
        hideLoading();

        if (response.success) {
            loadAreas();
            showToast('Area deleted', 'success');
        } else {
            showToast(response.error || 'Error deleting area', 'error');
        }
    } catch (error) {
        hideLoading();
        showToast('Connection error', 'error');
    }
}
