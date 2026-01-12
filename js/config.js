// ============================================
// CONFIGURATION
// ============================================

const CONFIG = {
    // Your Google Apps Script Web App URL
    API_URL: 'https://script.google.com/macros/s/AKfycbyo9YciQoWC_Z7Ak3IYtF_fZKrPUxpoZTsbDHY-9laLcd4oj9_AlK6EGmlJu-XVTmUxXQ/exec',
    
    // App Settings
    APP_NAME: 'Field Force HO Panel',
    VERSION: '1.0.0',
    
    // Designations
    DESIGNATIONS: [
        'SR', 'SO', 'DASM', 'ASM', 'SASM', 'RSM', 'ZM', 'SM', 'GM', 'VP', 'HO'
    ],
    
    // Day Types
    DAY_TYPES: ['HQ', 'EX-HQ', 'Outstation'],
    
    // Priority Levels
    PRIORITIES: ['Normal', 'Important', 'Urgent'],
    
    // Status Options
    EMPLOYEE_STATUS: ['Active', 'Blocked', 'Deleted'],
    CUSTOMER_STATUS: ['Approved', 'Pending', 'Rejected'],
    EXPENSE_STATUS: ['Draft', 'Submitted', 'Approved', 'Rejected', 'Countered']
};
