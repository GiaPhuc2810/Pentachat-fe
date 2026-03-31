import router from '../router.js';

class NotificationService {
    constructor() {
        this.injectStyles();
    }

    /**
     * Hiển thị popup thông báo tin nhắn mới
     * @param {Object} message Đối tượng tin nhắn từ WebSocket
     */
    showNewMessage(message) {
        // Tạo phần tử popup
        const toast = document.createElement('div');
        toast.className = 'msg-toast animate-in';
        
        const senderName = message.fromUsername || `User ${message.fromId}`;
        const content = this.truncate(message.content, 60);

        toast.innerHTML = `
            <div class="msg-toast-icon">
                <i class="bi bi-chat-dots-fill"></i>
            </div>
            <div class="msg-toast-body">
                <div class="msg-toast-header">
                    <strong>${senderName}</strong>
                    <small>Vừa xong</small>
                </div>
                <div class="msg-toast-content">${content}</div>
            </div>
        `;

        // Sự kiện click để chuyển trang
        toast.onclick = () => {
            const params = new URLSearchParams({
                type: 'direct',
                id: message.fromId,
                name: senderName
            });
            router.navigate(`/messages?${params.toString()}`);
            toast.remove();
        };

        document.body.appendChild(toast);

        // Tự động xóa sau 5 giây
        setTimeout(() => {
            toast.classList.add('animate-out');
            setTimeout(() => toast.remove(), 300);
        }, 5000);
    }

    truncate(str, n) {
        return (str.length > n) ? str.substr(0, n - 1) + '...' : str;
    }

    injectStyles() {
        if (document.getElementById('msg-toast-styles')) return;
        const style = document.createElement('style');
        style.id = 'msg-toast-styles';
        style.textContent = `
            .msg-toast {
                position: fixed; bottom: 20px; right: 20px; width: 320px;
                background: white; border-radius: 10px; box-shadow: 0 5px 20px rgba(0,0,0,0.15);
                display: flex; padding: 15px; z-index: 10000; cursor: pointer;
                border-left: 5px solid #0d6efd; transition: all 0.3s ease;
            }
            .msg-toast-icon { 
                font-size: 1.5rem; color: #0d6efd; margin-right: 15px; 
                display: flex; align-items: center; 
            }
            .msg-toast-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px; }
            .msg-toast-header small { color: #888; font-size: 0.75rem; }
            .msg-toast-content { font-size: 0.85rem; color: #444; overflow: hidden; text-overflow: ellipsis; }
            .animate-in { animation: toastIn 0.3s ease-out; }
            .animate-out { transform: translateX(120%); opacity: 0; }
            @keyframes toastIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        `;
        document.head.appendChild(style);
    }
}

export default new NotificationService();