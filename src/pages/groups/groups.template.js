import { renderNavbar } from '../../components/navbar.js';
import { renderSidebar } from '../../components/sidebar.js';

export function getGroupsMainTemplate() {
  return `
    ${renderNavbar()}
    ${renderSidebar()}
    
    <div class="main-content">
      <button class="btn btn-outline-primary d-lg-none mb-3" id="mobile-menu-btn">
        <i class="bi bi-list"></i> Menu
      </button>

      <div class="row mb-4">
        <div class="col-12 d-flex justify-content-between align-items-center">
          <div>
            <h2 class="mb-1"><i class="bi bi-collection me-2"></i>Nhom</h2>
            <p class="text-muted mb-0">Quan ly nhom chat cua ban</p>
          </div>
          <button class="btn btn-primary" id="create-group-btn">
            <i class="bi bi-plus-circle me-2"></i>Tao nhom moi
          </button>
        </div>
      </div>

      <div id="alert-container"></div>

      <div class="row" id="groups-container">
        <div class="col-12 text-center py-5">
          <span class="spinner-lg"></span>
          <p class="mt-3 text-muted">Dang tai danh sach nhom...</p>
        </div>
      </div>
    </div>

    <div class="custom-modal-backdrop" id="create-group-modal" style="display: none;">
      <div class="custom-modal">
        <div class="modal-header">
          <h5 class="modal-title">Tao nhom moi</h5>
          <button class="modal-close" id="close-modal">&times;</button>
        </div>
        <div class="modal-body">
          <form id="create-group-form">
            <div class="form-group">
              <label class="form-label">Ten nhom</label>
              <input 
                type="text" 
                class="form-control" 
                id="group-name"
                placeholder="Nhap ten nhom"
                required
              />
            </div>
            <div class="form-group">
              <label class="form-label">Them thanh vien (toi thieu 3 nguoi)</label>
              <input 
                type="text" 
                class="form-control mb-3" 
                id="search-friends"
                placeholder="Tim kiem ban be..."
              />
              <div class="selected-count mb-2">
                <small class="text-muted">Da chon: <span id="selected-count">0</span> nguoi</small>
              </div>
              <div class="friends-list" id="friends-list">
                <div class="text-center py-3">
                  <span class="spinner"></span>
                  <p class="mt-2 text-muted small">Dang tai danh sach ban be...</p>
                </div>
              </div>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="cancel-btn">Huy</button>
          <button class="btn btn-primary" id="submit-group-btn">
            <i class="bi bi-check-lg me-2"></i>Tao nhom
          </button>
        </div>
      </div>
    </div>

    <div class="custom-modal-backdrop" id="group-details-modal" style="display: none;">
      <div class="custom-modal">
        <div class="modal-header">
          <h5 class="modal-title">Chi tiet nhom</h5>
          <button class="modal-close" id="close-details-modal">&times;</button>
        </div>
        <div class="modal-body" id="group-details-content"></div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="close-details-btn">Dong</button>
        </div>
      </div>
    </div>
  `;
}

export function getEmptyGroupsTemplate() {
  return `
    <div class="col-12 text-center py-5">
      <i class="bi bi-collection fs-1 text-muted"></i>
      <p class="mt-3 text-muted">Ban chua tham gia nhom nao</p>
      <button class="btn btn-primary mt-2" onclick="document.getElementById('create-group-btn').click()">
        <i class="bi bi-plus-circle me-2"></i>Tao nhom dau tien
      </button>
    </div>
  `;
}

export function getGroupsErrorTemplate(message) {
  return `
    <div class="col-12 text-center py-5 text-danger">
      <i class="bi bi-exclamation-triangle fs-1"></i>
      <p class="mt-3">${message}</p>
    </div>
  `;
}

export function getGroupItemTemplate(group) {
  return `
    <div class="col-md-6 col-lg-4 mb-4">
      <div class="card group-card h-100">
        <div class="card-body">
          <div class="d-flex align-items-start mb-3">
            <div class="group-avatar me-3">
              <i class="bi bi-people-fill"></i>
            </div>
            <div class="flex-grow-1">
              <h5 class="card-title mb-1">${group.name}</h5>
              <p class="text-muted small mb-1">
                <i class="bi bi-hash"></i> Group ID: ${group.id}
              </p>
              <p class="text-muted small mb-0">
                <i class="bi bi-person"></i> ${(group.memberIds || []).length} thanh vien
              </p>
            </div>
          </div>
          <div class="d-flex gap-2">
            <button class="btn btn-primary btn-sm flex-grow-1" onclick="openGroupChat(${group.id})">
              <i class="bi bi-chat-dots me-1"></i>Tro chuyen
            </button>
            <button class="btn btn-outline-secondary btn-sm" onclick="viewGroupDetails(${group.id})">
              <i class="bi bi-info-circle"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function getGroupDetailsTemplate(group) {
  const members = Array.isArray(group.memberIds) && group.memberIds.length
    ? group.memberIds.map((memberId) => `<li class="list-group-item">User ID: ${memberId}</li>`).join('')
    : '<li class="list-group-item text-muted">Khong co du lieu thanh vien</li>';

  return `
    <div class="mb-3">
      <h5 class="mb-1">${group.name}</h5>
      <p class="text-muted mb-0">Nhom #${group.id}</p>
    </div>
    <div class="row mb-3">
      <div class="col-sm-6 mb-3 mb-sm-0">
        <div class="border rounded p-3 h-100">
          <div class="text-muted small mb-1">So thanh vien</div>
          <strong>${(group.memberIds || []).length}</strong>
        </div>
      </div>
      <div class="col-sm-6">
        <div class="border rounded p-3 h-100">
          <div class="text-muted small mb-1">Member IDs</div>
          <strong>${(group.memberIds || []).join(', ') || 'N/A'}</strong>
        </div>
      </div>
    </div>
    <div>
      <h6 class="mb-2">Danh sach thanh vien</h6>
      <ul class="list-group">${members}</ul>
    </div>
  `;
}

export function getFriendItemTemplate(friendId, friendName, isSelected) {
  return `
    <div class="friend-item ${isSelected ? 'selected' : ''}" data-friend-id="${friendId}">
      <div class="friend-avatar">
        <i class="bi bi-person-circle"></i>
      </div>
      <div class="friend-info">
        <div class="friend-name">${friendName}</div>
        <div class="friend-email">ID: ${friendId}</div>
      </div>
      <div class="friend-checkbox">
        ${isSelected ? '<i class="bi bi-check-circle-fill text-primary"></i>' : '<i class="bi bi-circle"></i>'}
      </div>
    </div>
  `;
}
