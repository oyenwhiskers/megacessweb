// config.js - Centralized Environment Configuration
// ==============================================
// Change ENV to switch between environments: 'staging' or 'production'

const ENV = 'staging'; // CHANGE THIS TO SWITCH ENVIRONMENTS

// API Base URLs for each environment
const API_URLS = {
    staging: 'https://mwmsdemo.megacess.com/api/v1',
    production: 'https://mwms.megacess.com/api/v1'
};

// Base Domain URLs for each environment
const DOMAIN_URLS = {
    staging: 'https://mwmsdemo.megacess.com',
    production: 'https://mwms.megacess.com'
};

// Storage Domain - uses the same domain as the environment
// This ensures staging uses staging storage and production uses production storage
const STORAGE_DOMAIN = DOMAIN_URLS[ENV];

// Current environment's API URL
const API_URL = API_URLS[ENV];

// Current environment's base domain
const BASE_DOMAIN = DOMAIN_URLS[ENV];

// Log current environment (helpful for debugging)
console.log(` Environment: ${ENV.toUpperCase()} | API: ${API_URL} | Storage: ${STORAGE_DOMAIN}`);

// Validate environment configuration
if (!API_URL || !BASE_DOMAIN) {
    console.error(`Invalid environment: "${ENV}". Must be 'staging' or 'production'.`);
}

// Export for ES6 modules (if needed in the future)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ENV, API_URL, BASE_DOMAIN, STORAGE_DOMAIN, API_URLS, DOMAIN_URLS };
}
