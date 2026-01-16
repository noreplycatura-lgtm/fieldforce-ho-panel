// Authentication Functions
class Auth {
    static currentUser = null;
    
    static async login(userCode, password) {
        try {
            Utils.showLoader('Authenticating...');
            
            const result = await new Promise((resolve, reject) => {
                google.script.run
                    .withSuccessHandler(resolve)
                    .withFailureHandler(reject)
                    .authenticateUser(userCode, password);
            });
            
            Utils.hideLoader();
            
            if (result.success) {
                this.currentUser = result.user;
                sessionStorage.setItem('currentUser', JSON.stringify(result.user));
                window.location.href = 'dashboard.html';
                return { success: true };
            } else {
                return { success: false, message: result.message };
            }
        } catch (error) {
            Utils.hideLoader();
            console.error('Login error:', error);
            return { success: false, message: 'Authentication failed. Please try again.' };
        }
    }
    
    static logout() {
        this.currentUser = null;
        sessionStorage.clear();
        window.location.href = 'index.html';
    }
    
    static getCurrentUser() {
        if (!this.currentUser) {
            const storedUser = sessionStorage.getItem('currentUser');
            if (storedUser) {
                this.currentUser = JSON.parse(storedUser);
            }
        }
        return this.currentUser;
    }
    
    static isAuthenticated() {
        return !!this.getCurrentUser();
    }
    
    static checkAuth() {
        // Redirect to login if not authenticated
        if (!this.isAuthenticated() && 
            !window.location.pathname.includes('index.html')) {
            window.location.href = 'index.html';
        }
    }
    
    static requireAuth() {
        if (!this.isAuthenticated()) {
            this.logout();
        }
    }
}

// Check authentication on page load
document.addEventListener('DOMContentLoaded', function() {
    Auth.checkAuth();
});
