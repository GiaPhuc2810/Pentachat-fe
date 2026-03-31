import AuthService from '../../services/auth.service.js';
import CallService from '../../services/call.service.js';
import * as Template from './friends.template.js';

let currentCall = null;
let isVideoEnabled = true;
let isAudioEnabled = true;
let currentVoiceLevel = 0;

export function initFriendsCall(session, allFriends, showAlert) {
  window.startVideoCall = async function (friendId, username) {
    const result = await CallService.startVideoCall(session.userId, friendId, username);
    if (result.success) {
      currentCall = { type: 'video', friendId, username, isVideoEnabled: true };
      showCallModal(null, 'video', username);
      document.getElementById('call-status').textContent = 'Đang gọi...';
    } else {
      showAlert('Không thể bắt đầu cuộc gọi video: ' + result.error, 'danger');
    }
  };

  window.startAudioCall = async function (friendId, username) {
    const result = await CallService.startAudioCall(session.userId, friendId, username);
    if (result.success) {
      currentCall = { type: 'audio', friendId, username };
      showCallModal(null, 'audio', username);
      document.getElementById('call-status').textContent = 'Đang gọi...';
    } else {
      showAlert('Không thể bắt đầu cuộc gọi audio: ' + result.error, 'danger');
    }
  };

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
      statusText.textContent = 'Camera đang bật';
    } else {
      toggleBtn.innerHTML = '<i class="bi bi-camera-video-off-fill"></i>';
      toggleBtn.classList.remove('call-btn-secondary');
      toggleBtn.classList.add('call-btn-danger');
      statusText.textContent = 'Camera đã tắt';
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
      statusText.textContent = 'Mic đang bật';
    } else {
      toggleBtn.innerHTML = '<i class="bi bi-mic-mute-fill"></i>';
      toggleBtn.classList.remove('call-btn-secondary');
      toggleBtn.classList.add('call-btn-danger');
      statusText.textContent = 'Mic đã tắt';
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
  };

  window.acceptIncomingCall = async function () {
    const modal = document.getElementById('incoming-call-modal');
    if (!modal) return;
    const callerId = parseInt(modal.dataset.callerId);
    const callerName = modal.dataset.callerName;
    const callType = modal.dataset.callType;
    modal.classList.remove('show');
    setTimeout(() => { modal.style.display = 'none'; }, 300);
    const result = await CallService.acceptCall();
    if (result.success) {
      currentCall = { type: callType, friendId: callerId, username: callerName };
      showCallModal(null, callType, callerName);
      document.getElementById('call-status').textContent = 'Đã kết nối';
    } else {
      showAlert('Không thể chấp nhận cuộc gọi: ' + result.error, 'danger');
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

  setupIncomingCallHandler(allFriends, showAlert);
}

function showCallModal(_, callType, username) {
  let modal = document.getElementById('call-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'call-modal';
    modal.className = 'call-modal-overlay';
    document.body.appendChild(modal);
  }
  
  modal.innerHTML = Template.getCallModalTemplate();
  const title = callType === 'video' ? 'Cuộc gọi Video' : 'Cuộc gọi Audio';
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

function setupIncomingCallHandler(allFriends, showAlert) {
  const session = AuthService.getSession();

  window.onCallStateChange = function ({ status }) {
    const callStatus = document.getElementById('call-status');
    if (!callStatus) return;
    if (status === 'dialing') callStatus.textContent = 'Đang gọi...';
    else if (status === 'accepted') callStatus.textContent = 'Bên kia đã nhận cuộc gọi...';
    else if (status === 'connecting') callStatus.textContent = 'Đang kết nối...';
    else if (status === 'connected') callStatus.textContent = 'Đã kết nối';
    else if (status === 'reconnecting') callStatus.textContent = 'Kết nối yếu, đang thử lại...';
    else if (status === 'ended') callStatus.textContent = 'Cuộc gọi đã kết thúc';
  };

  window.onCallAudioLevel = function ({ local = 0, remote = 0 }) {
    currentVoiceLevel = Math.max(local, remote);
    applyVoiceLevelToUI();
  };

  window.onIncomingCall = function (message) {
    const callerId = message.fromUserId;
    const friend = allFriends.find(f => f.fromUserId === callerId || f.toUserId === callerId);
    const callerName = friend
      ? (friend.fromUserId === session.userId ? friend.toUsername : friend.fromUsername)
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
  document.getElementById('incoming-call-type').textContent =
    callType === 'video' ? 'Cuộc gọi video đến' : 'Cuộc gọi thoại đến';

  modal.dataset.callerId = callerId;
  modal.dataset.callerName = callerName;
  modal.dataset.callType = callType;

  modal.style.display = 'flex';
  setTimeout(() => modal.classList.add('show'), 10);
}

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
