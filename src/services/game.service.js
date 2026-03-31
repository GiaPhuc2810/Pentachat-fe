import apiClient from './api.service.js';
import API_CONFIG from '../config/api.config.js';

const GameService = {
    async getGameList() {
        const response = await apiClient.get(API_CONFIG.ENDPOINTS.GAMES.LIST);
        return response;
    },

    async startSession(gameId) {
        const response = await apiClient.post(API_CONFIG.ENDPOINTS.GAMES.START_SESSION(gameId));
        return response;
    },

    async submitScore(gameId, sessionId, payload) {
        const response = await apiClient.post(
            API_CONFIG.ENDPOINTS.GAMES.SUBMIT_SCORE(gameId, sessionId),
            payload
        );
        return response;
    },

    async getLeaderboard(gameId) {
        const response = await apiClient.get(API_CONFIG.ENDPOINTS.GAMES.LEADERBOARD(gameId));
        return response;
    },

    async getPointWallet(userId) {
        return apiClient.get(API_CONFIG.ENDPOINTS.GAMES.POINT_WALLET(userId));
    },

    async exchangePoints(userId, points) {
        return apiClient.post(API_CONFIG.ENDPOINTS.GAMES.EXCHANGE_POINTS(userId), { points });
    },

    async createPokerRoom(gameId) {
        return apiClient.post(API_CONFIG.ENDPOINTS.GAMES.POKER_CREATE_ROOM(gameId));
    },

    async getPokerRoom(gameId, roomId) {
        return apiClient.get(API_CONFIG.ENDPOINTS.GAMES.POKER_GET_ROOM(gameId, roomId));
    },

    async getPendingPokerInvites(gameId, userId) {
        return apiClient.get(API_CONFIG.ENDPOINTS.GAMES.POKER_PENDING_INVITES(gameId, userId));
    },

    async invitePokerPlayer(gameId, roomId, inviteeId) {
        return apiClient.post(API_CONFIG.ENDPOINTS.GAMES.POKER_INVITE_PLAYER(gameId, roomId, inviteeId));
    },

    async joinPokerRoom(gameId, roomId, inviteId) {
        return apiClient.post(API_CONFIG.ENDPOINTS.GAMES.POKER_JOIN_ROOM(gameId, roomId, inviteId));
    },

    async leavePokerRoom(gameId, roomId) {
        return apiClient.post(API_CONFIG.ENDPOINTS.GAMES.POKER_LEAVE_ROOM(gameId, roomId));
    },

    async startPokerRoom(gameId, roomId, botCount = 0) {
        return apiClient.post(`${API_CONFIG.ENDPOINTS.GAMES.POKER_START_ROOM(gameId, roomId)}?botCount=${Number(botCount) || 0}`);
    }
};

export default GameService;
