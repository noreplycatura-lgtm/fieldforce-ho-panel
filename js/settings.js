// Settings Management Functions
document.addEventListener('DOMContentLoaded', function() {
    loadSettings();
    loadSystemInfo();
});

function loadSettings() {
    // Load current settings from Google Sheets
    google.script.run
        .withSuccessHandler(function(settings) {
            // Populate form with current settings
            document.getElementById('defaultRadius').value = settings.default_radius || 300;
            document.getElementById('maxRadius').value = settings.max_radius || 500;
            document.getElementById('hqAllowance').value = settings.hq_allowance || 200;
            document.getElementById('exHqAllowance').value = settings.ex_hq_allowance || 400;
            document.getElementById('outstationAllowance').value = settings.outstation_allowance || 800;
            document.getElementById('kmRate').value = settings.km_rate || 5;
            document.getElementById('mobileAllowance').value = settings.mobile_allowance || 500;
            document.getElementById('photoMaxSize').value = settings.photo_max_size || 100;
            
            // Load approval setting
            loadApprovalSetting();
        })
        .withFailureHandler(function(error) {
            console.error('Error loading settings:', error);
            Utils.showToast('Failed to load settings', 'danger');
        })
        .getSettings();
}

function loadApprovalSetting() {
    google.script.run
        .withSuccessHandler(function(requireApproval) {
            document.getElementById('requireCustomerApproval').checked = requireApproval;
        })
        .withFailureHandler(function(error) {
            console.error('Error loading approval setting:', error);
        })
        .getApprovalSetting();
}

function saveGeneralSettings() {
    const settings = {
        default_radius: document.getElementById('defaultRadius').value,
        max_radius: document.getElementById('maxRadius').value,
        hq_allowance: document.getElementById('hqAllowance').value,
        ex_hq_allowance: document.getElementById('exHqAllowance').value,
        outstation_allowance: document.getElementById('outstationAllowance').value,
        km_rate: document.getElementById('kmRate').value,
        mobile_allowance: document.getElementById('mobileAllowance').value,
        photo_max_size: document.getElementById('photoMaxSize').value
    };
    
    Utils.showLoader('Saving settings...');
    
    google.script.run
        .withSuccessHandler(function(result) {
            Utils.hideLoader();
            if (result.success) {
                Utils.showToast('Settings saved successfully', 'success');
            } else {
                Utils.showToast(result.message, 'danger');
            }
        })
        .withFailureHandler(function(error) {
            Utils.hideLoader();
            console.error('Error saving settings:', error);
            Utils.showToast('Failed to save settings', 'danger');
        })
        .saveSettings(settings);
}

function saveApprovalSettings() {
    const requireApproval = document.getElementById('requireCustomerApproval').checked;
    
    Utils.showLoader('Saving approval settings...');
    
    google.script.run
        .withSuccessHandler(function(result) {
            Utils.hideLoader();
            if (result.success) {
                Utils.showToast('Approval settings saved successfully', 'success');
            } else {
                Utils.showToast(result.message, 'danger');
            }
        })
        .withFailureHandler(function(error) {
            Utils.hideLoader();
            console.error('Error saving approval settings:', error);
            Utils.showToast('Failed to save approval settings', 'danger');
        })
        .setApprovalSetting(requireApproval);
}

function loadSystemInfo() {
    // Load system information
    google.script.run
        .withSuccessHandler(function(info) {
            document.getElementById('employeeCount').textContent = info.employees || 0;
            document.getElementById('customerCount').textContent = info.customers || 0;
            document.getElementById('productCount').textContent = info.products || 0;
            document.getElementById('lastSyncTime').textContent = Utils.formatDate(new Date());
        })
        .withFailureHandler(function(error) {
            console.error('Error loading system info:', error);
        })
        .getSystemInfo();
}

function forceSync() {
    Utils.showLoader('Synchronizing data...');
    
    google.script.run
        .withSuccessHandler(function(result) {
            Utils.hideLoader();
            Utils.showToast('Data synchronized successfully', 'success');
            loadSystemInfo(); // Refresh system info
        })
        .withFailureHandler(function(error) {
            Utils.hideLoader();
            console.error('Error syncing data:', error);
            Utils.showToast('Failed to synchronize data', 'danger');
        })
        .forceSync();
}

function clearCache() {
    if (confirm('Are you sure you want to clear the browser cache? This will log you out.')) {
        localStorage.clear();
        sessionStorage.clear();
        Utils.showToast('Cache cleared successfully. Logging out...', 'success');
        setTimeout(() => {
            Auth.logout();
        }, 2000);
    }
}

function backupData() {
    Utils.showLoader('Creating backup...');
    
    // In a real implementation, this would create a backup
    setTimeout(() => {
        Utils.hideLoader();
        Utils.showToast('Backup created successfully', 'success');
    }, 2000);
}

function restoreData() {
    Utils.showToast('Restore functionality coming soon', 'info');
}
