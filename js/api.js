// ============================================
// API FUNCTIONS
// ============================================

const API = {
    // Generic API call function
    async call(action, data = {}) {
        try {
            const response = await fetch(CONFIG.API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain',
                },
                body: JSON.stringify({
                    action: action,
                    ...data
                })
            });
            
            const result = await response.json();
            return result;
        } catch (error) {
            console.error('API Error:', error);
            return { success: false, error: error.message };
        }
    },

    // ============================================
    // AUTHENTICATION
    // ============================================
    
    async hoLogin(userCode, password) {
        return await this.call('hoLogin', {
            user_code: userCode,
            password: password
        });
    },

    // ============================================
    // DASHBOARD
    // ============================================
    
    async getDashboard() {
        return await this.call('getHODashboard');
    },

    // ============================================
    // EMPLOYEES
    // ============================================
    
    async getAllEmployees() {
        return await this.call('getAllEmployees');
    },
    
    async addEmployee(data) {
        return await this.call('addEmployee', data);
    },
    
    async updateEmployee(data) {
        return await this.call('updateEmployee', data);
    },
    
    async deleteEmployee(empId) {
        return await this.call('deleteEmployee', { emp_id: empId });
    },
    
    async blockEmployee(empId, block) {
        return await this.call('blockEmployee', { emp_id: empId, block: block });
    },
    
    async bulkUploadEmployees(employees) {
        return await this.call('bulkUploadEmployees', { employees: employees });
    },

    // ============================================
    // CUSTOMERS
    // ============================================
    
    async getAllCustomers() {
        return await this.call('getAllCustomersHO');
    },
    
    async getPendingCustomers() {
        return await this.call('getPendingCustomers');
    },
    
    async approveCustomer(customerId, approvedBy) {
        return await this.call('approveCustomer', {
            customer_id: customerId,
            approved_by: approvedBy
        });
    },
    
    async rejectCustomer(customerId, rejectedBy) {
        return await this.call('rejectCustomer', {
            customer_id: customerId,
            rejected_by: rejectedBy
        });
    },
    
    async transferCustomer(customerId, newEmpId) {
        return await this.call('transferCustomer', {
            customer_id: customerId,
            new_emp_id: newEmpId
        });
    },
    
    async bulkTransferCustomers(customerIds, newEmpId) {
        return await this.call('bulkTransferCustomers', {
            customer_ids: customerIds,
            new_emp_id: newEmpId
        });
    },

    // ============================================
    // STOCKISTS
    // ============================================
    
    async getAllStockists() {
        return await this.call('getAllStockistsHO');
    },
    
    async addStockist(data) {
        return await this.call('addStockist', data);
    },
    
    async updateStockist(data) {
        return await this.call('updateStockist', data);
    },
    
    async deleteStockist(stockistId) {
        return await this.call('deleteStockist', { stockist_id: stockistId });
    },

    // ============================================
    // PRODUCTS
    // ============================================
    
    async getAllProducts() {
        return await this.call('getAllProducts');
    },
    
    async addProduct(data) {
        return await this.call('addProduct', data);
    },
    
    async updateProduct(data) {
        return await this.call('updateProduct', data);
    },
    
    async deleteProduct(productId) {
        return await this.call('deleteProduct', { product_id: productId });
    },
    
    async bulkUploadProducts(products) {
        return await this.call('bulkUploadProducts', { products: products });
    },

    // ============================================
    // AREAS
    // ============================================
    
    async getAllAreas() {
        return await this.call('getAllAreas');
    },
    
    async addArea(data) {
        return await this.call('addArea', data);
    },
    
    async updateArea(data) {
        return await this.call('updateArea', data);
    },
    
    async deleteArea(areaId) {
        return await this.call('deleteArea', { area_id: areaId });
    },

    // ============================================
    // EXPENSES
    // ============================================
    
    async getPendingExpenses() {
        return await this.call('getPendingExpenses');
    },
    
    async getExpenseDetails(expenseId) {
        return await this.call('getExpenseDetails', { expense_id: expenseId });
    },
    
    async approveExpense(expenseId, approvedBy) {
        return await this.call('approveExpense', {
            expense_id: expenseId,
            approved_by: approvedBy
        });
    },
    
    async rejectExpense(expenseId, rejectedBy) {
        return await this.call('rejectExpense', {
            expense_id: expenseId,
            rejected_by: rejectedBy
        });
    },
    
    async counterExpense(data) {
        return await this.call('counterExpense', data);
    },

    // ============================================
    // HIERARCHY & MAPPING
    // ============================================
    
    async getHierarchy() {
        return await this.call('getHierarchy');
    },
    
    async updateHierarchy(empId, reportingTo) {
        return await this.call('updateHierarchy', {
            emp_id: empId,
            reporting_to: reportingTo
        });
    },
    
    async getAreaMappings() {
        return await this.call('getAreaMappings');
    },
    
    async updateAreaMapping(empId, areaIds) {
        return await this.call('updateAreaMapping', {
            emp_id: empId,
            area_ids: areaIds
        });
    },

    // ============================================
    // ANNOUNCEMENTS
    // ============================================
    
    async getAnnouncements() {
        return await this.call('getAnnouncements');
    },
    
    async addAnnouncement(data) {
        return await this.call('addAnnouncement', data);
    },
    
    async updateAnnouncement(data) {
        return await this.call('updateAnnouncement', data);
    },
    
    async deleteAnnouncement(announcementId) {
        return await this.call('deleteAnnouncement', { announcement_id: announcementId });
    },

    // ============================================
    // SETTINGS
    // ============================================
    
    async getSettings() {
        return await this.call('getSettings');
    },
    
    async updateSettings(settings) {
        return await this.call('updateSettings', { settings: settings });
    },

    // ============================================
    // REPORTS
    // ============================================
    
    async getReport(reportType, startDate, endDate, empId = 'all') {
        return await this.call('getHOReports', {
            report_type: reportType,
            start_date: startDate,
            end_date: endDate,
            emp_id: empId
        });
    },

    // ============================================
    // MASTER REQUESTS
    // ============================================
    
    async getPendingMasterRequests() {
        return await this.call('getPendingMasterRequests');
    },
    
    async approveMasterRequest(requestId, approvedBy) {
        return await this.call('approveMasterRequest', {
            request_id: requestId,
            approved_by: approvedBy
        });
    },
    
    async rejectMasterRequest(requestId, rejectedBy, remarks) {
        return await this.call('rejectMasterRequest', {
            request_id: requestId,
            rejected_by: rejectedBy,
            remarks: remarks
        });
    },

    // ============================================
    // BACKUP
    // ============================================
    
    async createBackup() {
        return await this.call('createBackup');
    }
};
