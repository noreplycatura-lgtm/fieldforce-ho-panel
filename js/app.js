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
// CACHE & SYNC CONFIGURATION
// ============================================

const CACHE_KEYS = {
    EMPLOYEES: 'employees',
    CUSTOMERS: 'customers',
    STOCKISTS: 'stockists',
    PRODUCTS: 'products',
    AREAS: 'areas',
    PENDING_CUSTOMERS: 'pendingCustomers',
    PENDING_EXPENSES: 'pendingExpenses',
    ANNOUNCEMENTS: 'announcements',
    SETTINGS: 'settings',
    LAST_SYNC: 'lastSyncTime'
};

let isSyncing = false;
let lastSyncTime = null;

// ============================================
// LOCAL STORAGE CACHE FUNCTIONS
// ============================================

function saveToCache(key, data) {
    try {
        const cacheData = {
            data: data,
            timestamp: new Date().toISOString()
        };
        localStorage.setItem(`cache_${key}`, JSON.stringify(cacheData));
        console.log(`[Cache] Saved: ${key}`);
    } catch (error) {
        console.error(`[Cache] Error saving ${key}:`, error);
        // If localStorage is full, clear old data
        if (error.name === 'QuotaExceededError') {
            clearOldCache();
            localStorage.setItem(`cache_${key}`, JSON.stringify(cacheData));
        }
    }
}

function getFromCache(key) {
    try {
        const cached = localStorage.getItem(`cache_${key}`);
        if (cached) {
            const cacheData = JSON.parse(cached);
            console.log(`[Cache] Retrieved: ${key}`);
            return cacheData.data;
        }
    } catch (error) {
        console.error(`[Cache] Error reading ${key}:`, error);
    }
    return null;
}

function getCacheTimestamp(key) {
    try {
        const cached = localStorage.getItem(`cache_${key}`);
        if (cached) {
            const cacheData = JSON.parse(cached);
            return cacheData.timestamp;
        }
    } catch (error) {
        console.error(`[Cache] Error reading timestamp for ${key}:`, error);
    }
    return null;
}

function clearOldCache() {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
        if (key.startsWith('cache_')) {
            localStorage.removeItem(key);
        }
    });
    console.log('[Cache] Old cache cleared');
}

function clearAllCache() {
    clearOldCache();
    showToast('Cache cleared', 'success');
}

// ============================================
// BACKGROUND SYNC FUNCTIONS
// ============================================

async function syncAllData() {
    if (isSyncing) {
        console.log('[Sync] Already syncing...');
        return;
    }
    
    isSyncing = true;
    updateSyncStatus('syncing');
    console.log('[Sync] Starting full sync...');
    
    try {
        // Sync all data endpoints
        const syncTasks = [
            syncData('getAllEmployees', CACHE_KEYS.EMPLOYEES, (data) => { allEmployees = data.employees || []; }),
            syncData('getAllCustomersHO', CACHE_KEYS.CUSTOMERS, (data) => { allCustomers = data.customers || []; }),
            syncData('getAllStockistsHO', CACHE_KEYS.STOCKISTS, (data) => { allStockists = data.stockists || []; }),
            syncData('getAllProducts', CACHE_KEYS.PRODUCTS, (data) => { allProducts = data.products || []; }),
            syncData('getAllAreas', CACHE_KEYS.AREAS, (data) => { allAreas = data.areas || []; }),
            syncData('getAnnouncements', CACHE_KEYS.ANNOUNCEMENTS, (data) => { allAnnouncements = data.announcements || []; }),
            syncData('getSettings', CACHE_KEYS.SETTINGS, null)
        ];
        
        await Promise.all(syncTasks);
        
        // Update last sync time
        lastSyncTime = new Date().toISOString();
        saveToCache(CACHE_KEYS.LAST_SYNC, { timestamp: lastSyncTime });
        
        updateSyncStatus('success');
        console.log('[Sync] Full sync completed');
        
        return true;
    } catch (error) {
        console.error('[Sync] Sync failed:', error);
        updateSyncStatus('error');
        return false;
    } finally {
        isSyncing = false;
    }
}

async function syncData(action, cacheKey, callback) {
    try {
        const response = await apiCall(action);
        
        if (response.success) {
            saveToCache(cacheKey, response);
            if (callback) {
                callback(response);
            }
            console.log(`[Sync] ${cacheKey} synced`);
        }
    } catch (error) {
        console.error(`[Sync] Failed to sync ${cacheKey}:`, error);
        // Use cached data if available
        const cachedData = getFromCache(cacheKey);
        if (cachedData && callback) {
            callback(cachedData);
            console.log(`[Sync] Using cached data for ${cacheKey}`);
        }
    }
}

function updateSyncStatus(status) {
    const syncBtn = document.getElementById('refreshBtn');
    const syncIcon = syncBtn?.querySelector('i');
    
    if (!syncBtn || !syncIcon) return;
    
    switch (status) {
        case 'syncing':
            syncIcon.className = 'fas fa-sync-alt fa-spin';
            syncBtn.disabled = true;
            break;
        case 'success':
            syncIcon.className = 'fas fa-sync-alt';
            syncBtn.disabled = false;
            showToast('Data synced successfully', 'success');
            break;
        case 'error':
            syncIcon.className = 'fas fa-sync-alt';
            syncBtn.disabled = false;
            showToast('Sync failed. Using cached data.', 'error');
            break;
        default:
            syncIcon.className = 'fas fa-sync-alt';
            syncBtn.disabled = false;
    }
}

// Manual sync trigger
async function manualSync() {
    console.log('[Sync] Manual sync triggered');
    
    // Trigger service worker sync
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
            type: 'MANUAL_SYNC'
        });
    }
    
    // Also do immediate sync
    await syncAllData();
    refreshCurrentPage();
}

// Auto sync on visibility change
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        // Check if last sync was more than 5 minutes ago
        const lastSync = getFromCache(CACHE_KEYS.LAST_SYNC);
        if (lastSync) {
            const lastSyncDate = new Date(lastSync.timestamp);
            const now = new Date();
            const diffMinutes = (now - lastSyncDate) / (1000 * 60);
            
            if (diffMinutes > 5) {
                console.log('[Sync] Auto-syncing (last sync > 5 min ago)');
                syncAllData();
            }
        } else {
            syncAllData();
        }
    }
});

// ============================================
// LOAD DATA WITH CACHE FALLBACK
// ============================================

async function loadDataWithCache(action, cacheKey, callback) {
    // First, try to load from cache for instant display
    const cachedData = getFromCache(cacheKey);
    if (cachedData) {
        console.log(`[Cache] Showing cached data for ${cacheKey}`);
        if (callback) callback(cachedData);
    }
    
    // Then fetch fresh data in background
    try {
        const response = await apiCall(action);
        if (response.success) {
            saveToCache(cacheKey, response);
            if (callback) callback(response);
        }
    } catch (error) {
        console.error(`[API] Error fetching ${cacheKey}:`, error);
        if (!cachedData) {
            showToast('Failed to load data. Check your connection.', 'error');
        }
    }
}
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
    
    // Start background sync
    syncAllData();
    
    // Setup periodic sync (every 5 minutes)
    setInterval(() => {
        if (document.visibilityState === 'visible') {
            syncAllData();
        }
    }, 5 * 60 * 1000);
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
    document.getElementById('refreshBtn').addEventListener('click', manualSync);

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

// Track which pages are already loaded
let loadedPages = {};

function loadPageData(page) {
    console.log('[Page] Loading:', page);
    
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
            loadTransferPageData();
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
        const page = activePage.dataset.page;
        
        // Reset cache flags
        if (page === 'employees') employeesLoaded = false;
        if (page === 'customers') customersLoaded = false;
        
        // Force reload
        switch(page) {
            case 'employees':
                loadEmployees(true);
                break;
            case 'customers':
                loadPendingCustomers();
                loadAllCustomers(true);
                break;
            default:
                loadPageData(page);
        }
        
        showToast('Data refreshed', 'success');
    }
}

async function loadEmployeesForDropdown() {
    if (allEmployees.length === 0) {
        try {
            const response = await apiCall('getAllEmployees');
            if (response.success) {
                allEmployees = response.employees || [];
            }
        } catch (error) {
            console.error('Error loading employees for dropdown');
        }
    }
    
    const activeEmployees = allEmployees.filter(e => e.status === 'Active');
    
    // Transfer target dropdown
    const transferTarget = document.getElementById('transferTargetEmp');
    if (transferTarget) {
        transferTarget.innerHTML = '<option value="">-- Select Employee --</option>' + 
            activeEmployees.map(e => `<option value="${e.emp_id}">${e.emp_name} (${e.designation})</option>`).join('');
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
// EMPLOYEES - COMPLETE FIXED VERSION
// ============================================

async function loadEmployees() {
    showLoading();

    try {
        const response = await apiCall('getAllEmployees');
        hideLoading();

        if (response.success) {
            allEmployees = response.employees || [];
            console.log('[Employees] Loaded:', allEmployees.length, allEmployees);
            renderEmployeesTable(allEmployees);
            populateEmployeeDropdowns();
        } else {
            showToast('Failed to load employees', 'error');
        }
    } catch (error) {
        hideLoading();
        console.error('Load employees error:', error);
        showToast('Connection error', 'error');
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

async function openEmployeeModal(empId = null) {
    const modal = document.getElementById('employeeModal');
    const form = document.getElementById('employeeForm');
    const title = document.getElementById('employeeModalTitle');

    // Form reset
    form.reset();
    document.getElementById('empId').value = '';
    document.getElementById('empName').value = '';
    document.getElementById('empMobile').value = '';
    document.getElementById('empDesignation').value = '';
    document.getElementById('empReportingTo').value = '';
    document.getElementById('empEmail').value = '';
    document.getElementById('empAddress').value = '';
    document.getElementById('empEmergency').value = '';
    document.getElementById('empPassword').value = '';

    if (empId) {
        title.textContent = 'Edit Employee';
        console.log('[Edit] Looking for employee:', empId);
        console.log('[Edit] All employees:', allEmployees);
        
        // Agar allEmployees empty hai to pehle load karo
        if (!allEmployees || allEmployees.length === 0) {
            console.log('[Edit] Employees not loaded, fetching...');
            showLoading();
            try {
                const response = await apiCall('getAllEmployees');
                hideLoading();
                if (response.success) {
                    allEmployees = response.employees || [];
                    console.log('[Edit] Employees loaded:', allEmployees.length);
                }
            } catch (error) {
                hideLoading();
                showToast('Error loading employee data', 'error');
                return;
            }
        }
        
        // Ab employee dhundho
        const emp = allEmployees.find(e => e.emp_id === empId);
        console.log('[Edit] Found employee:', emp);
        
        if (!emp) {
            showToast('Employee not found: ' + empId, 'error');
            return;
        }
        
        // Fields fill karo
        document.getElementById('empId').value = emp.emp_id || '';
        document.getElementById('empName').value = emp.emp_name || '';
        document.getElementById('empMobile').value = emp.mobile || '';
        document.getElementById('empDesignation').value = emp.designation || '';
        document.getElementById('empReportingTo').value = emp.reporting_to || '';
        document.getElementById('empEmail').value = emp.email || '';
        document.getElementById('empAddress').value = emp.address || '';
        document.getElementById('empEmergency').value = emp.emergency_contact || '';
        // Password blank rakho security ke liye
        
        console.log('[Edit] Form filled successfully');
        
    } else {
        title.textContent = 'Add Employee';
    }

    modal.classList.add('active');
}

function editEmployee(empId) {
    console.log('[Edit] Button clicked for:', empId);
    openEmployeeModal(empId);
}
function fillEmployeeForm(emp) {
    document.getElementById('empId').value = emp.emp_id || '';
    document.getElementById('empName').value = emp.emp_name || '';
    document.getElementById('empMobile').value = emp.mobile || '';
    document.getElementById('empDesignation').value = emp.designation || '';
    document.getElementById('empReportingTo').value = emp.reporting_to || '';
    document.getElementById('empEmail').value = emp.email || '';
    document.getElementById('empAddress').value = emp.address || '';
    document.getElementById('empEmergency').value = emp.emergency_contact || '';
    document.getElementById('empPassword').value = ''; // Don't show password
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

// ============================================
// CUSTOMERS - FIXED VERSION WITH TRANSFER
// ============================================

let customersLoaded = false;

async function loadAllCustomers(forceReload = false) {
    if (customersLoaded && allCustomers.length > 0 && !forceReload) {
        console.log('[Customers] Using cached data');
        renderAllCustomers(allCustomers);
        return;
    }

    try {
        const response = await apiCall('getAllCustomersHO');
        
        if (response.success) {
            allCustomers = response.customers || [];
            customersLoaded = true;
            console.log('[Customers] Loaded:', allCustomers.length);
            renderAllCustomers(allCustomers);
        }
    } catch (error) {
        console.error('Load all customers error:', error);
    }
}

function renderAllCustomers(customers) {
    const tbody = document.getElementById('allCustomersBody');

    if (customers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center text-muted">No customers found</td></tr>';
        return;
    }

    tbody.innerHTML = customers.map(cust => `
        <tr>
            <td>
                <input type="checkbox" class="customer-select-checkbox" value="${cust.customer_id}" 
                    data-name="${cust.customer_name}" data-emp="${cust.created_by}">
            </td>
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
    
    // Update selected count
    updateSelectedCustomerCount();
}

function updateSelectedCustomerCount() {
    const selected = document.querySelectorAll('.customer-select-checkbox:checked').length;
    const countEl = document.getElementById('selectedCustomerCount');
    if (countEl) {
        countEl.textContent = selected;
    }
}

function selectAllCustomers(checkbox) {
    document.querySelectorAll('.customer-select-checkbox').forEach(cb => {
        cb.checked = checkbox.checked;
    });
    updateSelectedCustomerCount();
}

async function transferSelectedCustomers() {
    const targetEmpId = document.getElementById('transferTargetEmp').value;
    
    if (!targetEmpId) {
        showToast('Please select target employee', 'error');
        return;
    }
    
    const selectedCustomers = [];
    document.querySelectorAll('.customer-select-checkbox:checked').forEach(cb => {
        selectedCustomers.push(cb.value);
    });
    
    if (selectedCustomers.length === 0) {
        showToast('Please select at least one customer', 'error');
        return;
    }
    
    if (!confirm(`Transfer ${selectedCustomers.length} customer(s) to selected employee?`)) {
        return;
    }
    
    showLoading();
    
    try {
        const response = await apiCall('bulkTransferCustomers', {
            customer_ids: selectedCustomers,
            new_emp_id: targetEmpId
        });
        
        hideLoading();
        
        if (response.success) {
            showToast(`${selectedCustomers.length} customer(s) transferred successfully`, 'success');
            // Reload customers
            customersLoaded = false;
            loadAllCustomers(true);
            // Uncheck all
            document.querySelectorAll('.customer-select-checkbox').forEach(cb => {
                cb.checked = false;
            });
            updateSelectedCustomerCount();
        } else {
            showToast(response.error || 'Transfer failed', 'error');
        }
    } catch (error) {
        hideLoading();
        showToast('Connection error', 'error');
    }
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
    // Make sure employees are loaded
    if (allEmployees.length === 0) {
        try {
            const response = await apiCall('getAllEmployees');
            if (response.success) {
                allEmployees = response.employees || [];
            }
        } catch (error) {
            console.error('Error loading employees');
        }
    }
    
    // Make sure customers are loaded
    if (allCustomers.length === 0) {
        try {
            const response = await apiCall('getAllCustomersHO');
            if (response.success) {
                allCustomers = response.customers || [];
            }
        } catch (error) {
            console.error('Error loading customers');
        }
    }
    
    // Populate all dropdowns
    populateTransferDropdowns();
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
// ============================================
// EXPENSES
// ============================================

async function loadPendingExpenses() {
    try {
        const response = await apiCall('getPendingExpenses');
        
        if (response.success) {
            renderPendingExpenses(response.expenses || []);
        }
    } catch (error) {
        console.error('Load pending expenses error:', error);
    }
}

function renderPendingExpenses(expenses) {
    const tbody = document.getElementById('pendingExpensesBody');

    if (expenses.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No pending approvals</td></tr>';
        return;
    }

    tbody.innerHTML = expenses.map(exp => `
        <tr>
            <td>${exp.emp_name || exp.emp_id}</td>
            <td>${exp.designation || '-'}</td>
            <td>${getMonthName(exp.month)} ${exp.year}</td>
            <td>₹${formatNumber(exp.total_daily || 0)}</td>
            <td>₹${formatNumber(exp.total_fixed || 0)}</td>
            <td>₹${formatNumber(exp.grand_total || 0)}</td>
            <td class="actions">
                <button class="btn btn-sm btn-secondary" onclick="viewExpenseDetails('${exp.expense_id}')" title="View Details">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn-sm btn-success" onclick="approveExpense('${exp.expense_id}')" title="Approve">
                    <i class="fas fa-check"></i>
                </button>
                <button class="btn btn-sm btn-warning" onclick="openCounterModal('${exp.expense_id}', ${exp.grand_total})" title="Counter">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="rejectExpense('${exp.expense_id}')" title="Reject">
                    <i class="fas fa-times"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

async function viewExpenseDetails(expenseId) {
    showLoading();

    try {
        const response = await apiCall('getExpenseDetails', { expense_id: expenseId });
        hideLoading();

        if (response.success) {
            renderExpenseDetailModal(response);
        } else {
            showToast(response.error || 'Error loading details', 'error');
        }
    } catch (error) {
        hideLoading();
        showToast('Connection error', 'error');
    }
}

function renderExpenseDetailModal(data) {
    const modal = document.getElementById('expenseDetailModal');
    const content = document.getElementById('expenseDetailContent');
    const actions = document.getElementById('expenseDetailActions');

    const monthly = data.monthly;
    const daily = data.daily || [];
    const employee = data.employee;

    content.innerHTML = `
        <div class="expense-detail-header">
            <h4>${employee?.emp_name || 'Employee'} - ${employee?.designation || ''}</h4>
            <p>${getMonthName(monthly.month)} ${monthly.year}</p>
            <span class="status ${monthly.status?.toLowerCase()}">${monthly.status}</span>
        </div>

        <div class="expense-summary">
            <div class="summary-item">
                <span class="label">Mobile Allowance:</span>
                <span class="value">₹${formatNumber(monthly.mobile_allowance || 0)}</span>
            </div>
            <div class="summary-item">
                <span class="label">Misc Amount:</span>
                <span class="value">₹${formatNumber(monthly.misc_amount || 0)}</span>
            </div>
            <div class="summary-item">
                <span class="label">Misc Remarks:</span>
                <span class="value">${monthly.misc_remarks || '-'}</span>
            </div>
            <div class="summary-item">
                <span class="label">Total Fixed:</span>
                <span class="value">₹${formatNumber(monthly.total_fixed || 0)}</span>
            </div>
            <div class="summary-item">
                <span class="label">Total Daily:</span>
                <span class="value">₹${formatNumber(monthly.total_daily || 0)}</span>
            </div>
            <div class="summary-item highlight">
                <span class="label">Grand Total:</span>
                <span class="value">₹${formatNumber(monthly.grand_total || 0)}</span>
            </div>
        </div>

        <h5 style="margin: 16px 0 8px;">Daily Expenses</h5>
        <div class="table-container" style="max-height: 250px; overflow-y: auto;">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Day Type</th>
                        <th>KM</th>
                        <th>KM Fare</th>
                        <th>Allowance</th>
                        <th>Total</th>
                        <th>Remarks</th>
                    </tr>
                </thead>
                <tbody>
                    ${daily.length > 0 ? daily.map(d => `
                        <tr>
                            <td>${formatDisplayDate(d.date)}</td>
                            <td>${d.day_type || '-'}</td>
                            <td>${d.total_km || 0}</td>
                            <td>₹${d.km_fare || 0}</td>
                            <td>₹${d.allowance || 0}</td>
                            <td>₹${d.total_amount || 0}</td>
                            <td>${d.remarks || '-'}</td>
                        </tr>
                    `).join('') : '<tr><td colspan="7" class="text-center">No daily expenses</td></tr>'}
                </tbody>
            </table>
        </div>
    `;

    if (monthly.status === 'Submitted') {
        actions.innerHTML = `
            <button class="btn btn-secondary" onclick="closeModal('expenseDetailModal')">Close</button>
            <button class="btn btn-danger" onclick="rejectExpense('${monthly.expense_id}'); closeModal('expenseDetailModal');">Reject</button>
            <button class="btn btn-warning" onclick="closeModal('expenseDetailModal'); openCounterModal('${monthly.expense_id}', ${monthly.grand_total});">Counter</button>
            <button class="btn btn-success" onclick="approveExpense('${monthly.expense_id}'); closeModal('expenseDetailModal');">Approve</button>
        `;
    } else {
        actions.innerHTML = `<button class="btn btn-secondary" onclick="closeModal('expenseDetailModal')">Close</button>`;
    }

    modal.classList.add('active');
}

async function approveExpense(expenseId) {
    if (!confirm('Approve this expense?')) return;

    showLoading();

    try {
        const response = await apiCall('approveExpense', {
            expense_id: expenseId,
            approved_by: currentUser.User_Code
        });

        hideLoading();

        if (response.success) {
            loadPendingExpenses();
            loadDashboard();
            showToast('Expense approved', 'success');
        } else {
            showToast(response.error || 'Error approving expense', 'error');
        }
    } catch (error) {
        hideLoading();
        showToast('Connection error', 'error');
    }
}

async function rejectExpense(expenseId) {
    if (!confirm('Reject this expense?')) return;

    showLoading();

    try {
        const response = await apiCall('rejectExpense', {
            expense_id: expenseId,
            rejected_by: currentUser.User_Code
        });

        hideLoading();

        if (response.success) {
            loadPendingExpenses();
            loadDashboard();
            showToast('Expense rejected', 'success');
        } else {
            showToast(response.error || 'Error rejecting expense', 'error');
        }
    } catch (error) {
        hideLoading();
        showToast('Connection error', 'error');
    }
}

function openCounterModal(expenseId, originalAmt) {
    document.getElementById('counterExpenseId').value = expenseId;
    document.getElementById('counterOriginalAmt').value = '₹' + formatNumber(originalAmt);
    document.getElementById('counterNewAmt').value = '';
    document.getElementById('counterRemarks').value = '';
    document.getElementById('counterModal').classList.add('active');
}

async function handleCounterSubmit(e) {
    e.preventDefault();
    showLoading();

    const expenseId = document.getElementById('counterExpenseId').value;
    const newAmt = parseFloat(document.getElementById('counterNewAmt').value);
    const remarks = document.getElementById('counterRemarks').value;

    try {
        const response = await apiCall('counterExpense', {
            expense_id: expenseId,
            new_total: newAmt,
            remarks: remarks,
            countered_by: currentUser.User_Code
        });

        hideLoading();

        if (response.success) {
            closeModal('counterModal');
            loadPendingExpenses();
            showToast('Expense countered', 'success');
        } else {
            showToast(response.error || 'Error countering expense', 'error');
        }
    } catch (error) {
        hideLoading();
        showToast('Connection error', 'error');
    }
}

// ============================================
// HIERARCHY & MAPPING
// ============================================

async function loadHierarchy() {
    try {
        const response = await apiCall('getHierarchy');
        
        if (response.success) {
            renderHierarchyTree(response.hierarchy || []);
        }
    } catch (error) {
        console.error('Load hierarchy error:', error);
    }
}

function renderHierarchyTree(hierarchy) {
    const container = document.getElementById('hierarchyTree');

    if (hierarchy.length === 0) {
        container.innerHTML = '<p class="text-muted">No employees found</p>';
        return;
    }

    // Build tree structure
    const empMap = {};
    hierarchy.forEach(emp => {
        empMap[emp.emp_id] = { ...emp, children: [] };
    });

    const roots = [];
    hierarchy.forEach(emp => {
        if (emp.reporting_to && empMap[emp.reporting_to]) {
            empMap[emp.reporting_to].children.push(empMap[emp.emp_id]);
        } else {
            roots.push(empMap[emp.emp_id]);
        }
    });

    function renderNode(node, level = 0) {
        return `
            <div class="hierarchy-node" style="margin-left: ${level * 20}px;">
                <div class="hierarchy-node-content">
                    <i class="fas fa-user"></i>
                    <span>${node.emp_name}</span>
                    <span class="hierarchy-designation">${node.designation}</span>
                </div>
                ${node.children.length > 0 ? node.children.map(child => renderNode(child, level + 1)).join('') : ''}
            </div>
        `;
    }

    container.innerHTML = roots.map(root => renderNode(root)).join('');
}

async function loadEmployeesForMapping() {
    if (allEmployees.length === 0) {
        await loadEmployees();
    }
    populateEmployeeDropdowns();
}

async function loadAreasForMapping() {
    if (allAreas.length === 0) {
        await loadAreas();
    }
}

async function loadEmployeeAreas() {
    const empId = document.getElementById('mappingEmployee').value;
    const container = document.getElementById('mappingAreasList');

    if (!empId) {
        container.innerHTML = '<p class="text-muted">Select employee first</p>';
        return;
    }

    try {
        const response = await apiCall('getAreaMappings');
        
        if (response.success) {
            const mappings = response.mappings || [];
            const empMappings = mappings.filter(m => m.emp_id === empId).map(m => m.area_id);

            const activeAreas = allAreas.filter(a => a.status === 'Active');

            container.innerHTML = activeAreas.map(area => `
                <div class="checkbox-item">
                    <input type="checkbox" class="mapping-area-checkbox" value="${area.area_id}" 
                        id="area_${area.area_id}" ${empMappings.includes(area.area_id) ? 'checked' : ''}>
                    <label for="area_${area.area_id}">${area.area_name} (${area.city})</label>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Load employee areas error:', error);
    }
}

async function saveAreaMapping() {
    const empId = document.getElementById('mappingEmployee').value;
    
    if (!empId) {
        showToast('Please select an employee', 'error');
        return;
    }

    const selectedAreas = [];
    document.querySelectorAll('.mapping-area-checkbox:checked').forEach(cb => {
        selectedAreas.push(cb.value);
    });

    showLoading();

    try {
        const response = await apiCall('updateAreaMapping', {
            emp_id: empId,
            area_ids: selectedAreas
        });

        hideLoading();

        if (response.success) {
            showToast('Area mapping saved', 'success');
        } else {
            showToast(response.error || 'Error saving mapping', 'error');
        }
    } catch (error) {
        hideLoading();
        showToast('Connection error', 'error');
    }
}

// ============================================
// ANNOUNCEMENTS
// ============================================

async function loadAnnouncements() {
    showLoading();

    try {
        const response = await apiCall('getAnnouncements');
        hideLoading();

        if (response.success) {
            allAnnouncements = response.announcements || [];
            renderAnnouncements(allAnnouncements);
        }
    } catch (error) {
        hideLoading();
        console.error('Load announcements error:', error);
    }
}

function renderAnnouncements(announcements) {
    const container = document.getElementById('announcementsList');

    if (announcements.length === 0) {
        container.innerHTML = '<p class="text-muted text-center">No announcements</p>';
        return;
    }

    container.innerHTML = announcements.map(ann => `
        <div class="announcement-card ${ann.priority?.toLowerCase()}">
            <div class="announcement-header">
                <span class="announcement-title">${ann.title}</span>
                <span class="announcement-priority ${ann.priority?.toLowerCase()}">${ann.priority || 'Normal'}</span>
            </div>
            <p class="announcement-message">${ann.message}</p>
            <div class="announcement-footer">
                <span class="announcement-dates">
                    ${formatDisplayDate(ann.start_date)} - ${formatDisplayDate(ann.end_date)}
                </span>
                <div class="announcement-actions">
                    <button class="btn btn-sm btn-secondary" onclick="editAnnouncement('${ann.announcement_id}')" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteAnnouncement('${ann.announcement_id}')" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

function openAnnouncementModal(announcementId = null) {
    const modal = document.getElementById('announcementModal');
    const form = document.getElementById('announcementForm');
    const title = document.getElementById('announcementModalTitle');

    form.reset();
    document.getElementById('announcementId').value = '';

    if (announcementId) {
        title.textContent = 'Edit Announcement';
        const ann = allAnnouncements.find(a => a.announcement_id === announcementId);
        if (ann) {
            document.getElementById('announcementId').value = ann.announcement_id;
            document.getElementById('announcementTitle').value = ann.title || '';
            document.getElementById('announcementMessage').value = ann.message || '';
            document.getElementById('announcementPriority').value = ann.priority || 'Normal';
            document.getElementById('announcementStart').value = formatDateForInput(ann.start_date);
            document.getElementById('announcementEnd').value = formatDateForInput(ann.end_date);
        }
    } else {
        title.textContent = 'New Announcement';
        // Set default dates
        const today = new Date();
        const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
        document.getElementById('announcementStart').valueAsDate = today;
        document.getElementById('announcementEnd').valueAsDate = nextWeek;
    }

    modal.classList.add('active');
}

function editAnnouncement(announcementId) {
    openAnnouncementModal(announcementId);
}

async function handleAnnouncementSubmit(e) {
    e.preventDefault();
    showLoading();

    const announcementId = document.getElementById('announcementId').value;
    const data = {
        title: document.getElementById('announcementTitle').value,
        message: document.getElementById('announcementMessage').value,
        priority: document.getElementById('announcementPriority').value,
        start_date: document.getElementById('announcementStart').value,
        end_date: document.getElementById('announcementEnd').value,
        created_by: currentUser.User_Code
    };

    try {
        let response;
        if (announcementId) {
            data.announcement_id = announcementId;
            response = await apiCall('updateAnnouncement', data);
        } else {
            response = await apiCall('addAnnouncement', data);
        }

        hideLoading();

        if (response.success) {
            closeModal('announcementModal');
            loadAnnouncements();
            showToast(announcementId ? 'Announcement updated' : 'Announcement created', 'success');
        } else {
            showToast(response.error || 'Error saving announcement', 'error');
        }
    } catch (error) {
        hideLoading();
        showToast('Connection error', 'error');
    }
}

async function deleteAnnouncement(announcementId) {
    if (!confirm('Delete this announcement?')) return;

    showLoading();

    try {
        const response = await apiCall('deleteAnnouncement', { announcement_id: announcementId });
        hideLoading();

        if (response.success) {
            loadAnnouncements();
            showToast('Announcement deleted', 'success');
        } else {
            showToast(response.error || 'Error deleting announcement', 'error');
        }
    } catch (error) {
        hideLoading();
        showToast('Connection error', 'error');
    }
}

// ============================================
// REPORTS
// ============================================

async function generateReport() {
    const reportType = document.getElementById('reportType').value;
    const startDate = document.getElementById('reportStartDate').value;
    const endDate = document.getElementById('reportEndDate').value;

    if (!startDate || !endDate) {
        showToast('Please select date range', 'error');
        return;
    }

    showLoading();

    try {
        const response = await apiCall('getHOReports', {
            report_type: reportType,
            start_date: startDate,
            end_date: endDate
        });

        hideLoading();

        if (response.success) {
            renderReport(reportType, response.report || response.data || []);
        } else {
            showToast(response.error || 'Error generating report', 'error');
        }
    } catch (error) {
        hideLoading();
        showToast('Connection error', 'error');
    }
}

function renderReport(reportType, data) {
    const container = document.getElementById('reportContent');

    if (data.length === 0) {
        container.innerHTML = '<p class="text-muted text-center">No data found for selected criteria</p>';
        return;
    }

    let tableHTML = '';

    switch(reportType) {
        case 'daily_summary':
            tableHTML = `
                <table class="report-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Punches</th>
                            <th>Visits</th>
                            <th>Orders</th>
                            <th>POB (₹)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.map(row => `
                            <tr>
                                <td>${formatDisplayDate(row.date)}</td>
                                <td>${row.punches || 0}</td>
                                <td>${row.visits || 0}</td>
                                <td>${row.orders || 0}</td>
                                <td>₹${formatNumber(row.pob || 0)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                    <tfoot>
                        <tr>
                            <th>Total</th>
                            <th>${data.reduce((s, r) => s + (r.punches || 0), 0)}</th>
                            <th>${data.reduce((s, r) => s + (r.visits || 0), 0)}</th>
                            <th>${data.reduce((s, r) => s + (r.orders || 0), 0)}</th>
                            <th>₹${formatNumber(data.reduce((s, r) => s + (r.pob || 0), 0))}</th>
                        </tr>
                    </tfoot>
                </table>
            `;
            break;

        case 'employee_performance':
            tableHTML = `
                <table class="report-table">
                    <thead>
                        <tr>
                            <th>Employee</th>
                            <th>Designation</th>
                            <th>Total Calls</th>
                            <th>Productive</th>
                            <th>Productivity %</th>
                            <th>Total POB (₹)</th>
                            <th>Avg Order (₹)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.map(row => `
                            <tr>
                                <td>${row.emp_name}</td>
                                <td>${row.designation || '-'}</td>
                                <td>${row.total_calls || 0}</td>
                                <td>${row.productive_calls || 0}</td>
                                <td>${row.productivity || 0}%</td>
                                <td>₹${formatNumber(row.total_pob || 0)}</td>
                                <td>₹${formatNumber(row.avg_order_value || 0)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
            break;

        case 'area_wise':
            tableHTML = `
                <table class="report-table">
                    <thead>
                        <tr>
                            <th>Area</th>
                            <th>City</th>
                            <th>Total Calls</th>
                            <th>Productive</th>
                            <th>Total POB (₹)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.map(row => `
                            <tr>
                                <td>${row.area_name}</td>
                                <td>${row.city || '-'}</td>
                                <td>${row.total_calls || 0}</td>
                                <td>${row.productive_calls || 0}</td>
                                <td>₹${formatNumber(row.total_pob || 0)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
            break;

        case 'product_wise':
            tableHTML = `
                <table class="report-table">
                    <thead>
                        <tr>
                            <th>Product</th>
                            <th>Orders Count</th>
                            <th>Total Qty</th>
                            <th>Total Amount (₹)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.map(row => `
                            <tr>
                                <td>${row.product_name}</td>
                                <td>${row.order_count || 0}</td>
                                <td>${row.total_quantity || 0}</td>
                                <td>₹${formatNumber(row.total_amount || 0)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
            break;

        case 'stockist_wise':
            tableHTML = `
                <table class="report-table">
                    <thead>
                        <tr>
                            <th>Stockist</th>
                            <th>City</th>
                            <th>Total Orders</th>
                            <th>Total Amount (₹)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.map(row => `
                            <tr>
                                <td>${row.stockist_name}</td>
                                <td>${row.city || '-'}</td>
                                <td>${row.total_orders || 0}</td>
                                <td>₹${formatNumber(row.total_amount || 0)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
            break;
    }

    container.innerHTML = tableHTML;
}

function exportReport(format) {
    const content = document.getElementById('reportContent');
    const table = content.querySelector('table');

    if (!table) {
        showToast('Generate report first', 'error');
        return;
    }

    if (format === 'excel') {
        exportToExcel(table);
    } else if (format === 'pdf') {
        exportToPDF(table);
    }
}

function exportToExcel(table) {
    let csv = '';
    const rows = table.querySelectorAll('tr');

    rows.forEach(row => {
        const cells = row.querySelectorAll('th, td');
        const rowData = [];
        cells.forEach(cell => {
            let text = cell.textContent.replace(/"/g, '""');
            rowData.push(`"${text}"`);
        });
        csv += rowData.join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `report_${formatDate(new Date())}.csv`;
    link.click();

    showToast('Report exported to CSV', 'success');
}

function exportToPDF(table) {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
        <head>
            <title>Report</title>
            <style>
                body { font-family: Arial, sans-serif; font-size: 12px; padding: 20px; }
                table { width: 100%; border-collapse: collapse; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background: #f5f5f5; }
                h1 { font-size: 16px; margin-bottom: 10px; }
            </style>
        </head>
        <body>
            <h1>Report - ${new Date().toLocaleDateString()}</h1>
            ${table.outerHTML}
        </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();

    showToast('Print dialog opened', 'success');
}

// ============================================
// SETTINGS
// ============================================

async function loadSettings() {
    showLoading();

    try {
        const response = await apiCall('getSettings');
        hideLoading();

        if (response.success) {
            const settings = response.settings || [];
            settings.forEach(setting => {
                const input = document.getElementById('setting_' + setting.setting_name);
                if (input) {
                    input.value = setting.setting_value;
                }
            });
        }
    } catch (error) {
        hideLoading();
        console.error('Load settings error:', error);
    }
}

async function saveSettings() {
    showLoading();

    const settings = {
        default_radius: document.getElementById('setting_default_radius').value,
        max_radius: document.getElementById('setting_max_radius').value,
        hq_allowance: document.getElementById('setting_hq_allowance').value,
        ex_hq_allowance: document.getElementById('setting_ex_hq_allowance').value,
        outstation_allowance: document.getElementById('setting_outstation_allowance').value,
        km_rate: document.getElementById('setting_km_rate').value,
        mobile_allowance: document.getElementById('setting_mobile_allowance').value,
        photo_max_size: document.getElementById('setting_photo_max_size').value
    };

    try {
        const response = await apiCall('updateSettings', { settings: settings });
        hideLoading();

        if (response.success) {
            showToast('Settings saved', 'success');
        } else {
            showToast(response.error || 'Error saving settings', 'error');
        }
    } catch (error) {
        hideLoading();
        showToast('Connection error', 'error');
    }
}

async function createBackup() {
    if (!confirm('Create a backup of all data?')) return;

    showLoading();

    try {
        const response = await apiCall('createBackup');
        hideLoading();

        if (response.success) {
            showToast(response.message || 'Backup created', 'success');
        } else {
            showToast(response.error || 'Error creating backup', 'error');
        }
    } catch (error) {
        hideLoading();
        showToast('Connection error', 'error');
    }
}

// ============================================
// BULK UPLOAD
// ============================================

function openBulkUploadModal(type) {
    currentBulkUploadType = type;
    const modal = document.getElementById('bulkUploadModal');
    const title = document.getElementById('bulkUploadTitle');
    const format = document.getElementById('bulkUploadFormat');
    const downloadBtn = document.getElementById('downloadTemplateBtn');

    title.textContent = `Bulk Upload ${type.charAt(0).toUpperCase() + type.slice(1)}`;

    if (type === 'employees') {
        format.textContent = 'emp_name, mobile, designation, reporting_to, email, password';
    } else if (type === 'products') {
        format.textContent = 'product_name, product_code, category, unit, mrp, pts, ptr';
    }

    // Update download button
    downloadBtn.onclick = function() {
        downloadTemplate(type);
    };

    document.getElementById('bulkUploadFile').value = '';
    document.getElementById('bulkUploadPreview').classList.add('hidden');

    modal.classList.add('active');
}
function previewBulkUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
        const text = event.target.result;
        const lines = text.split('\n').slice(0, 6); // First 5 data rows + header

        const preview = document.getElementById('bulkUploadPreview');
        preview.innerHTML = '<strong>Preview (first 5 rows):</strong><br><pre>' + lines.join('\n') + '</pre>';
        preview.classList.remove('hidden');
    };
    reader.readAsText(file);
}

async function processBulkUpload() {
    const fileInput = document.getElementById('bulkUploadFile');
    const file = fileInput.files[0];

    if (!file) {
        showToast('Please select a file', 'error');
        return;
    }

    showLoading();

    const reader = new FileReader();
    reader.onload = async function(event) {
        const text = event.target.result;
        const lines = text.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
            hideLoading();
            showToast('File is empty or invalid', 'error');
            return;
        }

        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const data = [];

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim());
            const row = {};
            headers.forEach((header, index) => {
                row[header] = values[index] || '';
            });
            data.push(row);
        }

        try {
            let response;
            if (currentBulkUploadType === 'employees') {
                response = await apiCall('bulkUploadEmployees', { employees: data });
            } else if (currentBulkUploadType === 'products') {
                response = await apiCall('bulkUploadProducts', { products: data });
            }

            hideLoading();

            if (response.success) {
                closeModal('bulkUploadModal');
                if (currentBulkUploadType === 'employees') {
                    loadEmployees();
                } else if (currentBulkUploadType === 'products') {
                    loadProducts();
                }
                showToast(response.message || 'Upload successful', 'success');
            } else {
                showToast(response.error || 'Upload failed', 'error');
            }
        } catch (error) {
            hideLoading();
            showToast('Connection error', 'error');
        }
    };

    reader.readAsText(file);
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function showLoading() {
    document.getElementById('loadingOverlay').classList.remove('hidden');
}

function hideLoading() {
    document.getElementById('loadingOverlay').classList.add('hidden');
}

function showToast(message, type = '') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');

    toast.className = 'toast';
    if (type) toast.classList.add(type);

    toastMessage.textContent = message;
    toast.classList.remove('hidden');

    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

function formatNumber(num) {
    if (num === null || num === undefined) return '0';
    return Number(num).toLocaleString('en-IN');
}

function formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    return d.toISOString().split('T')[0];
}

function formatDisplayDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateForInput(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toISOString().split('T')[0];
}

function getMonthName(month) {
    const months = ['', 'January', 'February', 'March', 'April', 'May', 'June', 
                    'July', 'August', 'September', 'October', 'November', 'December'];
    return months[parseInt(month)] || month;
}
// ============================================
// BULK UPLOAD TEMPLATE FUNCTIONS
// ============================================

function downloadTemplate(type) {
    let csvContent = '';
    let filename = '';
    
    switch(type) {
        case 'employees':
            csvContent = 'emp_name,mobile,designation,reporting_to,email,password\n';
            csvContent += 'John Doe,9876543210,SR,EMP001,john@email.com,123456\n';
            csvContent += 'Jane Smith,9876543211,SO,EMP002,jane@email.com,123456\n';
            filename = 'employee_upload_template.csv';
            break;
            
        case 'products':
            csvContent = 'product_name,product_code,category,unit,mrp,pts,ptr\n';
            csvContent += 'Product A,PROD001,Category1,Pcs,100,90,85\n';
            csvContent += 'Product B,PROD002,Category2,Box,200,180,170\n';
            filename = 'product_upload_template.csv';
            break;
            
        case 'customer_transfer':
            csvContent = 'customer_id,new_emp_id\n';
            csvContent += 'CUST001,EMP002\n';
            csvContent += 'CUST002,EMP003\n';
            filename = 'customer_transfer_template.csv';
            break;
    }
    
    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast('Template downloaded', 'success');
}

// ============================================
// BULK CUSTOMER TRANSFER BY FILE UPLOAD
// ============================================

async function bulkTransferByFile() {
    const fileInput = document.getElementById('transferFileInput');
    const file = fileInput?.files[0];
    
    if (!file) {
        showToast('Please select a CSV file', 'error');
        return;
    }
    
    showLoading();
    
    const reader = new FileReader();
    reader.onload = async function(event) {
        const text = event.target.result;
        const lines = text.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
            hideLoading();
            showToast('File is empty or invalid', 'error');
            return;
        }
        
        let transferred = 0;
        let failed = 0;
        
        // Skip header row
        for (let i = 1; i < lines.length; i++) {
            const [customerId, newEmpId] = lines[i].split(',').map(v => v.trim());
            
            if (customerId && newEmpId) {
                try {
                    const response = await apiCall('transferCustomer', {
                        customer_id: customerId,
                        new_emp_id: newEmpId
                    });
                    
                    if (response.success) {
                        transferred++;
                    } else {
                        failed++;
                    }
                } catch (error) {
                    failed++;
                }
            }
        }
        
        hideLoading();
        showToast(`Transferred: ${transferred}, Failed: ${failed}`, transferred > 0 ? 'success' : 'error');
        loadAllCustomers();
    };
    
    reader.readAsText(file);
}
// ============================================
// CUSTOMER TRANSFER BY EXCEL TEMPLATE
// ============================================

// Update customer count when employee selected
function updateCustomerCount() {
    const empId = document.getElementById('downloadEmpSelect').value;
    const countInput = document.getElementById('empCustomerCount');
    
    if (!empId) {
        countInput.value = '0';
        return;
    }
    
    const empCustomers = allCustomers.filter(c => 
        c.created_by === empId && c.status === 'Approved'
    );
    
    countInput.value = empCustomers.length;
}

// Download customer template for selected employee
function downloadCustomerTemplate() {
    const empId = document.getElementById('downloadEmpSelect').value;
    
    if (!empId) {
        showToast('Please select an employee first', 'error');
        return;
    }
    
    const empCustomers = allCustomers.filter(c => 
        c.created_by === empId && c.status === 'Approved'
    );
    
    if (empCustomers.length === 0) {
        showToast('No customers found for this employee', 'error');
        return;
    }
    
    // Get employee name
    const emp = allEmployees.find(e => e.emp_id === empId);
    const empName = emp ? emp.emp_name : empId;
    
    // Create CSV content
    let csvContent = 'customer_id,customer_name,specialty,mobile,current_emp_id,current_emp_name,new_emp_id\n';
    
    empCustomers.forEach(cust => {
        csvContent += `${cust.customer_id},${cust.customer_name || ''},${cust.specialty || ''},${cust.mobile || ''},${empId},${empName},\n`;
    });
    
    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const fileName = `customer_transfer_${empName.replace(/\s+/g, '_')}_${formatDate(new Date())}.csv`;
    
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast(`Downloaded ${empCustomers.length} customers`, 'success');
}

// Preview transfer file before upload
function previewTransferFile() {
    const fileInput = document.getElementById('transferUploadFile');
    const file = fileInput.files[0];
    const previewDiv = document.getElementById('transferPreview');
    const uploadBtn = document.getElementById('uploadTransferBtn');
    
    if (!file) {
        previewDiv.classList.add('hidden');
        uploadBtn.disabled = true;
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(event) {
        const text = event.target.result;
        const lines = text.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
            previewDiv.innerHTML = '<p class="text-muted">File is empty or invalid</p>';
            previewDiv.classList.remove('hidden');
            uploadBtn.disabled = true;
            return;
        }
        
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const newEmpIdIndex = headers.indexOf('new_emp_id');
        const customerIdIndex = headers.indexOf('customer_id');
        const customerNameIndex = headers.indexOf('customer_name');
        
        if (customerIdIndex === -1 || newEmpIdIndex === -1) {
            previewDiv.innerHTML = '<p style="color: var(--danger);">Invalid file format. Required columns: customer_id, new_emp_id</p>';
            previewDiv.classList.remove('hidden');
            uploadBtn.disabled = true;
            return;
        }
        
        // Parse and preview
        let validCount = 0;
        let skipCount = 0;
        let previewHTML = '<h5>Preview (first 10 rows)</h5>';
        previewHTML += '<table><thead><tr><th>Customer ID</th><th>Customer Name</th><th>New Emp ID</th><th>Status</th></tr></thead><tbody>';
        
        const maxPreview = Math.min(lines.length, 11); // Header + 10 rows
        
        for (let i = 1; i < maxPreview; i++) {
            const values = lines[i].split(',').map(v => v.trim());
            const customerId = values[customerIdIndex] || '';
            const customerName = values[customerNameIndex] || '';
            const newEmpId = values[newEmpIdIndex] || '';
            
            if (newEmpId && newEmpId.length > 0) {
                validCount++;
                previewHTML += `<tr class="preview-row-valid">
                    <td>${customerId}</td>
                    <td>${customerName}</td>
                    <td>${newEmpId}</td>
                    <td><span class="status approved">Will Transfer</span></td>
                </tr>`;
            } else {
                skipCount++;
                previewHTML += `<tr class="preview-row-skip">
                    <td>${customerId}</td>
                    <td>${customerName}</td>
                    <td>-</td>
                    <td><span class="status pending">Skip</span></td>
                </tr>`;
            }
        }
        
        // Count all rows (not just preview)
        for (let i = 11; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim());
            const newEmpId = values[newEmpIdIndex] || '';
            if (newEmpId && newEmpId.length > 0) {
                validCount++;
            } else {
                skipCount++;
            }
        }
        
        previewHTML += '</tbody></table>';
        previewHTML += `<div class="transfer-stats">
            <span class="valid"><i class="fas fa-check"></i> To Transfer: ${validCount}</span>
            <span class="skip"><i class="fas fa-minus"></i> Will Skip: ${skipCount}</span>
        </div>`;
        
        previewDiv.innerHTML = previewHTML;
        previewDiv.classList.remove('hidden');
        uploadBtn.disabled = validCount === 0;
    };
    
    reader.readAsText(file);
}

// Process and upload transfer file
async function processTransferUpload() {
    const fileInput = document.getElementById('transferUploadFile');
    const file = fileInput.files[0];
    
    if (!file) {
        showToast('Please select a file', 'error');
        return;
    }
    
    if (!confirm('Are you sure you want to transfer customers as per the uploaded file?')) {
        return;
    }
    
    showLoading();
    
    const reader = new FileReader();
    reader.onload = async function(event) {
        const text = event.target.result;
        const lines = text.split('\n').filter(line => line.trim());
        
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const newEmpIdIndex = headers.indexOf('new_emp_id');
        const customerIdIndex = headers.indexOf('customer_id');
        
        let successCount = 0;
        let failCount = 0;
        const errors = [];
        
        // Process each row
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim());
            const customerId = values[customerIdIndex] || '';
            const newEmpId = values[newEmpIdIndex] || '';
            
            // Skip if no new_emp_id
            if (!newEmpId || newEmpId.length === 0) {
                continue;
            }
            
            // Validate customer exists
            const customer = allCustomers.find(c => c.customer_id === customerId);
            if (!customer) {
                failCount++;
                errors.push(`Row ${i + 1}: Customer ${customerId} not found`);
                continue;
            }
            
            // Validate new employee exists
            const newEmp = allEmployees.find(e => e.emp_id === newEmpId);
            if (!newEmp) {
                failCount++;
                errors.push(`Row ${i + 1}: Employee ${newEmpId} not found`);
                continue;
            }
            
            // Transfer customer
            try {
                const response = await apiCall('transferCustomer', {
                    customer_id: customerId,
                    new_emp_id: newEmpId
                });
                
                if (response.success) {
                    successCount++;
                } else {
                    failCount++;
                    errors.push(`Row ${i + 1}: ${response.error || 'Transfer failed'}`);
                }
            } catch (error) {
                failCount++;
                errors.push(`Row ${i + 1}: Connection error`);
            }
        }
        
        hideLoading();
        
        // Show results
        let message = `Transferred: ${successCount}`;
        if (failCount > 0) {
            message += `, Failed: ${failCount}`;
            console.log('Transfer errors:', errors);
        }
        
        showToast(message, successCount > 0 ? 'success' : 'error');
        
        // Reset form
        fileInput.value = '';
        document.getElementById('transferPreview').classList.add('hidden');
        document.getElementById('uploadTransferBtn').disabled = true;
        
        // Reload customers
        customersLoaded = false;
        loadAllCustomers(true);
    };
    
    reader.readAsText(file);
}

// Download employee list for reference
function downloadEmployeeList() {
    if (allEmployees.length === 0) {
        showToast('No employees loaded', 'error');
        return;
    }
    
    let csvContent = 'emp_id,emp_name,designation,mobile,status\n';
    
    allEmployees.filter(e => e.status === 'Active').forEach(emp => {
        csvContent += `${emp.emp_id},${emp.emp_name || ''},${emp.designation || ''},${emp.mobile || ''},${emp.status || ''}\n`;
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `employee_list_${formatDate(new Date())}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast('Employee list downloaded', 'success');
}

// Load employee reference table
function loadEmployeeReferenceTable() {
    const tbody = document.getElementById('empReferenceBody');
    
    if (!tbody) return;
    
    if (allEmployees.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center">No employees loaded</td></tr>';
        return;
    }
    
    const activeEmps = allEmployees.filter(e => e.status === 'Active');
    
    tbody.innerHTML = activeEmps.map(emp => `
        <tr>
            <td><strong>${emp.emp_id}</strong></td>
            <td>${emp.emp_name}</td>
            <td>${emp.designation || '-'}</td>
            <td><span class="status active">${emp.status}</span></td>
        </tr>
    `).join('');
}

// Populate download employee dropdown
function populateTransferDropdowns() {
    const downloadSelect = document.getElementById('downloadEmpSelect');
    const fromSelect = document.getElementById('transferFromEmp');
    const toSelect = document.getElementById('transferToEmp');
    
    if (!downloadSelect || !fromSelect || !toSelect) return;
    
    const activeEmployees = allEmployees.filter(e => e.status === 'Active');
    
    const optionsHTML = '<option value="">-- Select Employee --</option>' + 
        activeEmployees.map(e => `<option value="${e.emp_id}">${e.emp_name} (${e.designation})</option>`).join('');
    
    downloadSelect.innerHTML = optionsHTML;
    fromSelect.innerHTML = optionsHTML;
    toSelect.innerHTML = optionsHTML;
    
    // Load reference table
    loadEmployeeReferenceTable();
}
// ============================================
// CUSTOMER TRANSFER - COMPLETE FUNCTIONS
// ============================================

async function loadTransferPageData() {
    console.log('[Transfer] Loading transfer page data...');
    
    // Load employees if not loaded
    if (!allEmployees || allEmployees.length === 0) {
        try {
            const response = await apiCall('getAllEmployees');
            if (response.success) {
                allEmployees = response.employees || [];
                console.log('[Transfer] Employees loaded:', allEmployees.length);
            }
        } catch (error) {
            console.error('[Transfer] Error loading employees:', error);
        }
    }
    
    // Load customers if not loaded
    if (!allCustomers || allCustomers.length === 0) {
        try {
            const response = await apiCall('getAllCustomersHO');
            if (response.success) {
                allCustomers = response.customers || [];
                console.log('[Transfer] Customers loaded:', allCustomers.length);
            }
        } catch (error) {
            console.error('[Transfer] Error loading customers:', error);
        }
    }
    
    // Populate dropdowns
    populateAllTransferDropdowns();
}

function populateAllTransferDropdowns() {
    console.log('[Transfer] Populating dropdowns...');
    
    const activeEmployees = allEmployees.filter(e => e.status === 'Active');
    console.log('[Transfer] Active employees:', activeEmployees.length);
    
    const optionsHTML = '<option value="">-- Select Employee --</option>' + 
        activeEmployees.map(e => `<option value="${e.emp_id}">${e.emp_name} (${e.designation || ''})</option>`).join('');
    
    // Download template dropdown
    const downloadSelect = document.getElementById('downloadEmpSelect');
    if (downloadSelect) {
        downloadSelect.innerHTML = optionsHTML;
        console.log('[Transfer] downloadEmpSelect populated');
    }
    
    // From employee dropdown
    const fromSelect = document.getElementById('transferFromEmp');
    if (fromSelect) {
        fromSelect.innerHTML = optionsHTML;
        console.log('[Transfer] transferFromEmp populated');
    }
    
    // To employee dropdown
    const toSelect = document.getElementById('transferToEmp');
    if (toSelect) {
        toSelect.innerHTML = optionsHTML;
        console.log('[Transfer] transferToEmp populated');
    }
    
    // Employee reference table
    loadEmployeeReferenceTable();
}

function updateCustomerCount() {
    const empId = document.getElementById('downloadEmpSelect')?.value;
    const countInput = document.getElementById('empCustomerCount');
    
    if (!countInput) return;
    
    if (!empId) {
        countInput.value = '0';
        return;
    }
    
    const empCustomers = allCustomers.filter(c => 
        c.created_by === empId && c.status === 'Approved'
    );
    
    countInput.value = empCustomers.length;
    console.log('[Transfer] Customer count for', empId, ':', empCustomers.length);
}

function downloadCustomerTemplate() {
    const empId = document.getElementById('downloadEmpSelect')?.value;
    
    if (!empId) {
        showToast('Please select an employee first', 'error');
        return;
    }
    
    const empCustomers = allCustomers.filter(c => 
        c.created_by === empId && c.status === 'Approved'
    );
    
    if (empCustomers.length === 0) {
        showToast('No customers found for this employee', 'error');
        return;
    }
    
    // Get employee name
    const emp = allEmployees.find(e => e.emp_id === empId);
    const empName = emp ? emp.emp_name : empId;
    
    // Create CSV content
    let csvContent = 'customer_id,customer_name,specialty,mobile,current_emp_id,current_emp_name,new_emp_id\n';
    
    empCustomers.forEach(cust => {
        const name = (cust.customer_name || '').replace(/,/g, ' ');
        const specialty = (cust.specialty || '').replace(/,/g, ' ');
        csvContent += `${cust.customer_id},${name},${specialty},${cust.mobile || ''},${empId},${empName},\n`;
    });
    
    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const today = new Date().toISOString().split('T')[0];
    const fileName = `customer_transfer_${empName.replace(/\s+/g, '_')}_${today}.csv`;
    
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast(`Downloaded ${empCustomers.length} customers`, 'success');
}

function previewTransferFile() {
    const fileInput = document.getElementById('transferUploadFile');
    const file = fileInput?.files[0];
    const previewDiv = document.getElementById('transferPreview');
    const uploadBtn = document.getElementById('uploadTransferBtn');
    
    if (!file) {
        if (previewDiv) previewDiv.classList.add('hidden');
        if (uploadBtn) uploadBtn.disabled = true;
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(event) {
        const text = event.target.result;
        const lines = text.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
            previewDiv.innerHTML = '<p class="text-muted">File is empty or invalid</p>';
            previewDiv.classList.remove('hidden');
            uploadBtn.disabled = true;
            return;
        }
        
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const newEmpIdIndex = headers.indexOf('new_emp_id');
        const customerIdIndex = headers.indexOf('customer_id');
        const customerNameIndex = headers.indexOf('customer_name');
        
        if (customerIdIndex === -1 || newEmpIdIndex === -1) {
            previewDiv.innerHTML = '<p style="color: red;">Invalid file. Required columns: customer_id, new_emp_id</p>';
            previewDiv.classList.remove('hidden');
            uploadBtn.disabled = true;
            return;
        }
        
        let validCount = 0;
        let skipCount = 0;
        let previewHTML = '<h5>Preview:</h5><table><thead><tr><th>Customer ID</th><th>Name</th><th>New Emp ID</th><th>Status</th></tr></thead><tbody>';
        
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim());
            const customerId = values[customerIdIndex] || '';
            const customerName = values[customerNameIndex] || '';
            const newEmpId = values[newEmpIdIndex] || '';
            
            if (newEmpId && newEmpId.length > 0) {
                validCount++;
                if (i <= 10) {
                    previewHTML += `<tr style="background: rgba(16,185,129,0.1);">
                        <td>${customerId}</td><td>${customerName}</td><td>${newEmpId}</td>
                        <td><span class="status approved">Transfer</span></td>
                    </tr>`;
                }
            } else {
                skipCount++;
                if (i <= 10) {
                    previewHTML += `<tr style="background: #f5f5f5; color: #999;">
                        <td>${customerId}</td><td>${customerName}</td><td>-</td>
                        <td><span class="status pending">Skip</span></td>
                    </tr>`;
                }
            }
        }
        
        previewHTML += '</tbody></table>';
        previewHTML += `<p style="margin-top:10px;"><strong>To Transfer: ${validCount}</strong> | Skip: ${skipCount}</p>`;
        
        previewDiv.innerHTML = previewHTML;
        previewDiv.classList.remove('hidden');
        uploadBtn.disabled = validCount === 0;
    };
    
    reader.readAsText(file);
}

async function processTransferUpload() {
    const fileInput = document.getElementById('transferUploadFile');
    const file = fileInput?.files[0];
    
    if (!file) {
        showToast('Please select a file', 'error');
        return;
    }
    
    if (!confirm('Transfer customers as per the uploaded file?')) {
        return;
    }
    
    showLoading();
    
    const reader = new FileReader();
    reader.onload = async function(event) {
        const text = event.target.result;
        const lines = text.split('\n').filter(line => line.trim());
        
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const newEmpIdIndex = headers.indexOf('new_emp_id');
        const customerIdIndex = headers.indexOf('customer_id');
        
        let successCount = 0;
        let failCount = 0;
        
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim());
            const customerId = values[customerIdIndex] || '';
            const newEmpId = values[newEmpIdIndex] || '';
            
            if (!newEmpId || newEmpId.length === 0) continue;
            
            try {
                const response = await apiCall('transferCustomer', {
                    customer_id: customerId,
                    new_emp_id: newEmpId
                });
                
                if (response.success) {
                    successCount++;
                } else {
                    failCount++;
                }
            } catch (error) {
                failCount++;
            }
        }
        
        hideLoading();
        showToast(`Transferred: ${successCount}, Failed: ${failCount}`, successCount > 0 ? 'success' : 'error');
        
        // Reset
        fileInput.value = '';
        document.getElementById('transferPreview').classList.add('hidden');
        document.getElementById('uploadTransferBtn').disabled = true;
        
        // Reload
        loadAllCustomers();
    };
    
    reader.readAsText(file);
}

function downloadEmployeeList() {
    if (allEmployees.length === 0) {
        showToast('No employees loaded', 'error');
        return;
    }
    
    let csvContent = 'emp_id,emp_name,designation,mobile,status\n';
    
    allEmployees.filter(e => e.status === 'Active').forEach(emp => {
        csvContent += `${emp.emp_id},${emp.emp_name || ''},${emp.designation || ''},${emp.mobile || ''},${emp.status || ''}\n`;
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `employee_list.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast('Employee list downloaded', 'success');
}

function loadEmployeeReferenceTable() {
    const tbody = document.getElementById('empReferenceBody');
    if (!tbody) return;
    
    const activeEmps = allEmployees.filter(e => e.status === 'Active');
    
    if (activeEmps.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center">No employees</td></tr>';
        return;
    }
    
    tbody.innerHTML = activeEmps.map(emp => `
        <tr>
            <td><strong>${emp.emp_id}</strong></td>
            <td>${emp.emp_name || ''}</td>
            <td>${emp.designation || '-'}</td>
            <td><span class="status active">${emp.status}</span></td>
        </tr>
    `).join('');
}

async function loadTransferCustomers() {
    const fromEmpId = document.getElementById('transferFromEmp')?.value;
    const container = document.getElementById('transferCustomersList');
    
    if (!container) return;
    
    if (!fromEmpId) {
        container.innerHTML = '<p class="text-muted">Select "From Employee" first</p>';
        return;
    }
    
    const empCustomers = allCustomers.filter(c => c.created_by === fromEmpId && c.status === 'Approved');
    
    if (empCustomers.length === 0) {
        container.innerHTML = '<p class="text-muted">No customers found</p>';
        return;
    }
    
    container.innerHTML = `
        <div class="checkbox-item">
            <input type="checkbox" id="selectAllTransfer" onchange="toggleSelectAllTransfer(this)">
            <label for="selectAllTransfer"><strong>Select All (${empCustomers.length})</strong></label>
        </div>
    ` + empCustomers.map(cust => `
        <div class="checkbox-item">
            <input type="checkbox" class="transfer-cust-cb" value="${cust.customer_id}" id="tc_${cust.customer_id}">
            <label for="tc_${cust.customer_id}">${cust.customer_name} (${cust.customer_code || cust.customer_id})</label>
        </div>
    `).join('');
}

function toggleSelectAllTransfer(checkbox) {
    document.querySelectorAll('.transfer-cust-cb').forEach(cb => {
        cb.checked = checkbox.checked;
    });
}

async function bulkTransferCustomers() {
    const toEmpId = document.getElementById('transferToEmp')?.value;
    
    if (!toEmpId) {
        showToast('Select target employee', 'error');
        return;
    }
    
    const selected = [];
    document.querySelectorAll('.transfer-cust-cb:checked').forEach(cb => {
        selected.push(cb.value);
    });
    
    if (selected.length === 0) {
        showToast('Select at least one customer', 'error');
        return;
    }
    
    if (!confirm(`Transfer ${selected.length} customer(s)?`)) return;
    
    showLoading();
    
    try {
        const response = await apiCall('bulkTransferCustomers', {
            customer_ids: selected,
            new_emp_id: toEmpId
        });
        
        hideLoading();
        
        if (response.success) {
            showToast(response.message || 'Customers transferred', 'success');
            document.getElementById('transferCustomersList').innerHTML = '<p class="text-muted">Select "From Employee" first</p>';
            loadAllCustomers();
        } else {
            showToast(response.error || 'Transfer failed', 'error');
        }
    } catch (error) {
        hideLoading();
        showToast('Connection error', 'error');
    }
}

// ============================================
// END OF APP.JS
// ============================================
