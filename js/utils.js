// Utility Functions
class Utils {
    static formatDate(date) {
        if (!date) return '';
        const d = new Date(date);
        const day = String(d.getDate()).padStart(2, '0');
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = monthNames[d.getMonth()];
        const year = d.getFullYear().toString().substr(-2);
        return `${day}-${month}-${year}`;
    }
    
    static formatCurrency(amount) {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR'
        }).format(amount);
    }
    
    static generateUniqueId(prefix = '') {
        return prefix + Date.now() + Math.random().toString(36).substr(2, 9);
    }
    
    static validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }
    
    static validatePhone(phone) {
        const re = /^[0-9]{10}$/;
        return re.test(phone);
    }
    
    static showToast(message, type = 'info') {
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast align-items-center text-white bg-${type} border-0`;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'assertive');
        toast.setAttribute('aria-atomic', 'true');
        
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        `;
        
        // Add to toast container
        let toastContainer = document.getElementById('toastContainer');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toastContainer';
            toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
            document.body.appendChild(toastContainer);
        }
        
        toastContainer.appendChild(toast);
        
        // Initialize and show toast
        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();
        
        // Remove toast after it's hidden
        toast.addEventListener('hidden.bs.toast', function () {
            toast.remove();
        });
    }
    
    static showLoader(message = 'Processing...') {
        // Create loader overlay
        let loaderOverlay = document.getElementById('loaderOverlay');
        if (!loaderOverlay) {
            loaderOverlay = document.createElement('div');
            loaderOverlay.id = 'loaderOverlay';
            loaderOverlay.className = 'position-fixed top-0 start-0 w-100 h-100 bg-dark bg-opacity-50 d-flex align-items-center justify-content-center';
            loaderOverlay.style.zIndex = '9999';
            
            loaderOverlay.innerHTML = `
                <div class="text-center text-white">
                    <div class="spinner-border text-light mb-3" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <div>${message}</div>
                </div>
            `;
            
            document.body.appendChild(loaderOverlay);
        }
        
        loaderOverlay.style.display = 'flex';
    }
    
    static hideLoader() {
        const loaderOverlay = document.getElementById('loaderOverlay');
        if (loaderOverlay) {
            loaderOverlay.style.display = 'none';
        }
    }
    
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    static downloadCSV(csvContent, filename) {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    
    static parseCSV(csvString) {
        const lines = csvString.split('\n');
        const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
        const result = [];
        
        for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim() === '') continue;
            
            const currentLine = lines[i].split(',');
            const obj = {};
            
            for (let j = 0; j < headers.length; j++) {
                obj[headers[j]] = currentLine[j] ? currentLine[j].replace(/"/g, '').trim() : '';
            }
            
            result.push(obj);
        }
        
        return result;
    }
    
    static validateForm(formId) {
        const form = document.getElementById(formId);
        const inputs = form.querySelectorAll('input[required], select[required], textarea[required]');
        let isValid = true;
        
        inputs.forEach(input => {
            if (!input.value.trim()) {
                input.classList.add('is-invalid');
                isValid = false;
            } else {
                input.classList.remove('is-invalid');
            }
        });
        
        return isValid;
    }
    
    static resetForm(formId) {
        const form = document.getElementById(formId);
        form.reset();
        form.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
    }
}

// Auto-sync functionality
class AutoSync {
    constructor(interval = 2000) {
        this.interval = interval;
        this.syncInterval = null;
        this.isSyncing = false;
    }
    
    start() {
        this.syncInterval = setInterval(() => {
            this.sync();
        }, this.interval);
    }
    
    stop() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
    }
    
    async sync() {
        if (this.isSyncing) return;
        
        this.isSyncing = true;
        try {
            // Call sync function
            google.script.run
                .withSuccessHandler((data) => {
                    // Update local storage
                    localStorage.setItem('syncData', JSON.stringify(data));
                    this.updateSyncStatus(true);
                })
                .withFailureHandler(() => {
                    this.updateSyncStatus(false);
                })
                .getDashboardData();
        } catch (error) {
            console.error('Sync error:', error);
            this.updateSyncStatus(false);
        } finally {
            this.isSyncing = false;
        }
    }
    
    updateSyncStatus(success) {
        const statusElement = document.getElementById('syncStatus');
        if (statusElement) {
            statusElement.className = success ? 'text-success' : 'text-danger';
            statusElement.innerHTML = success ? 
                '<i class="fas fa-check-circle"></i> Synced' : 
                '<i class="fas fa-times-circle"></i> Sync failed';
        }
    }
}

// Initialize utilities when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize auto-sync
    window.autoSync = new AutoSync();
    window.autoSync.start();
});
