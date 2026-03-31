import { renderNavbar, initNavbar } from '../components/navbar.js';
import { renderSidebar, initSidebar, addSidebarStyles } from '../components/sidebar.js';
import AuthService from '../services/auth.service.js';
import websocketService from '../services/websocket.service.js';
import UserService from '../services/user.service.js';
import WalletService from '../services/wallet.service.js';
import MessageService from '../services/message.service.js';
import FriendService from '../services/friend.service.js';
import router from '../router.js';

export async function renderDashboard() {
  const app = document.getElementById('app');
  const session = AuthService.getSession();

  if (!session) {
    router.navigate('/login');
    return;
  }

  // Add sidebar styles
  addSidebarStyles();

  app.innerHTML = `
    ${renderNavbar()}
    ${renderSidebar()}
    
    <div class="main-content">
      <!-- Mobile Menu Button -->
      <button class="btn btn-outline-primary d-lg-none mb-3" id="mobile-menu-btn">
        <i class="bi bi-list"></i> Menu
      </button>

      <!-- Welcome Section -->
      <div class="row mb-4">
        <div class="col-12">
          <h2 class="mb-1">Chào mừng trở lại, ${session.username}!</h2>
          <p class="text-muted">Đây là tổng quan về hoạt động của bạn</p>
        </div>
      </div>

      <!-- Stats Cards -->
      <div class="row g-3 mb-4" id="stats-container">

        <div class="col-md-3 col-sm-6">
          <div class="card stat-card">
            <div class="card-body">
              <div class="d-flex justify-content-between align-items-center">
                <div>
                  <p class="text-muted mb-1 small">Bạn bè</p>
                  <h3 class="mb-0" id="stat-friends">0</h3>
                </div>
                <div class="stat-icon bg-success">
                  <i class="bi bi-people text-white"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="col-md-3 col-sm-6">
          <div class="card stat-card">
            <div class="card-body">
              <div class="d-flex justify-content-between align-items-center">
                <div>
                  <p class="text-muted mb-1 small">Nhóm</p>
                  <h3 class="mb-0" id="stat-groups">0</h3>
                </div>
                <div class="stat-icon bg-info">
                  <i class="bi bi-collection text-white"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="col-md-3 col-sm-6">
          <div class="card stat-card">
            <div class="card-body">
              <div class="d-flex justify-content-between align-items-center">
                <div>
                  <p class="text-muted mb-1 small">Số dư ví</p>
                  <h3 class="mb-0" id="stat-wallet">$0</h3>
                </div>
                <div class="stat-icon bg-warning">
                  <i class="bi bi-wallet2 text-white"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Main Content Grid -->
      <div class="row g-4">
        <!-- Recent Messages -->
        <div class="col-lg-8">
          <div class="card">
            <div class="card-header d-flex justify-content-between align-items-center">
              <h5 class="mb-0">Tin nhắn gần đây</h5>
              <a href="#/messages" class="btn btn-sm btn-outline-primary">Xem tất cả</a>
            </div>
            <div class="card-body p-0">
              <div class="list-group list-group-flush" id="recent-messages-list">
                <!-- Data loaded dynamically -->
              </div>
            </div>
          </div>
        </div>

        <!-- Quick Actions & Online Friends -->
        <div class="col-lg-4">
          <!-- Quick Actions -->
          <div class="card mb-4">
            <div class="card-header">
              <h5 class="mb-0">Thao tác nhanh</h5>
            </div>
            <div class="card-body">
              <div class="d-grid gap-2">
                <a href="#/messages" class="btn btn-primary">
                  <i class="bi bi-plus-circle me-2"></i>Tin nhắn mới
                </a>
                <a href="#/friends" class="btn btn-outline-primary">
                  <i class="bi bi-person-plus me-2"></i>Thêm bạn bè
                </a>
                <a href="#/groups" class="btn btn-outline-primary">
                  <i class="bi bi-people me-2"></i>Tạo nhóm
                </a>
              </div>
            </div>
          </div>

          <!-- Online Friends -->
          <div class="card">
            <div class="card-header">
              <h5 class="mb-0">Bạn bè đang online</h5>
            </div>
            <div class="card-body p-0">
              <div class="list-group list-group-flush" id="online-friends-list">
                <!-- Data loaded dynamically -->
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Initialize components
  initNavbar();
  initSidebar();
  addDashboardStyles();

  // Load stats and data
  loadDashboardData();

  // Connect WebSocket
  try {
    await websocketService.connect();
    console.log('WebSocket connected');
  } catch (error) {
    console.error('Failed to connect WebSocket:', error);
  }
}

async function loadDashboardData() {
  const session = AuthService.getSession();

  try {
    // 1. Fetch Stats
    const statsResponse = await UserService.getDashboardStats();
    if (statsResponse.success && statsResponse.data) {
      const stats = statsResponse.data;
      document.getElementById('stat-friends').textContent = stats.friendCount;
      document.getElementById('stat-groups').textContent = stats.groupCount;
      document.getElementById('stat-wallet').textContent = new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
      }).format(stats.walletBalance);
    }

    // 2. Fetch Recent Messages (Inbox)
    const inboxResponse = await MessageService.getInbox(session.userId);
    if (inboxResponse.success && inboxResponse.data) {
      renderRecentMessages(inboxResponse.data);
    }

    // 3. Fetch Friends List
    const friendsResponse = await FriendService.getFriendsList(session.userId);
    if (friendsResponse.success && friendsResponse.data) {
      renderOnlineFriends(friendsResponse.data);
    } else {
      renderOnlineFriends([]);
    }

  } catch (error) {
    console.error('Error loading dashboard data:', error);
  }
}

function renderRecentMessages(messages) {
  const container = document.querySelector('#recent-messages-list');
  if (!container) return;

  if (!messages || messages.length === 0) {
    container.innerHTML = `
        <div class="list-group-item text-center py-4 text-muted">
          Chưa có tin nhắn mới
        </div>
      `;
    return;
  }

  // Lấy 5 tin nhắn gần nhất
  const recentMessages = messages.slice(0, 5);

  container.innerHTML = recentMessages.map(msg => `
    <div class="list-group-item list-group-item-action">
      <div class="d-flex align-items-center" style="cursor: pointer" onclick="window.location.hash = '#/messages'">
        <div class="avatar me-3">
          ${msg.fromUsername ? msg.fromUsername.substring(0, 2).toUpperCase() : '??'}
        </div>
        <div class="flex-grow-1">
          <div class="d-flex justify-content-between align-items-start">
            <h6 class="mb-1">${msg.fromUsername || 'Người dùng'}</h6>
            <small class="text-muted">${new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>
          </div>
          <p class="mb-0 text-muted small text-truncate" style="max-width: 250px;">${msg.content}</p>
        </div>
      </div>
    </div>
  `).join('');
}

function renderOnlineFriends(friends) {
  const container = document.getElementById('online-friends-list');
  if (!container) return;

  console.log('Rendering online friends:', friends);

  if (!friends || friends.length === 0) {
    container.innerHTML = `
      <div class="list-group-item text-center py-3 text-muted small">
        Không có bạn bè online
      </div>
    `;
    return;
  }

  // For now, show all friends as online (we'll add real online status later)
  // Limit to first 10 friends
  const displayFriends = friends.slice(0, 10);

  container.innerHTML = displayFriends.map(friend => {
    const displayName = friend.fromUsername || friend.username || friend.name || 'Unknown';
    const initials = displayName.substring(0, 2).toUpperCase();

    return `
      <div class="list-group-item">
        <div class="d-flex align-items-center">
          <div class="avatar avatar-sm status-indicator online me-2">
            ${initials}
          </div>
          <div class="flex-grow-1">
            <div class="fw-medium">${displayName}</div>
            ${friend.email ? `<small class="text-muted">${friend.email}</small>` : ''}
          </div>
          <span class="badge badge-success">
            <i class="bi bi-circle-fill" style="font-size: 0.5rem;"></i>
          </span>
        </div>
      </div>
    `;
  }).join('');
}

function addDashboardStyles() {
  if (!document.getElementById('dashboard-styles')) {
    const style = document.createElement('style');
    style.id = 'dashboard-styles';
    style.textContent = `
      .stat-card {
        transition: transform 0.2s;
      }

      .stat-card:hover {
        transform: translateY(-4px);
      }

      .stat-icon {
        width: 3rem;
        height: 3rem;
        border-radius: 0.5rem;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.5rem;
      }

      .list-group-item-action:hover {
        background-color: var(--bg-hover);
      }

      .navbar {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        z-index: 1030;
      }

      .dropdown-menu {
        border: 1px solid var(--border-color);
        box-shadow: var(--shadow-md);
        border-radius: var(--radius-md);
      }

      .dropdown-item {
        padding: 0.5rem 1rem;
        transition: background-color 0.15s;
      }

      .dropdown-item:hover {
        background-color: var(--bg-hover);
      }

      .dropdown-divider {
        margin: 0.5rem 0;
      }
    `;
    document.head.appendChild(style);
  }
}
