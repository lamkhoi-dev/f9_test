import axios from 'axios';

// In production (Vercel), use the full backend URL; in dev, use Vite proxy '/api'
let envURL = import.meta.env.VITE_API_BASE_URL || '/api';

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

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('f9_token');
      localStorage.removeItem('f9_user');
      window.location.reload();
    }
    return Promise.reject(error);
  }
);

export default apiClient;
