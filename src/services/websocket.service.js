import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';
import API_CONFIG from '../config/api.config.js';
import { getSession } from './api.service.js';

class WebSocketService {
    constructor() {
        this.client = null;
        this.connected = false;
        this.subscriptions = new Map(); // Lưu STOMP Subscription
        this.listeners = new Map();     // Lưu danh sách callback cho mỗi topic
    }

    /**
     * Connect to WebSocket
     */
    connect() {
        return new Promise((resolve, reject) => {
            const session = getSession();
            if (!session) {
                reject(new Error('No active session'));
                return;
            }

            if (this.client && this.connected) {
                resolve();
                return;
            }

            this.client = new Client({
                webSocketFactory: () => new SockJS(API_CONFIG.WS_URL),
                reconnectDelay: 3000,
                heartbeatIncoming: 4000,
                heartbeatOutgoing: 4000
            });

            this.client.onConnect = () => {
                this.connected = true;
                console.log('WebSocket connected');
                resolve();
            };

            this.client.onWebSocketClose = () => {
                this.connected = false;
                console.log('WebSocket closed');
            };

            this.client.onStompError = (frame) => {
                console.error('WebSocket error:', frame);
                reject(new Error(frame.headers.message || 'WebSocket error'));
            };

            this.client.activate();
        });
    }

    /**
     * Disconnect from WebSocket
     */
    disconnect() {
        if (this.client) {
            this.subscriptions.forEach((sub) => sub.unsubscribe());
            this.subscriptions.clear();
            this.client.deactivate();
            this.connected = false;
        }
    }

    /**
     * Subscribe to a topic
     * @param {string} topic - Topic to subscribe to
     * @param {Function} callback - Message handler
     */
    subscribe(topic, callback) {
        if (!this.client || !this.connected) {
            console.error('WebSocket not connected');
            return null;
        }

        // Khởi tạo danh sách listener cho topic nếu chưa có
        if (!this.listeners.has(topic)) {
            this.listeners.set(topic, new Set());
            
            // Chỉ đăng ký với server 1 lần duy nhất cho mỗi topic
            const subscription = this.client.subscribe(topic, (message) => {
                try {
                    const data = JSON.parse(message.body);
                    // Gửi dữ liệu cho tất cả các callback đang lắng nghe topic này
                    const topicListeners = this.listeners.get(topic);
                    if (topicListeners) {
                        topicListeners.forEach(cb => cb(data));
                    }
                } catch (e) {
                    console.error('Error parsing message:', e);
                }
            });
            this.subscriptions.set(topic, subscription);
        }

        this.listeners.get(topic).add(callback);
        return {
            unsubscribe: () => this.unsubscribe(topic, callback)
        };
    }

    /**
     * Unsubscribe from a topic
     * @param {string} topic - Topic name
     * @param {Function} callback - Callback cụ thể cần xóa
     */
    unsubscribe(topic, callback) {
        const topicListeners = this.listeners.get(topic);
        if (topicListeners) {
            topicListeners.delete(callback);
            
            // Nếu không còn ai lắng nghe nữa thì mới ngắt kết nối với server
            if (topicListeners.size === 0) {
                const subscription = this.subscriptions.get(topic);
                if (subscription) {
                    subscription.unsubscribe();
                    this.subscriptions.delete(topic);
                }
                this.listeners.delete(topic);
            }
        }
    }

    /**
     * Send a message to a destination
     * @param {string} destination
     * @param {Object} body
     */
    send(destination, body) {
        if (!this.client || !this.connected) {
            console.error('WebSocket not connected');
            return;
        }

        this.client.publish({
            destination,
            body: JSON.stringify(body)
        });
    }

    /**
     * Subscribe to user's personal message topic
     * @param {number} userId
     * @param {Function} callback
     */
    subscribeToMessages(userId, callback) {
        if (!this.connected) {
            this.connect().then(() => {
                this.subscribe(`/topic/messages/${userId}`, callback);
            }).catch(err => {
                console.error('Failed to connect to WebSocket:', err);
            });
            return;
        }

        this.subscribe(`/topic/messages/${userId}`, callback);
    }

    /**
     * Subscribe to audio call signals
     * @param {number} userId
     * @param {Function} callback
     */
    subscribeToAudioCalls(userId, callback) {
        return this.subscribe(`/topic/call.audio.${userId}`, callback);
    }

    /**
     * Send audio call signal
     * @param {Object} signal
     */
    sendAudioSignal(signal) {
        this.send('/app/call.audio', signal);
    }

    /**
     * Check if connected
     */
    isConnected() {
        return this.connected;
    }
}

// Export singleton instance
const websocketService = new WebSocketService();
export default websocketService;
