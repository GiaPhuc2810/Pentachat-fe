import apiClient from './api.service.js';
import API_CONFIG from '../config/api.config.js';

const ProfileService = {
    /**
     * Get user profile
     * @param {number} userId
     */
    async getProfile(userId) {
        const response = await apiClient.get(API_CONFIG.ENDPOINTS.PROFILE.GET(userId));
        return response;
    },

    /**
     * Update user profile
     * @param {number} userId
     * @param {Object} data - Profile data to update
     */
    async updateProfile(userId, data) {
        const response = await apiClient.put(API_CONFIG.ENDPOINTS.PROFILE.UPDATE(userId), data);
        return response;
    }
};

export default ProfileService;
