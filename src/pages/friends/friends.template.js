import { renderNavbar } from '../../components/navbar.js';
import { renderSidebar } from '../../components/sidebar.js';

export function getFriendsMainTemplate() {
  return `
    ${renderNavbar()}
    ${renderSidebar()}
    
    <div class="main-content">
      <button class="btn btn-outline-primary d-lg-none mb-3" id="mobile-menu-btn">
        <i class="bi bi-list"></i> Menu
      </button>

      <div class="row mb-4">
        <div class="col-12">
          <h2 class="mb-1"><i class="bi bi-people me-2"></i>Ban be</h2>
          <p class="text-muted">Quan ly danh sach ban be va loi moi ket ban</p>
        </div>
      </div>

      <div id="alert-container"></div>

      <ul class="nav nav-tabs mb-3" id="friendTabs">
        <li class="nav-item">
          <a class="nav-link active" data-tab="search" href="#search">
            <i class="bi bi-search me-2"></i>Tim va them ban
          </a>
        </li>
        <li class="nav-item">
          <a class="nav-link" data-tab="pending" href="#pending">
            <i class="bi bi-clock-history me-2"></i>Loi moi dang cho
            <span class="badge badge-warning ms-2" id="pending-count">0</span>
          </a>
        </li>
        <li class="nav-item">
          <a class="nav-link" data-tab="friends" href="#friends">
            <i class="bi bi-people me-2"></i>Danh sach ban be
          </a>
        </li>
      </ul>

      <div class="tab-content">
        <div class="tab-pane active" id="search-tab">
          <div class="card">
            <div class="card-header">
              <div class="input-group">
                <span class="input-group-text">
                  <i class="bi bi-search"></i>
                </span>
                <input 
                  type="text" 
                  class="form-control" 
                  id="search-users-input"
                  placeholder="Tim kiem nguoi dung theo ten..."
                />
              </div>
              <div class="form-text mt-2">Khong hien thi online status khi backend chua co du lieu that</div>
            </div>
            <div class="card-body p-0">
              <div class="row g-3 p-3" id="search-results">
                <div class="col-12 text-center py-5 text-muted">
                  <i class="bi bi-search fs-1"></i>
                  <p class="mt-3">Nhap ten de tim kiem nguoi dung</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="tab-pane" id="pending-tab" style="display: none;">
          <div class="card">
            <div class="card-body p-0">
              <div class="list-group list-group-flush" id="pending-requests">
                <div class="text-center py-4">
                  <span class="spinner"></span> Dang tai...
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="tab-pane" id="friends-tab" style="display: none;">
          <div class="card">
            <div class="card-header">
              <div class="input-group">
                <span class="input-group-text">
                  <i class="bi bi-search"></i>
                </span>
                <input 
                  type="text" 
                  class="form-control" 
                  id="search-friends-input"
                  placeholder="Tim kiem ban be theo ten..."
                />
              </div>
              <div class="form-text mt-2">Neu backend chua co API unfriend, thao tac chi an khoi view hien tai</div>
            </div>
            <div class="card-body p-0">
              <div class="row g-3 p-3" id="friends-list">
                <div class="text-center py-4">
                  <span class="spinner"></span> Dang tai...
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function getFriendCardTemplate(friendId, friendUsername, initials) {
  return `
    <div class="col-md-6 col-lg-4" data-friend-id="${friendId}">
      <div class="card friend-card h-100">
        <div class="card-body">
          <div class="text-center mb-3">
            <div class="friend-avatar-large mx-auto mb-2">
              ${initials}
            </div>
            <h6 class="mb-1">${friendUsername}</h6>
            <small class="text-muted">User ID: ${friendId}</small>
          </div>
          <div class="d-grid gap-2">
            <div class="btn-group">
              <button class="btn btn-sm btn-outline-success" onclick="startVideoCall(${friendId}, '${escapeAttribute(friendUsername)}')">
                <i class="bi bi-camera-video-fill me-1"></i> Video
              </button>
              <button class="btn btn-sm btn-outline-info" onclick="startAudioCall(${friendId}, '${escapeAttribute(friendUsername)}')">
                <i class="bi bi-telephone-fill me-1"></i> Audio
              </button>
            </div>
            <button class="btn btn-sm btn-outline-primary" onclick="startChat(${friendId}, '${escapeAttribute(friendUsername)}')">
              <i class="bi bi-chat-fill me-1"></i> Nhan tin
            </button>
            <div class="btn-group">
              <button class="btn btn-sm btn-outline-warning hide-friend-btn" data-friend-id="${friendId}" data-username="${friendUsername}">
                <i class="bi bi-eye-slash me-1"></i> An khoi danh sach
              </button>
              <button class="btn btn-sm btn-outline-secondary remove-btn" data-friend-id="${friendId}">
                <i class="bi bi-x-lg"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function getPendingRequestTemplate(req, isReceived, formatTime) {
  return `
    <div class="list-group-item">
      <div class="d-flex align-items-center justify-content-between">
        <div class="d-flex align-items-center flex-grow-1">
          <div class="avatar me-3">
            ${isReceived ? req.fromUsername.substring(0, 2).toUpperCase() : req.toUsername.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <h6 class="mb-1">${isReceived ? req.fromUsername : req.toUsername}</h6>
            <small class="text-muted">
              ${isReceived ? 'Da gui loi moi ket ban cho ban' : 'Ban da gui loi moi ket ban'}
            </small>
            <div class="text-muted small mt-1">
              <i class="bi bi-clock"></i> ${formatTime(req.createdAt)}
            </div>
          </div>
        </div>
        ${isReceived ? `
          <div class="btn-group">
            <button class="btn btn-success btn-sm" onclick="acceptFriend(${req.id})">
              <i class="bi bi-check-lg"></i> Chap nhan
            </button>
            <button class="btn btn-danger btn-sm" onclick="rejectFriend(${req.id})">
              <i class="bi bi-x-lg"></i> Tu choi
            </button>
          </div>
        ` : `
          <span class="badge badge-warning">Dang cho</span>
        `}
      </div>
    </div>
  `;
}

export function getSearchUserCardTemplate(user, initials) {
  return `
    <div class="col-md-6 col-lg-4" data-user-id="${user.id}">
      <div class="card friend-card h-100">
        <div class="card-body">
          <div class="text-center mb-3">
            <div class="friend-avatar-large mx-auto mb-2">
              ${initials}
            </div>
            <h6 class="mb-1">${user.username}</h6>
            <small class="text-muted">User ID: ${user.id}</small>
          </div>
          <div class="d-grid gap-2">
            <div class="btn-group">
              <button class="btn btn-sm btn-primary add-friend-btn" data-user-id="${user.id}" data-username="${user.username}">
                <i class="bi bi-person-plus me-1"></i> Ket ban
              </button>
              <button class="btn btn-sm btn-outline-secondary remove-search-btn" data-user-id="${user.id}">
                <i class="bi bi-x-lg"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
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
