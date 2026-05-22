import axios from 'axios';

// Support both VITE_API_URL and legacy VITE_API_BASE_URL (prefer VITE_API_URL)
let envURL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '/api';

// Add https:// if URL is a bare hostname (Railway sometimes strips protocol)
if (envURL && !envURL.startsWith('http') && !envURL.startsWith('/')) {
  envURL = 'https://' + envURL;
}

// Robustness Fix: Automatically append '/api' if it's an external URL and missing the prefix
if (envURL.startsWith('http') && !envURL.endsWith('/api') && !envURL.includes('/api/')) {
    envURL = envURL.replace(/\/$/, '') + '/api';
}

const baseURL = envURL;

const apiClient = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 20 * 60 * 1000, // 20 min timeout for AI image generation
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('f9_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Personal AI Settings
  const aiConfigStr = localStorage.getItem('f9_user_api_config');
  if (aiConfigStr) {
    try {
      const aiConfig = JSON.parse(aiConfigStr);
      if (aiConfig.usePersonalKey && aiConfig.credentials) {
        // Base64 encode credentials to avoid SyntaxError with raw JSON in headers
        const creds = typeof aiConfig.credentials === 'object' 
          ? JSON.stringify(aiConfig.credentials) 
          : aiConfig.credentials;
        
        try {
          // Robust Base64 encoding for Unicode/UTF-8 JSON strings
          const encoded = btoa(encodeURIComponent(creds).replace(/%([0-9A-F]{2})/g, (_, p1) => 
            String.fromCharCode(parseInt(p1, 16))
          ));
          config.headers['x-user-credentials'] = encoded;
        } catch (e) {
          console.error("Base64 encoding failed", e);
          config.headers['x-user-credentials'] = creds; 
        }
      }
    } catch (e) {
      console.error("Failed to parse user AI config", e);
    }
  }
  
  return config;
});

let isHandling401 = false;

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const requestUrl = error.config?.url || '';
      const hasToken = !!localStorage.getItem('f9_token');

      // Only auto-logout for data API calls, NOT for auth endpoint calls themselves.
      // This prevents a loop where /auth/me returning 401 triggers a reload
      // during page load, which cancels any in-progress login flow.
      const isAuthEndpoint = requestUrl.includes('/auth/');

      if (hasToken && !isAuthEndpoint && !isHandling401) {
        isHandling401 = true;
        localStorage.removeItem('f9_token');
        localStorage.removeItem('f9_user');
        setTimeout(() => {
          isHandling401 = false;
          window.location.reload();
        }, 100);
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
