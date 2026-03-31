import axios from 'axios';
import API_CONFIG from '../config/api.config.js';

// Create axios instance
const apiClient = axios.create({
    baseURL: API_CONFIG.BASE_URL,
    timeout: API_CONFIG.TIMEOUT,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Request interceptor - Add auth headers
apiClient.interceptors.request.use(
    (config) => {
        const session = getSession();
        if (session) {
            config.headers['X-User-Id'] = session.userId;
            config.headers['X-Session-Id'] = session.sessionId;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor - Handle errors
apiClient.interceptors.response.use(
    (response) => {
        return response.data;
    },
    (error) => {
        if (error.response) {
            // Server responded with error
            const { status, data } = error.response;

            if (status === 401) {
                // Unauthorized - clear session and redirect to login
                clearSession();
                window.location.hash = '#/login';
            }

            return Promise.reject({
                status,
                message: data.message || 'An error occurred',
                data: data
            });
        } else if (error.request) {
            // Request made but no response
            return Promise.reject({
                message: 'No response from server. Please check your connection.'
            });
        } else {
            // Something else happened
            return Promise.reject({
                message: error.message || 'An unexpected error occurred'
            });
        }
    }
);

// Session management helpers
export function getSession() {
    const sessionStr = localStorage.getItem('pentachat_session');
    if (!sessionStr) return null;

    try {
        return JSON.parse(sessionStr);
    } catch (e) {
        return null;
    }
}

export function setSession(userId, sessionId, username) {
    const session = { userId, sessionId, username };
    localStorage.setItem('pentachat_session', JSON.stringify(session));
}

export function clearSession() {
    localStorage.removeItem('pentachat_session');
}

export function isAuthenticated() {
    return getSession() !== null;
}

export default apiClient;
