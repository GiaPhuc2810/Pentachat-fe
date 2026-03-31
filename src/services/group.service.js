import apiClient from './api.service.js';
import API_CONFIG from '../config/api.config.js';

const GroupService = {
    /**
     * Get user's groups
     */
    async getMyGroups() {
        const response = await apiClient.get(API_CONFIG.ENDPOINTS.GROUPS.MY);
        return response;
    },

    /**
     * Create a new group
     * @param {Object} data - {name, memberIds}
     */
    async createGroup(data) {
        const response = await apiClient.post(API_CONFIG.ENDPOINTS.GROUPS.CREATE, data);
        return response;
    }
};

export default GroupService;
