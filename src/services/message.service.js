import apiClient from './api.service.js';
import API_CONFIG from '../config/api.config.js';

const MessageService = {
    /**
     * Send a message (1-1)
     * @param {Object} data - {from, to, content}
     */
    async sendMessage(data) {
        const response = await apiClient.post(API_CONFIG.ENDPOINTS.MESSAGES.SEND, data);
        return response;
    },

    /**
     * Send a group message
     * @param {Object} data - {from, groupId, content}
     */
    async sendGroupMessage(data) {
        const response = await apiClient.post(API_CONFIG.ENDPOINTS.MESSAGES.GROUP_SEND, data);
        return response;
    },

    /**
     * Get user's inbox
     * @param {number} userId
     */
    async getInbox(userId) {
        const response = await apiClient.get(API_CONFIG.ENDPOINTS.MESSAGES.INBOX(userId));
        return response;
    },

    /**
     * Get conversation between two users
     * @param {number} userId1
     * @param {number} userId2
     */
    async getConversation(userId1, userId2) {
        const response = await apiClient.get(API_CONFIG.ENDPOINTS.MESSAGES.CONVERSATION(userId1, userId2));
        return response;
    },

    /**
     * Get group message history
     * @param {number} groupId
     */
    async getGroupHistory(groupId) {
        const response = await apiClient.get(API_CONFIG.ENDPOINTS.MESSAGES.GROUP_HISTORY(groupId));
        return response;
    },

    /**
     * Mark message as read
     * @param {number} userId
     * @param {number} messageId
     */
    async markAsRead(userId, messageId) {
        const response = await apiClient.post(API_CONFIG.ENDPOINTS.MESSAGES.READ(userId, messageId));
        return response;
    },

    /**
     * Delete a message
     * @param {number} userId
     * @param {number} messageId
     */
    async deleteMessage(userId, messageId) {
        const response = await apiClient.delete(API_CONFIG.ENDPOINTS.MESSAGES.DELETE(userId, messageId));
        return response;
    },

    /**
     * Check user online status
     * @param {number} userId
     */
    async checkUserStatus(userId) {
        const response = await apiClient.get(API_CONFIG.ENDPOINTS.MESSAGES.STATUS(userId));
        return response;
    }
};

export default MessageService;
