import { initNavbar } from '../../components/navbar.js';
import { initSidebar, addSidebarStyles } from '../../components/sidebar.js';
import FriendService from '../../services/friend.service.js';
import AuthService from '../../services/auth.service.js';
import UserService from '../../services/user.service.js';
import CallService from '../../services/call.service.js';
import router from '../../router.js';
import * as Template from './friends.template.js';
import { initFriendsCall } from './friends.call.js';
import './friends.css';

let allFriends = [];
let removedFriends = new Set();
let searchResults = [];
let removedSearchResults = new Set();

export async function renderFriends() {
  const app = document.getElementById('app');
  const session = AuthService.getSession();

  if (!session) {
    router.navigate('/login');
    return;
  }

  addSidebarStyles();
  app.innerHTML = Template.getFriendsMainTemplate();

  initNavbar();
  initSidebar();

  await Promise.all([
    loadPendingRequests(),
    loadFriendsList()
  ]);
  setupEventListeners();

  CallService.initCallListeners(session.userId);
  initFriendsCall(session, allFriends, showAlert);
}

async function loadFriendsList() {
  const session = AuthService.getSession();
  try {
    const response = await FriendService.getFriendsList(session.userId);
    if (response.success && response.data) {
      allFriends = response.data;
      removedFriends.clear();
      renderFriendsList(allFriends);
    }
  } catch (error) {
    console.error('Error loading friends list:', error);
    document.getElementById('friends-list').innerHTML = `
      <div class="col-12 text-center py-4 text-danger">
        Khong the tai danh sach ban be
      </div>
    `;
  }
}

function renderFriendsList(friends) {
  const container = document.getElementById('friends-list');
  const session = AuthService.getSession();

  const visibleFriends = friends.filter((friend) => {
    const friendId = friend.fromUserId === session.userId ? friend.toUserId : friend.fromUserId;
    return !removedFriends.has(friendId);
  });

  if (!visibleFriends.length) {
    container.innerHTML = `
      <div class="col-12 text-center py-5 text-muted">
        <i class="bi bi-people fs-1"></i>
        <p class="mt-3">Khong tim thay ban be nao</p>
      </div>
    `;
    return;
  }

  container.innerHTML = visibleFriends.map((friend) => {
    const friendId = friend.fromUserId === session.userId ? friend.toUserId : friend.fromUserId;
    const friendUsername = friend.fromUserId === session.userId ? friend.toUsername : friend.fromUsername;
    const initials = friendUsername.substring(0, 2).toUpperCase();
    return Template.getFriendCardTemplate(friendId, friendUsername, initials);
  }).join('');

  setupFriendCardListeners();
}

async function loadPendingRequests() {
  const session = AuthService.getSession();
  try {
    const response = await FriendService.getPendingRequests(session.userId);
    if (response.success && response.data) {
      renderPendingRequests(response.data);
      document.getElementById('pending-count').textContent = response.data.length;
    }
  } catch (error) {
    console.error('Error loading pending requests:', error);
    document.getElementById('pending-requests').innerHTML = `
      <div class="text-center py-4 text-danger">
        Khong the tai loi moi ket ban
      </div>
    `;
  }
}

function renderPendingRequests(requests) {
  const container = document.getElementById('pending-requests');
  const session = AuthService.getSession();

  if (!requests || requests.length === 0) {
    container.innerHTML = `
      <div class="text-center py-5 text-muted">
        <i class="bi bi-inbox fs-1"></i>
        <p class="mt-3">Khong co loi moi ket ban nao</p>
      </div>
    `;
    return;
  }

  container.innerHTML = requests.map((req) => {
    const isReceived = req.toUserId === session.userId;
    return Template.getPendingRequestTemplate(req, isReceived, formatTime);
  }).join('');
}

function setupFriendCardListeners() {
  document.querySelectorAll('.hide-friend-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const friendId = parseInt(btn.dataset.friendId, 10);
      const username = btn.dataset.username;
      await handleHideFriend(friendId, username);
    });
  });

  document.querySelectorAll('.remove-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const friendId = parseInt(btn.dataset.friendId, 10);
      handleRemoveFriend(friendId);
    });
  });
}

function filterFriends(searchTerm) {
  const session = AuthService.getSession();
  const filtered = allFriends.filter((friend) => {
    const friendUsername = friend.fromUserId === session.userId ? friend.toUsername : friend.fromUsername;
    return friendUsername.toLowerCase().includes(searchTerm.toLowerCase());
  });
  renderFriendsList(filtered);
}

async function handleHideFriend(friendId, username) {
  if (!confirm(`An ${username} khoi danh sach hien tai?`)) return;
  removedFriends.add(friendId);
  const searchInput = document.getElementById('search-friends-input');
  const searchTerm = searchInput ? searchInput.value : '';
  if (searchTerm) filterFriends(searchTerm);
  else renderFriendsList(allFriends);
  showAlert(`${username} da duoc an khoi danh sach hien tai`, 'info');
}

function handleRemoveFriend(friendId) {
  removedFriends.add(friendId);
  const searchInput = document.getElementById('search-friends-input');
  const searchTerm = searchInput ? searchInput.value : '';
  if (searchTerm) filterFriends(searchTerm);
  else renderFriendsList(allFriends);
  showAlert('Da xoa khoi danh sach tam thoi', 'info');
}

async function searchUsers(searchTerm) {
  const container = document.getElementById('search-results');
  if (!searchTerm || searchTerm.length < 2) {
    container.innerHTML = `
      <div class="col-12 text-center py-5 text-muted">
        <i class="bi bi-search fs-1"></i>
        <p class="mt-3">Nhap it nhat 2 ky tu de tim kiem</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="col-12 text-center py-4">
      <span class="spinner"></span>
      <p class="mt-2">Dang tim kiem...</p>
    </div>
  `;

  try {
    const response = await UserService.searchUsers(searchTerm);
    if (response.success && response.data) {
      searchResults = response.data;
      renderSearchResults(searchResults);
    } else {
      container.innerHTML = `
        <div class="col-12 text-center py-5 text-muted">
          <i class="bi bi-inbox fs-1"></i>
          <p class="mt-3">Khong tim thay nguoi dung nao</p>
        </div>
      `;
    }
  } catch (error) {
    console.error('Error searching users:', error);
    container.innerHTML = `
      <div class="col-12 text-center py-5 text-danger">
        <i class="bi bi-exclamation-triangle fs-1"></i>
        <p class="mt-3">Khong the tim kiem nguoi dung</p>
      </div>
    `;
  }
}

function renderSearchResults(users) {
  const container = document.getElementById('search-results');
  const session = AuthService.getSession();

  const visibleUsers = users.filter((user) => !removedSearchResults.has(user.id) && user.id !== session.userId);

  if (!visibleUsers.length) {
    container.innerHTML = `
      <div class="col-12 text-center py-5 text-muted">
        <i class="bi bi-inbox fs-1"></i>
        <p class="mt-3">Khong tim thay nguoi dung nao</p>
      </div>
    `;
    return;
  }

  container.innerHTML = visibleUsers.map((user) => {
    const initials = (user.username || 'U').substring(0, 2).toUpperCase();
    return Template.getSearchUserCardTemplate(user, initials);
  }).join('');

  setupSearchCardListeners();
}

function setupSearchCardListeners() {
  document.querySelectorAll('.add-friend-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const userId = parseInt(btn.dataset.userId, 10);
      const username = btn.dataset.username;
      await handleAddFriend(userId, username, btn);
    });
  });

  document.querySelectorAll('.remove-search-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const userId = parseInt(btn.dataset.userId, 10);
      handleRemoveSearchResult(userId);
    });
  });
}

async function handleAddFriend(userId, username, button) {
  const session = AuthService.getSession();
  try {
    const response = await FriendService.sendRequest({
      fromUserId: session.userId,
      toUsername: username
    });
    if (response.success) {
      showAlert(`Da gui loi moi ket ban den ${username}!`, 'success');
      button.innerHTML = '<i class="bi bi-check-lg me-1"></i> Da gui loi moi';
      button.disabled = true;
      button.classList.remove('btn-primary');
      button.classList.add('btn-secondary');
      await loadPendingRequests();
    }
  } catch (error) {
    showAlert(error.message || 'Khong the gui loi moi ket ban', 'danger');
  }
}

function handleRemoveSearchResult(userId) {
  removedSearchResults.add(userId);
  renderSearchResults(searchResults);
  showAlert('Da xoa khoi ket qua tim kiem', 'info');
}

function setupEventListeners() {
  const searchInput = document.getElementById('search-friends-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      filterFriends(e.target.value);
    });
  }

  const searchUsersInput = document.getElementById('search-users-input');
  if (searchUsersInput) {
    let searchTimeout;
    searchUsersInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        searchUsers(e.target.value);
      }, 500);
    });
  }

  document.querySelectorAll('#friendTabs .nav-link').forEach((tab) => {
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelectorAll('#friendTabs .nav-link').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      const tabName = tab.dataset.tab;
      document.querySelectorAll('.tab-pane').forEach((pane) => {
        pane.style.display = 'none';
        pane.classList.remove('active');
      });
      const targetPane = document.getElementById(`${tabName}-tab`);
      targetPane.style.display = 'block';
      targetPane.classList.add('active');
    });
  });
}

window.startChat = function (friendId, username) {
  localStorage.setItem('chatWithUserId', friendId);
  localStorage.setItem('chatWithUsername', username);
  router.navigate(`/messages?type=direct&id=${friendId}&name=${encodeURIComponent(username)}`);
};

window.acceptFriend = async function (requestId) {
  try {
    const response = await FriendService.acceptRequest(requestId);
    if (response.success) {
      showAlert('Da chap nhan loi moi ket ban!', 'success');
      await loadPendingRequests();
      await loadFriendsList();
    }
  } catch (error) {
    showAlert(error.message || 'Khong the chap nhan loi moi', 'danger');
  }
};

window.rejectFriend = async function (requestId) {
  if (!confirm('Ban co chac muon tu choi loi moi nay?')) return;
  try {
    const response = await FriendService.rejectRequest(requestId);
    if (response.success) {
      showAlert('Da tu choi loi moi ket ban', 'info');
      await loadPendingRequests();
    }
  } catch (error) {
    showAlert(error.message || 'Khong the tu choi loi moi', 'danger');
  }
};

function showAlert(message, type) {
  const container = document.getElementById('alert-container');
  if (!container) return;
  container.innerHTML = `
    <div class="alert alert-${type} alert-dismissible fade show" role="alert">
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    </div>
  `;
  setTimeout(() => { container.innerHTML = ''; }, 5000);
}

function formatTime(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleString('vi-VN');
}
