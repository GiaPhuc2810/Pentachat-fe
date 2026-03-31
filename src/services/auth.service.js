import apiClient, { setSession, clearSession, getSession } from './api.service.js';
import API_CONFIG from '../config/api.config.js';

const AuthService = {
    /**
     * Register a new user
     * @param {Object} data - {username, password, email}
     */
    async register(data) {
        const response = await apiClient.post(API_CONFIG.ENDPOINTS.AUTH.REGISTER, {
            username: data.username,
            password: data.password
        });
        return response;
    },

    /**
     * Login user
     * @param {Object} credentials - {username, password}
     */
    async login(credentials) {
        const response = await apiClient.post(API_CONFIG.ENDPOINTS.AUTH.LOGIN, credentials);

        if (response.success && response.data) {
            // Store session
            setSession(response.data.id, response.data.sessionId, response.data.username || credentials.username);
        }

        return response;
    },

    /**
     * Logout user
     */
    logout() {
        clearSession();
        window.location.hash = '#/login';
    },

    /**
     * Change password
     * @param {Object} data - {currentPassword, newPassword}
     */
    async changePassword(data) {
        const response = await apiClient.post(API_CONFIG.ENDPOINTS.AUTH.CHANGE_PASSWORD, data);
        return response;
    },

    /**
     * Forgot password - send reset link
     * @param {string} username
     */
    async forgotPassword(username) {
        const response = await apiClient.post(API_CONFIG.ENDPOINTS.AUTH.FORGOT_PASSWORD, { username });
        return response;
    },

    /**
     * Reset password with token
     * @param {Object} data - {token, newPassword}
     */
    async resetPassword(data) {
        const response = await apiClient.post(API_CONFIG.ENDPOINTS.AUTH.RESET_PASSWORD, data);
        return response;
    },

    /**
     * Get current session
     */
    getSession() {
        return getSession();
    },

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        return getSession() !== null;
    }
};

export default AuthService;
