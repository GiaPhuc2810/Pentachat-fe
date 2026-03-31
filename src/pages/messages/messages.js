import { initNavbar } from '../../components/navbar.js';
import { initSidebar, addSidebarStyles } from '../../components/sidebar.js';
import MessageService from '../../services/message.service.js';
import AuthService from '../../services/auth.service.js';
import CallService from '../../services/call.service.js';
import websocketService from '../../services/websocket.service.js';
import notificationService from '../../services/notification.service.js';
import router from '../../router.js';
import * as Template from './messages.template.js';
import './messages.css';

let currentChat = null;

export async function renderMessages() {
  const app = document.getElementById('app');
  const session = AuthService.getSession();

  if (!session) {
    router.navigate('/login');
    return;
  }

  addSidebarStyles();
  app.innerHTML = Template.getMessagesMainTemplate();

  initNavbar();
  initSidebar();

  await loadInbox();
  setupWebSocket();
  setupEventListeners();

  CallService.initCallListeners(session.userId);
  setupIncomingCallHandler();

  const initialChat = getInitialChatFromRouteOrStorage();
  if (initialChat) {
    await openChat(initialChat);
  }
}

function getInitialChatFromRouteOrStorage() {
  const hash = window.location.hash || '';
  const [, queryString = ''] = hash.split('?');
  const params = new URLSearchParams(queryString);
  const type = params.get('type');
  const id = parseInt(params.get('id'), 10);
  const name = params.get('name');

  if ((type === 'direct' || type === 'group') && Number.isInteger(id)) {
    return {
      type,
      id,
      name: name || null
    };
  }

  const chatWithUserId = localStorage.getItem('chatWithUserId');
  const chatWithUsername = localStorage.getItem('chatWithUsername');
  if (chatWithUserId) {
    localStorage.removeItem('chatWithUserId');
    localStorage.removeItem('chatWithUsername');
    return {
      type: 'direct',
      id: parseInt(chatWithUserId, 10),
      name: chatWithUsername || null
    };
  }

  return null;
}

function updateRouteForChat(chat) {
  const params = new URLSearchParams({
    type: chat.type,
    id: String(chat.id)
  });

  if (chat.name) {
    params.set('name', chat.name);
  }

  const nextHash = `#/messages?${params.toString()}`;
  if (window.location.hash !== nextHash) {
    window.history.replaceState(null, '', nextHash);
  }
}

async function loadInbox() {
  const session = AuthService.getSession();
  try {
    const response = await MessageService.getInbox(session.userId);
    if (response.success && response.data) {
      renderConversationsList(response.data);
      return;
    }

    renderInboxError('Khong the tai danh sach tro chuyen');
  } catch (error) {
    console.error('Error loading inbox:', error);
    renderInboxError('Khong the tai danh sach tro chuyen');
  }
}

function renderInboxError(message) {
  document.getElementById('conversations-list').innerHTML = `
    <div class="text-center py-4 text-danger">${message}</div>
  `;
}

function renderConversationsList(conversations) {
  const list = document.getElementById('conversations-list');
  const session = AuthService.getSession();

  if (!conversations || conversations.length === 0) {
    list.innerHTML = `<div class="text-center py-4 text-muted">Chua co tin nhan nao</div>`;
    return;
  }

  const conversationMap = new Map();
  conversations.forEach((msg) => {
    const partnerId = msg.fromId === session.userId ? msg.toId : msg.fromId;
    const partnerName = msg.fromId === session.userId ? msg.toUsername : msg.fromUsername;
    const isUnread = !msg.isRead && msg.toId === session.userId;

    if (!conversationMap.has(partnerId)) {
      conversationMap.set(partnerId, {
        userId: partnerId,
        username: partnerName || `User ${partnerId}`,
        lastMessage: msg.content,
        time: msg.createdAt,
        unread: isUnread
      });
    } else if (isUnread) {
      conversationMap.get(partnerId).unread = true;
    }
  });

  list.innerHTML = Array.from(conversationMap.values()).map((conv) =>
    Template.getConversationItemTemplate(conv, currentChat, formatTime)
  ).join('');

  document.querySelectorAll('.conversation-item').forEach((item) => {
    item.addEventListener('click', () => {
      const userId = parseInt(item.dataset.userId, 10);
      const username = item.dataset.username;
      openChat({ type: 'direct', id: userId, name: username });
    });
  });
}

async function openChat(chat) {
  currentChat = {
    type: chat.type,
    id: chat.id,
    name: chat.name || getCurrentChatName(chat)
  };

  updateRouteForChat(currentChat);
  syncConversationSelection();

  if (currentChat.type === 'group') {
    await loadGroupConversation(currentChat.id, currentChat.name);
    return;
  }

  await loadDirectConversation(currentChat.id, currentChat.name);
}

function getCurrentChatName(chat) {
  if (chat.type === 'group') {
    return chat.name || `Group ${chat.id}`;
  }

  const item = document.querySelector(`.conversation-item[data-user-id="${chat.id}"]`);
  return item?.dataset.username || chat.name || `User ${chat.id}`;
}

function syncConversationSelection() {
  document.querySelectorAll('.conversation-item').forEach((item) => {
    const userId = parseInt(item.dataset.userId, 10);
    const isActive = currentChat?.type === 'direct' && userId === currentChat.id;
    item.classList.toggle('active', isActive);
  });
}

async function loadDirectConversation(userId, username = null) {
  const session = AuthService.getSession();

  try {
    const response = await MessageService.getConversation(session.userId, userId);
    if (!response.success || !Array.isArray(response.data)) {
      renderChatError({
        title: username || `User ${userId}`,
        message: 'Khong the tai lich su tro chuyen. Vui long thu lai sau.'
      });
      return;
    }

    currentChat = {
      type: 'direct',
      id: userId,
      name: username || getCurrentChatName({ type: 'direct', id: userId, name: username })
    };

    renderDirectConversationMessages(response.data, currentChat.id, currentChat.name);
    toggleChatComposer(true);
  } catch (error) {
    console.error('Error loading conversation:', error);
    renderChatError({
      title: username || `User ${userId}`,
      message: error.message || 'Khong the tai lich su tro chuyen. Vui long thu lai sau.'
    });
  }
}

async function loadGroupConversation(groupId, groupName = null) {
  try {
    const response = await MessageService.getGroupHistory(groupId);
    if (!response.success || !Array.isArray(response.data)) {
      renderChatError({
        title: groupName || `Group ${groupId}`,
        message: 'Khong the tai lich su chat nhom do backend chua tra du lieu hop le.'
      });
      return;
    }

    currentChat = {
      type: 'group',
      id: groupId,
      name: groupName || `Group ${groupId}`
    };

    renderGroupConversationMessages(response.data, currentChat.id, currentChat.name);
    toggleChatComposer(true);
  } catch (error) {
    console.error('Error loading group conversation:', error);
    renderChatError({
      title: groupName || `Group ${groupId}`,
      message: error.message || 'Khong the tai lich su chat nhom. Vui long thu lai sau.'
    });
  }
}

function renderDirectConversationMessages(messages, partnerId, partnerName = null) {
  const session = AuthService.getSession();
  const chatMessages = document.getElementById('chat-messages');
  const chatHeader = document.getElementById('chat-header');

  const displayName = partnerName || `User ${partnerId}`;
  chatHeader.innerHTML = Template.getDirectChatHeaderTemplate(partnerId, displayName);

  if (!messages.length) {
    chatMessages.innerHTML = Template.getChatStatusTemplate(
      'Chua co tin nhan nao. Hay bat dau cuoc tro chuyen!'
    );
    return;
  }

  chatMessages.innerHTML = messages.map((msg) => {
    const isOwn = msg.fromId === session.userId;
    return Template.getMessageTemplate(msg, isOwn, formatTime, { type: 'direct' });
  }).join('');

  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function renderGroupConversationMessages(messages, groupId, groupName) {
  const session = AuthService.getSession();
  const chatMessages = document.getElementById('chat-messages');
  const chatHeader = document.getElementById('chat-header');

  chatHeader.innerHTML = Template.getGroupChatHeaderTemplate(groupId, groupName || `Group ${groupId}`);

  if (!messages.length) {
    chatMessages.innerHTML = Template.getChatStatusTemplate(
      'Nhom nay chua co tin nhan nao. Hay gui tin nhan dau tien!'
    );
    return;
  }

  chatMessages.innerHTML = messages.map((msg) => {
    const isOwn = msg.fromId === session.userId;
    const senderName = msg.fromUsername || (msg.fromId ? `User ${msg.fromId}` : 'Unknown user');
    return Template.getMessageTemplate(msg, isOwn, formatTime, {
      type: 'group',
      senderName
    });
  }).join('');

  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function renderChatError({ title, message }) {
  const chatHeader = document.getElementById('chat-header');
  const chatMessages = document.getElementById('chat-messages');

  chatHeader.innerHTML = Template.getChatFallbackHeaderTemplate(title);
  chatMessages.innerHTML = Template.getChatStatusTemplate(message, 'danger');
  toggleChatComposer(false);
}

function toggleChatComposer(visible) {
  document.getElementById('chat-footer').style.display = visible ? 'block' : 'none';
}

function setupWebSocket() {
  const session = AuthService.getSession();
  websocketService.subscribeToMessages(session.userId, (message) => {
    const currentActiveId = getActiveDirectUserId();
    const isIncoming = message.fromId !== session.userId;

    if (isIncoming) {
      // Nếu không phải đang mở đúng cửa sổ chat với người gửi -> Hiện popup
      if (currentActiveId !== message.fromId) {
        notificationService.showNewMessage(message);
      } else {
        // Đang mở đúng cửa sổ chat -> Thêm tin nhắn vào màn hình
        appendMessage(message, { type: 'direct' });
      }
    } else if (currentActiveId === message.toId) {
      // Tin nhắn do chính mình gửi từ thiết bị khác (nếu có)
      appendMessage(message, { type: 'direct' });
    }
    
    loadInbox();
  });
}

function getActiveDirectUserId() {
  return currentChat?.type === 'direct' ? currentChat.id : null;
}

function appendMessage(message, chatMeta) {
  const session = AuthService.getSession();
  const chatMessages = document.getElementById('chat-messages');
  if (!chatMessages) return; // Bảo vệ nếu DOM đã bị hủy

  const isOwn = message.fromId === session.userId;
  const messageMarkup = Template.getMessageTemplate(message, isOwn, formatTime, chatMeta);
  chatMessages.insertAdjacentHTML('beforeend', messageMarkup);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function setupEventListeners() {
  const session = AuthService.getSession();
  const form = document.getElementById('message-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!currentChat) return;

      const input = document.getElementById('message-input');
      const content = input.value.trim();
      if (!content) return;

      try {
        if (currentChat.type === 'group') {
          await MessageService.sendGroupMessage({
            from: session.userId,
            groupId: currentChat.id,
            content
          });
        } else {
          await MessageService.sendMessage({
            from: session.userId,
            to: currentChat.id,
            content
          });
        }

        input.value = '';
        await reloadCurrentChat();
      } catch (error) {
        console.error('Error sending message:', error);
        renderInlineComposerAlert(error.message || 'Khong the gui tin nhan.');
      }
    });
  }
}

async function reloadCurrentChat() {
  if (!currentChat) return;
  if (currentChat.type === 'group') {
    await loadGroupConversation(currentChat.id, currentChat.name);
    return;
  }

  await loadDirectConversation(currentChat.id, currentChat.name);
}

function renderInlineComposerAlert(message) {
  const chatMessages = document.getElementById('chat-messages');
  chatMessages.insertAdjacentHTML('beforeend', Template.getChatStatusTemplate(message, 'danger', true));
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function formatTime(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  if (diff < 60000) return 'Vua xong';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} phut truoc`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} gio truoc`;
  return date.toLocaleDateString('vi-VN');
}

// Call Logic
let currentCall = null;
let isVideoEnabled = true;
let isAudioEnabled = true;
let currentVoiceLevel = 0;
let remoteAudioElement = null;

window.startVideoCall = async function (friendId, username) {
  const session = AuthService.getSession();
  const result = await CallService.startVideoCall(session.userId, friendId, username);
  if (result.success) {
    currentCall = { type: 'video', friendId, username, isVideoEnabled: true };
    showCallModal('video', username);
    document.getElementById('call-status').textContent = 'Dang goi...';
  } else {
    alert('Khong the bat dau cuoc goi video: ' + result.error);
  }
};

window.startAudioCall = async function (friendId, username) {
  const session = AuthService.getSession();
  const result = await CallService.startAudioCall(session.userId, friendId, username);
  if (result.success) {
    currentCall = { type: 'audio', friendId, username };
    showCallModal('audio', username);
    document.getElementById('call-status').textContent = 'Dang goi...';
  } else {
    alert('Khong the bat dau cuoc goi audio: ' + result.error);
  }
};

function showCallModal(callType, username) {
  let modal = document.getElementById('call-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'call-modal';
    modal.className = 'call-modal-overlay';
    document.body.appendChild(modal);
  }
  modal.innerHTML = Template.getCallModalTemplate();
  const title = callType === 'video' ? 'Cuoc goi Video' : 'Cuoc goi Audio';
  const initials = username.substring(0, 2).toUpperCase();
  document.getElementById('call-modal-title').textContent = title;
  document.getElementById('call-username').textContent = username;
  document.getElementById('call-avatar').textContent = initials;
  resetCallVoiceUI();

  const toggleVideoBtn = document.getElementById('toggle-video-btn');
  if (callType === 'video') {
    toggleVideoBtn.style.display = 'inline-flex';
    isVideoEnabled = true;
    toggleVideoBtn.innerHTML = '<i class="bi bi-camera-video-fill"></i>';
    toggleVideoBtn.classList.remove('call-btn-danger');
    toggleVideoBtn.classList.add('call-btn-secondary');
  } else {
    toggleVideoBtn.style.display = 'none';
  }

  modal.style.display = 'flex';
  setTimeout(() => modal.classList.add('show'), 10);
}

window.toggleVideo = function () {
  if (!currentCall || currentCall.type !== 'video') return;
  const enabled = CallService.toggleVideo();
  isVideoEnabled = enabled;
  const toggleBtn = document.getElementById('toggle-video-btn');
  const statusText = document.getElementById('call-status');
  if (enabled) {
    toggleBtn.innerHTML = '<i class="bi bi-camera-video-fill"></i>';
    toggleBtn.classList.remove('call-btn-danger');
    toggleBtn.classList.add('call-btn-secondary');
    statusText.textContent = 'Camera dang bat';
  } else {
    toggleBtn.innerHTML = '<i class="bi bi-camera-video-off-fill"></i>';
    toggleBtn.classList.remove('call-btn-secondary');
    toggleBtn.classList.add('call-btn-danger');
    statusText.textContent = 'Camera da tat';
  }
};

window.toggleMute = function () {
  const enabled = CallService.toggleAudio();
  isAudioEnabled = enabled;
  const toggleBtn = document.getElementById('toggle-audio-btn');
  const statusText = document.getElementById('call-status');
  if (enabled) {
    toggleBtn.innerHTML = '<i class="bi bi-mic-fill"></i>';
    toggleBtn.classList.remove('call-btn-danger');
    toggleBtn.classList.add('call-btn-secondary');
    statusText.textContent = 'Mic dang bat';
  } else {
    toggleBtn.innerHTML = '<i class="bi bi-mic-mute-fill"></i>';
    toggleBtn.classList.remove('call-btn-secondary');
    toggleBtn.classList.add('call-btn-danger');
    statusText.textContent = 'Mic da tat';
  }
};

window.endCall = function () {
  CallService.endCall();
  const modal = document.getElementById('call-modal');
  if (modal) {
    modal.classList.remove('show');
    setTimeout(() => { modal.style.display = 'none'; }, 300);
  }
  currentCall = null;
  resetCallVoiceUI();
  if (remoteAudioElement) remoteAudioElement.srcObject = null;
};

function setupIncomingCallHandler() {
  window.onRemoteStream = async function (stream) {
    if (!stream) return;
    if (!remoteAudioElement) {
      remoteAudioElement = document.createElement('audio');
      remoteAudioElement.id = 'remote-call-audio';
      remoteAudioElement.autoplay = true;
      remoteAudioElement.playsInline = true;
      remoteAudioElement.style.display = 'none';
      document.body.appendChild(remoteAudioElement);
    }
    remoteAudioElement.srcObject = stream;
    try { await remoteAudioElement.play(); } catch (error) { console.warn('Remote audio autoplay blocked:', error); }
  };

  window.onCallStateChange = function ({ status }) {
    const callStatus = document.getElementById('call-status');
    if (!callStatus) return;
    if (status === 'dialing') callStatus.textContent = 'Dang goi...';
    else if (status === 'accepted') callStatus.textContent = 'Ben kia da nhan cuoc goi...';
    else if (status === 'connecting') callStatus.textContent = 'Dang ket noi...';
    else if (status === 'connected') callStatus.textContent = 'Da ket noi';
    else if (status === 'reconnecting') callStatus.textContent = 'Ket noi yeu, dang thu lai...';
    else if (status === 'ended') callStatus.textContent = 'Cuoc goi da ket thuc';
  };

  window.onCallAudioLevel = function ({ local = 0, remote = 0 }) {
    currentVoiceLevel = Math.max(local, remote);
    applyVoiceLevelToUI();
  };

  window.onIncomingCall = function (message) {
    const callerId = message.fromUserId;
    const callerName = getActiveDirectUserId() === callerId
      ? document.querySelector('.conversation-item.active h6')?.textContent || `User ${callerId}`
      : `User ${callerId}`;
    showIncomingCallModal(callerId, callerName, message.type || 'audio');
  };

  window.onCallRejected = window.onCallEnded = function () {
    const modal = document.getElementById('call-modal');
    if (modal) {
      modal.classList.remove('show');
      setTimeout(() => { modal.style.display = 'none'; }, 300);
    }
    currentCall = null;
    resetCallVoiceUI();
    if (remoteAudioElement) remoteAudioElement.srcObject = null;
  };
}

function showIncomingCallModal(callerId, callerName, callType) {
  let modal = document.getElementById('incoming-call-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'incoming-call-modal';
    modal.className = 'call-modal-overlay';
    document.body.appendChild(modal);
  }
  modal.innerHTML = Template.getIncomingCallModalTemplate(callType);
  const initials = callerName.substring(0, 2).toUpperCase();
  document.getElementById('incoming-call-avatar').textContent = initials;
  document.getElementById('incoming-caller-name').textContent = callerName;
  document.getElementById('incoming-call-type').textContent = callType === 'video' ? 'Cuoc goi video den' : 'Cuoc goi thoai den';
  modal.dataset.callerId = callerId;
  modal.dataset.callerName = callerName;
  modal.dataset.callType = callType;
  modal.style.display = 'flex';
  setTimeout(() => modal.classList.add('show'), 10);
}

window.acceptIncomingCall = async function () {
  const modal = document.getElementById('incoming-call-modal');
  if (!modal) return;
  const callerId = parseInt(modal.dataset.callerId, 10);
  const callerName = modal.dataset.callerName;
  const callType = modal.dataset.callType;
  modal.classList.remove('show');
  setTimeout(() => { modal.style.display = 'none'; }, 300);
  const result = await CallService.acceptCall();
  if (result.success) {
    currentCall = { type: callType, friendId: callerId, username: callerName };
    showCallModal(callType, callerName);
    document.getElementById('call-status').textContent = 'Da ket noi';
  } else {
    alert('Khong the chap nhan cuoc goi: ' + result.error);
  }
};

window.rejectIncomingCall = function () {
  const modal = document.getElementById('incoming-call-modal');
  if (modal) {
    modal.classList.remove('show');
    setTimeout(() => { modal.style.display = 'none'; }, 300);
  }
  CallService.rejectCall();
};

function applyVoiceLevelToUI() {
  const wrapper = document.getElementById('call-avatar-wrapper');
  const bars = document.getElementById('call-voice-bars');
  if (!wrapper || !bars) return;
  const level = Math.max(0, Math.min(1, currentVoiceLevel));
  wrapper.style.setProperty('--voice-level', level.toFixed(3));
  const speaking = level > 0.06;
  wrapper.classList.toggle('is-speaking', speaking);
  bars.classList.toggle('is-speaking', speaking);
  const barNodes = bars.querySelectorAll('span');
  barNodes.forEach((bar, index) => {
    const wave = Math.sin((Date.now() / 90) + index) * 0.25 + 0.75;
    const barLevel = Math.max(0.16, Math.min(1, level * wave));
    bar.style.setProperty('--bar-level', barLevel.toFixed(3));
  });
}

function resetCallVoiceUI() {
  currentVoiceLevel = 0;
  const wrapper = document.getElementById('call-avatar-wrapper');
  const bars = document.getElementById('call-voice-bars');
  if (wrapper) {
    wrapper.classList.remove('is-speaking');
    wrapper.style.removeProperty('--voice-level');
  }
  if (bars) {
    bars.classList.remove('is-speaking');
    bars.querySelectorAll('span').forEach((bar) => bar.style.removeProperty('--bar-level'));
  }
}
