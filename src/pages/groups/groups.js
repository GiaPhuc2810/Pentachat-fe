import { initNavbar } from '../../components/navbar.js';
import { initSidebar, addSidebarStyles } from '../../components/sidebar.js';
import GroupService from '../../services/group.service.js';
import AuthService from '../../services/auth.service.js';
import FriendService from '../../services/friend.service.js';
import router from '../../router.js';
import * as Template from './groups.template.js';
import './groups.css';

let allFriends = [];
let allGroups = [];
let selectedFriends = new Set();

export async function renderGroups() {
  const app = document.getElementById('app');
  const session = AuthService.getSession();

  if (!session) {
    router.navigate('/login');
    return;
  }

  addSidebarStyles();
  app.innerHTML = Template.getGroupsMainTemplate();

  initNavbar();
  initSidebar();

  await loadGroups();
  setupEventListeners();
}

async function loadGroups() {
  try {
    const response = await GroupService.getMyGroups();
    if (response.success && Array.isArray(response.data)) {
      allGroups = response.data;
      renderGroupsList(allGroups);
      return;
    }

    document.getElementById('groups-container').innerHTML = Template.getGroupsErrorTemplate('Khong the tai danh sach nhom');
  } catch (error) {
    console.error('Error loading groups:', error);
    document.getElementById('groups-container').innerHTML = Template.getGroupsErrorTemplate('Khong the tai danh sach nhom');
  }
}

function renderGroupsList(groups) {
  const container = document.getElementById('groups-container');
  if (!groups || groups.length === 0) {
    container.innerHTML = Template.getEmptyGroupsTemplate();
    return;
  }

  container.innerHTML = groups.map((group) => Template.getGroupItemTemplate(group)).join('');
}

async function loadFriendsList() {
  const session = AuthService.getSession();
  const friendsListContainer = document.getElementById('friends-list');
  try {
    const response = await FriendService.getFriendsList(session.userId);
    if (response.success && Array.isArray(response.data)) {
      allFriends = response.data;
      renderFriendsList(allFriends);
      return;
    }

    friendsListContainer.innerHTML = `<div class="text-center py-3 text-muted">Chua co ban be nao</div>`;
  } catch (error) {
    console.error('Error loading friends:', error);
    friendsListContainer.innerHTML = `<div class="text-center py-3 text-danger">Khong the tai danh sach ban be</div>`;
  }
}

function renderFriendsList(friends) {
  const session = AuthService.getSession();
  const friendsListContainer = document.getElementById('friends-list');
  if (!friends || friends.length === 0) {
    friendsListContainer.innerHTML = `<div class="text-center py-3 text-muted">Khong tim thay ban be</div>`;
    return;
  }
  friendsListContainer.innerHTML = friends.map((friend) => {
    const friendId = getFriendUserId(friend, session);
    const friendName = getFriendDisplayName(friend, session);
    const isSelected = selectedFriends.has(friendId);
    return Template.getFriendItemTemplate(friendId, friendName, isSelected);
  }).join('');

  document.querySelectorAll('.friend-item').forEach((item) => {
    item.addEventListener('click', () => {
      toggleFriendSelection(parseInt(item.dataset.friendId, 10));
    });
  });
}

function toggleFriendSelection(friendId) {
  if (selectedFriends.has(friendId)) selectedFriends.delete(friendId);
  else selectedFriends.add(friendId);

  const friendItem = document.querySelector(`[data-friend-id="${friendId}"]`);
  if (friendItem) {
    friendItem.classList.toggle('selected');
    const checkbox = friendItem.querySelector('.friend-checkbox');
    checkbox.innerHTML = selectedFriends.has(friendId)
      ? '<i class="bi bi-check-circle-fill text-primary"></i>'
      : '<i class="bi bi-circle"></i>';
  }
  document.getElementById('selected-count').textContent = selectedFriends.size;
}

function filterFriends(searchTerm) {
  const session = AuthService.getSession();
  const filtered = allFriends.filter((friend) => {
    const name = getFriendDisplayName(friend, session).toLowerCase();
    const friendId = String(getFriendUserId(friend, session));
    const search = searchTerm.toLowerCase();
    return name.includes(search) || friendId.includes(search);
  });
  renderFriendsList(filtered);
}

function getFriendUserId(friend, session) {
  return friend.fromUserId === session.userId ? friend.toUserId : friend.fromUserId;
}

function getFriendDisplayName(friend, session) {
  return friend.fromUserId === session.userId ? friend.toUsername : friend.fromUsername;
}

function setupEventListeners() {
  const session = AuthService.getSession();
  const modal = document.getElementById('create-group-modal');
  const detailsModal = document.getElementById('group-details-modal');
  const createBtn = document.getElementById('create-group-btn');

  if (createBtn) {
    createBtn.addEventListener('click', async () => {
      selectedFriends.clear();
      document.getElementById('selected-count').textContent = '0';
      await loadFriendsList();
      modal.style.display = 'flex';
    });
  }

  const closeCreateModal = () => {
    modal.style.display = 'none';
    document.getElementById('create-group-form').reset();
    document.getElementById('search-friends').value = '';
    selectedFriends.clear();
  };

  const closeDetailsModal = () => {
    detailsModal.style.display = 'none';
    document.getElementById('group-details-content').innerHTML = '';
  };

  document.getElementById('close-modal').addEventListener('click', closeCreateModal);
  document.getElementById('cancel-btn').addEventListener('click', closeCreateModal);
  document.getElementById('close-details-modal').addEventListener('click', closeDetailsModal);
  document.getElementById('close-details-btn').addEventListener('click', closeDetailsModal);

  modal.addEventListener('click', (e) => { if (e.target === modal) closeCreateModal(); });
  detailsModal.addEventListener('click', (e) => { if (e.target === detailsModal) closeDetailsModal(); });

  document.getElementById('search-friends').addEventListener('input', (e) => filterFriends(e.target.value));

  document.getElementById('submit-group-btn').addEventListener('click', async () => {
    const name = document.getElementById('group-name').value.trim();
    if (!name) return showAlert('Vui long nhap ten nhom', 'warning');
    if (selectedFriends.size < 3) return showAlert('Vui long chon it nhat 3 nguoi ban de tao nhom', 'warning');

    const memberIds = Array.from(selectedFriends);
    if (!memberIds.includes(session.userId)) memberIds.push(session.userId);

    try {
      const response = await GroupService.createGroup({ name, memberIds });
      if (response.success) {
        showAlert('Tao nhom thanh cong!', 'success');
        closeCreateModal();
        await loadGroups();
      }
    } catch (error) {
      showAlert(error.message || 'Khong the tao nhom', 'danger');
    }
  });
}

window.openGroupChat = function (groupId) {
  const group = allGroups.find((item) => item.id === groupId);
  const name = group?.name || `Group ${groupId}`;
  router.navigate(`/messages?type=group&id=${groupId}&name=${encodeURIComponent(name)}`);
};

window.viewGroupDetails = function (groupId) {
  const group = allGroups.find((item) => item.id === groupId);
  if (!group) {
    showAlert('Khong tim thay thong tin nhom', 'warning');
    return;
  }

  document.getElementById('group-details-content').innerHTML = Template.getGroupDetailsTemplate(group);
  document.getElementById('group-details-modal').style.display = 'flex';
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
