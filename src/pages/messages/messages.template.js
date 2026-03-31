import { renderNavbar } from '../../components/navbar.js';
import { renderSidebar } from '../../components/sidebar.js';

export function getMessagesMainTemplate() {
  return `
    ${renderNavbar()}
    ${renderSidebar()}
    
    <div class="main-content">
      <button class="btn btn-outline-primary d-lg-none mb-3" id="mobile-menu-btn">
        <i class="bi bi-list"></i> Menu
      </button>

      <div class="row mb-4">
        <div class="col-12">
          <h2 class="mb-1"><i class="bi bi-chat-dots me-2"></i>Tin nhan</h2>
          <p class="text-muted">Tro chuyen voi ban be va nhom cua ban</p>
        </div>
      </div>

      <div class="row">
        <div class="col-lg-4 mb-4">
          <div class="card h-100">
            <div class="card-header">
              <h5 class="mb-0">Cuoc tro chuyen 1-1</h5>
            </div>
            <div class="card-body p-0">
              <div class="list-group list-group-flush" id="conversations-list">
                <div class="text-center py-4">
                  <span class="spinner"></span> Dang tai...
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="col-lg-8">
          <div class="card chat-card">
            <div class="card-header" id="chat-header">
              <div class="text-muted">Chon mot cuoc tro chuyen de bat dau</div>
            </div>
            <div class="card-body chat-body" id="chat-messages">
              ${getChatStatusTemplate('Chon mot cuoc tro chuyen tu danh sach ben trai hoac mo chat nhom tu trang Groups')}
            </div>
            <div class="card-footer" id="chat-footer" style="display: none;">
              <form id="message-form" class="d-flex gap-2">
                <input 
                  type="text" 
                  class="form-control" 
                  id="message-input"
                  placeholder="Nhap tin nhan..."
                  required
                />
                <button type="submit" class="btn btn-primary">
                  <i class="bi bi-send"></i>
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function getConversationItemTemplate(conv, currentChat, formatTime) {
  const active = currentChat?.type === 'direct' && currentChat.id === conv.userId;
  return `
    <div class="list-group-item list-group-item-action conversation-item ${active ? 'active' : ''}" data-user-id="${conv.userId}" data-username="${conv.username}">
      <div class="d-flex align-items-center">
        <div class="avatar me-3">
          ${conv.username.substring(0, 2).toUpperCase()}
        </div>
        <div class="flex-grow-1">
          <div class="d-flex justify-content-between">
            <h6 class="mb-1">${conv.username}</h6>
            <small class="text-muted">${formatTime(conv.time)}</small>
          </div>
          <p class="mb-0 text-muted small text-truncate">${conv.lastMessage}</p>
        </div>
        ${conv.unread ? '<span class="badge badge-primary">New</span>' : ''}
      </div>
    </div>
  `;
}

export function getDirectChatHeaderTemplate(partnerId, displayName) {
  return `
    <div class="d-flex align-items-center justify-content-between gap-3">
      <div class="d-flex align-items-center">
        <div class="avatar me-3">
          ${displayName.substring(0, 2).toUpperCase()}
        </div>
        <div>
          <h6 class="mb-0">${displayName}</h6>
          <small class="text-muted">Tro chuyen truc tiep</small>
        </div>
      </div>
      <div class="btn-group">
        <button class="btn btn-sm btn-outline-success" onclick="startVideoCall(${partnerId}, '${escapeAttribute(displayName)}')">
          <i class="bi bi-camera-video-fill"></i>
        </button>
        <button class="btn btn-sm btn-outline-info" onclick="startAudioCall(${partnerId}, '${escapeAttribute(displayName)}')">
          <i class="bi bi-telephone-fill"></i>
        </button>
      </div>
    </div>
  `;
}

export function getGroupChatHeaderTemplate(groupId, groupName) {
  return `
    <div class="d-flex align-items-center">
      <div class="avatar me-3">
        <i class="bi bi-people-fill"></i>
      </div>
      <div>
        <h6 class="mb-0">${groupName}</h6>
        <small class="text-muted">Nhom #${groupId}</small>
      </div>
    </div>
  `;
}

export function getChatFallbackHeaderTemplate(title) {
  return `
    <div class="d-flex align-items-center">
      <div class="avatar me-3">
        <i class="bi bi-chat-square-text"></i>
      </div>
      <div>
        <h6 class="mb-0">${title}</h6>
        <small class="text-muted">Khong the mo cuoc tro chuyen</small>
      </div>
    </div>
  `;
}

export function getChatStatusTemplate(message, tone = 'muted', compact = false) {
  const className = tone === 'danger' ? 'text-danger' : 'text-muted';
  const paddingClass = compact ? 'py-3' : 'py-5';
  return `
    <div class="text-center ${className} ${paddingClass}">
      <i class="bi bi-chat-dots fs-1"></i>
      <p class="mt-3 mb-0">${message}</p>
    </div>
  `;
}

export function getMessageTemplate(msg, isOwn, formatTime, options = {}) {
  const senderLabel = options.type === 'group' && !isOwn
    ? `<div class="message-sender">${options.senderName}</div>`
    : '';

  return `
    <div class="message ${isOwn ? 'message-own' : 'message-other'}">
      ${senderLabel}
      <div class="message-content">
        ${msg.content}
      </div>
      <div class="message-time">${formatTime(msg.createdAt)}</div>
    </div>
  `;
}

export function getCallModalTemplate() {
  return `
    <div class="call-modal-dialog">
      <div class="call-modal-content">
        <div class="call-modal-header">
          <h5 class="call-modal-title" id="call-modal-title"></h5>
          <button type="button" class="call-close-btn" onclick="endCall()">x</button>
        </div>
        <div class="call-modal-body">
          <div class="call-avatar mb-3">
            <div class="call-avatar-wrapper mx-auto" id="call-avatar-wrapper">
              <div class="call-voice-ring"></div>
              <div class="avatar-large mx-auto" id="call-avatar"></div>
            </div>
            <div class="call-voice-bars mt-3" id="call-voice-bars" aria-hidden="true">
              <span></span><span></span><span></span><span></span><span></span>
            </div>
          </div>
          <h4 id="call-username" class="mb-2"></h4>
          <p id="call-status" class="text-muted">Dang ket noi...</p>
          
          <div class="call-controls mt-4">
            <div class="btn-group" role="group">
              <button class="call-btn call-btn-secondary" id="toggle-video-btn" onclick="toggleVideo()" style="display: none;">
                <i class="bi bi-camera-video-fill"></i>
              </button>
              <button class="call-btn call-btn-secondary" id="toggle-audio-btn" onclick="toggleMute()">
                <i class="bi bi-mic-fill"></i>
              </button>
              <button class="call-btn call-btn-danger" onclick="endCall()">
                <i class="bi bi-telephone-x-fill"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function getIncomingCallModalTemplate(callType) {
  return `
    <div class="call-modal-dialog">
      <div class="call-modal-content">
        <div class="call-modal-body">
          <div class="incoming-call-icon mb-3">
            <i class="bi bi-telephone-inbound-fill"></i>
          </div>
          <div class="call-avatar mb-3">
            <div class="avatar-large mx-auto" id="incoming-call-avatar"></div>
          </div>
          <h4 id="incoming-caller-name" class="mb-2"></h4>
          <p class="text-muted mb-4">
            <i class="bi bi-${callType === 'video' ? 'camera-video' : 'telephone'}-fill me-2"></i>
            <span id="incoming-call-type"></span>
          </p>
          
          <div class="incoming-call-actions">
            <button class="call-btn call-btn-danger call-btn-large" onclick="rejectIncomingCall()">
              <i class="bi bi-telephone-x-fill"></i>
              <span>Tu choi</span>
            </button>
            <button class="call-btn call-btn-success call-btn-large" onclick="acceptIncomingCall()">
              <i class="bi bi-telephone-fill"></i>
              <span>Chap nhan</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function escapeAttribute(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}
