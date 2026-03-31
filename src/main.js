// Import styles
import 'bootstrap/dist/css/bootstrap.min.css';
import './styles/main.css';
import './styles/components.css';

// Import router
import router from './router.js';

// Import pages
import { renderLogin } from './pages/login.js';
import { renderRegister } from './pages/register.js';
import { renderDashboard } from './pages/dashboard.js';
import { renderWallet } from './pages/wallet.js';
import { renderMessages } from './pages/messages/messages.js';
import { renderFriends } from './pages/friends/friends.js';
import { renderGroups } from './pages/groups/groups.js';
import { renderProfile } from './pages/profile.js';
import { renderGames } from './pages/games.js';

// Import services
import websocketService from './services/websocket.service.js';
import AuthService from './services/auth.service.js';
import notificationService from './services/notification.service.js';

// Initialize app
console.log('Pentachat app starting...');

try {
  // Register routes
  console.log('Registering routes...');
  router.register('/login', renderLogin, false);
  router.register('/register', renderRegister, false);
  router.register('/dashboard', renderDashboard, true);
  router.register('/wallet', renderWallet, true);
  router.register('/wallet', renderWallet, true);
  router.register('/messages', renderMessages, true);
  router.register('/friends', renderFriends, true);
  router.register('/groups', renderGroups, true);
  router.register('/profile', renderProfile, true);
  router.register('/games', renderGames, true);
  router.register('/', () => {
    // Redirect to dashboard if authenticated, otherwise to login
    const isAuth = localStorage.getItem('pentachat_session');
    router.navigate(isAuth ? '/dashboard' : '/login');
  }, false);

  console.log('Routes registered successfully');

  // Connect WebSocket if user is authenticated
  const session = AuthService.getSession();
  if (session) {
    console.log('User authenticated, connecting WebSocket...');
    websocketService.connect().then(() => {
      console.log('WebSocket connected successfully');

      // Đăng ký lắng nghe tin nhắn toàn cục (Global Listener)
      websocketService.subscribeToMessages(session.userId, (message) => {
        console.log('Global message received:', message);

        // 1. Phát sự kiện để các trang khác (như Messages) có thể cập nhật UI
        window.dispatchEvent(new CustomEvent('pentachat:new-message', { detail: message }));

        // 2. Logic hiển thị Popup thông báo
        const isIncoming = message.fromId !== session.userId;
        if (isIncoming) {
          const hash = window.location.hash || '';
          const isAtMessages = hash.startsWith('#/messages');
          const queryString = hash.includes('?') ? hash.split('?')[1] : '';
          const params = new URLSearchParams(queryString);
          const currentChatWithId = params.get('id');

          // Chỉ hiện popup nếu không ở trang tin nhắn HOẶC đang chat với người khác
          if (!isAtMessages || String(currentChatWithId) !== String(message.fromId)) {
            notificationService.showNewMessage(message);
          }
        }
      });
    }).catch(err => {
      console.error('Failed to connect WebSocket:', err);
    });
  }

  console.log('Pentachat app initialized');
} catch (error) {
  console.error('Error initializing app:', error);
  document.getElementById('app').innerHTML = `
    <div class="container mt-5">
      <div class="alert alert-danger">
        <h4>Lỗi khởi tạo ứng dụng</h4>
        <p>${error.message}</p>
        <pre>${error.stack}</pre>
      </div>
    </div>
  `;
}
