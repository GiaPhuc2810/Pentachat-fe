// API Configuration
export const API_CONFIG = {
    BASE_URL: import.meta.env.VITE_API_BASE?.trim() || '',
    WS_URL: import.meta.env.VITE_WS_BASE?.trim() || '/ws',
    TIMEOUT: 10000,

    // API Endpoints
    ENDPOINTS: {
        // Auth
        AUTH: {
            REGISTER: '/api/auth/register',
            LOGIN: '/api/auth/login',
            CHANGE_PASSWORD: '/api/auth/change-password',
            FORGOT_PASSWORD: '/api/auth/forgot-password',
            RESET_PASSWORD: '/api/auth/reset-password'
        },

        // Users
        USERS: {
            LIST: '/api/users',
            SEARCH: '/api/users/search',
            DASHBOARD_STATS: '/api/users/dashboard/stats'
        },

        // Profile
        PROFILE: {
            GET: (userId) => `/api/profiles/${userId}`,
            UPDATE: (userId) => `/api/profiles/${userId}`
        },

        // Friends
        FRIENDS: {
            REQUEST: '/api/friends/request',
            ACCEPT: (requestId) => `/api/friends/accept/${requestId}`,
            REJECT: (requestId) => `/api/friends/reject/${requestId}`,
            PENDING: (userId) => `/api/friends/pending/${userId}`,
            CHECK: (userId1, userId2) => `/api/friends/check/${userId1}/${userId2}`,
            LIST: (userId) => `/api/friends/list/${userId}`
        },

        // Messages
        MESSAGES: {
            SEND: '/api/messages/send',
            INBOX: (userId) => `/api/messages/inbox/${userId}`,
            CONVERSATION: (userId1, userId2) => `/api/messages/conversation/${userId1}/${userId2}`,
            READ: (userId, messageId) => `/api/messages/read/${userId}/${messageId}`,
            DELETE: (userId, messageId) => `/api/messages/${userId}/${messageId}`,
            STATUS: (userId) => `/api/messages/status/${userId}`,
            GROUP_SEND: '/api/messages/group/send',
            GROUP_HISTORY: (groupId) => `/api/messages/group/${groupId}`
        },

        // Groups
        GROUPS: {
            MY: '/api/groups/my',
            CREATE: '/api/groups'
        },

        // Wallet
        WALLET: {
            BALANCE: '/api/wallets/balance',
            DEPOSIT: '/api/wallets/deposit',
            WITHDRAW: '/api/wallets/withdraw',
            TRANSFER: '/api/wallets/transfer',
            TRANSACTIONS: '/api/wallets/transactions',
            REDEEM_CARD: '/api/wallets/redeem-card' 
        },

        // Games
        GAMES: {
            LIST: '/api/games',
            START_SESSION: (gameId) => `/api/games/${gameId}/sessions/start`,
            SUBMIT_SCORE: (gameId, sessionId) => `/api/games/${gameId}/sessions/${sessionId}/score`,
            LEADERBOARD: (gameId) => `/api/games/${gameId}/leaderboard`,
            POINT_WALLET: (userId) => `/api/games/points/${userId}`,
            EXCHANGE_POINTS: (userId) => `/api/games/points/${userId}/exchange`,
            POKER_CREATE_ROOM: (gameId) => `/api/games/${gameId}/poker/rooms`,
            POKER_GET_ROOM: (gameId, roomId) => `/api/games/${gameId}/poker/rooms/${roomId}`,
            POKER_PENDING_INVITES: (gameId, userId) => `/api/games/${gameId}/poker/invites/pending/${userId}`,
            POKER_INVITE_PLAYER: (gameId, roomId, inviteeId) => `/api/games/${gameId}/poker/rooms/${roomId}/invite/${inviteeId}`,
            POKER_JOIN_ROOM: (gameId, roomId, inviteId) => `/api/games/${gameId}/poker/rooms/${roomId}/join/${inviteId}`,
            POKER_LEAVE_ROOM: (gameId, roomId) => `/api/games/${gameId}/poker/rooms/${roomId}/leave`,
            POKER_START_ROOM: (gameId, roomId) => `/api/games/${gameId}/poker/rooms/${roomId}/start`
        }
    }
};

export default API_CONFIG;
