import apiClient from './api.service.js';
import API_CONFIG from '../config/api.config.js';

const WalletService = {
    /**
     * Get wallet balance
     * @param {number} userId
     */
    async getBalance(userId) {
        const response = await apiClient.get(API_CONFIG.ENDPOINTS.WALLET.BALANCE, {
            params: { userId }
        });
        return response;
    },

    /**
     * Deposit money
     * @param {number} userId
     * @param {number} amount
     */
    async deposit(userId, amount) {
        const response = await apiClient.post(
            API_CONFIG.ENDPOINTS.WALLET.DEPOSIT,
            { amount },
            { params: { userId } }
        );
        return response;
    },

    /**
     * Withdraw money
     * @param {number} userId
     * @param {number} amount
     */
    async withdraw(userId, amount) {
        const response = await apiClient.post(
            API_CONFIG.ENDPOINTS.WALLET.WITHDRAW,
            { amount },
            { params: { userId } }
        );
        return response;
    },

    /**
     * Transfer money to another user
     * @param {number} fromUserId
     * @param {string} toUsername
     * @param {number} amount
     */
    async transfer(fromUserId, toUsername, amount) {
        const response = await apiClient.post(
            API_CONFIG.ENDPOINTS.WALLET.TRANSFER,
            { toUsername, amount },
            { params: { fromUserId } }
        );
        return response;
    },

    /**
     * Get transaction history
     * @param {number} userId
     */
    async getTransactions(userId) {
        const response = await apiClient.get(API_CONFIG.ENDPOINTS.WALLET.TRANSACTIONS, {
            params: { userId }
        });
        return response;
    },

    /**
     * Đổi Gem lấy thẻ cào điện thoại
     * @param {number} userId - ID người dùng
     * @param {string} provider - Nhà mạng (Viettel, Mobifone)
     * @param {number} amount - Mệnh giá thẻ (10000, 20000,...)
     */
    async redeemCard(userId, provider, amount) {
        const gemCost = (amount / 10000) * 50;
        const response = await apiClient.post(
            API_CONFIG.ENDPOINTS.WALLET.REDEEM_CARD,
            { provider, amount, gemCost },
            { params: { userId } }
        );
        return response;
    }
};

export default WalletService;
