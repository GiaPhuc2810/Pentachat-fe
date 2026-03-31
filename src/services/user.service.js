import apiClient from './api.service.js';
import API_CONFIG from '../config/api.config.js';

const UserService = {
    /**
     * Get dashboard statistics
     */
    async getDashboardStats() {
        const response = await apiClient.get(API_CONFIG.ENDPOINTS.USERS.DASHBOARD_STATS);
        return response;
    },

    /**
     * Get all users (excluding current)
     */
    async getAllUsers() {
        const response = await apiClient.get(API_CONFIG.ENDPOINTS.USERS.LIST);
        return response;
    },

    /**
     * Search users
     * @param {string} query 
     */
    async searchUsers(query) {
        const response = await apiClient.get(API_CONFIG.ENDPOINTS.USERS.SEARCH, {
            params: { q: query }
        });
        return response;
    }
};

export default UserService;
