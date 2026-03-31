import apiClient from './api.service.js';
import API_CONFIG from '../config/api.config.js';

const FriendService = {
    /**
     * Send friend request
     * @param {Object} data - {fromUserId, toUserId}
     */
    async sendRequest(data) {
        const response = await apiClient.post(API_CONFIG.ENDPOINTS.FRIENDS.REQUEST, data);
        return response;
    },

    /**
     * Accept friend request
     * @param {number} requestId
     */
    async acceptRequest(requestId) {
        const response = await apiClient.post(API_CONFIG.ENDPOINTS.FRIENDS.ACCEPT(requestId));
        return response;
    },

    /**
     * Reject friend request
     * @param {number} requestId
     */
    async rejectRequest(requestId) {
        const response = await apiClient.post(API_CONFIG.ENDPOINTS.FRIENDS.REJECT(requestId));
        return response;
    },

    /**
     * Get pending friend requests
     * @param {number} userId
     */
    async getPendingRequests(userId) {
        const response = await apiClient.get(API_CONFIG.ENDPOINTS.FRIENDS.PENDING(userId));
        return response;
    },

    /**
     * Check if two users are friends
     * @param {number} userId1
     * @param {number} userId2
     */
    async checkFriendship(userId1, userId2) {
        const response = await apiClient.get(API_CONFIG.ENDPOINTS.FRIENDS.CHECK(userId1, userId2));
        return response;
    },

    /**
     * Get list of all friends
     * @param {number} userId
     */
    async getFriendsList(userId) {
        const response = await apiClient.get(API_CONFIG.ENDPOINTS.FRIENDS.LIST(userId));
        return response;
    }
};

export default FriendService;
