import { renderNavbar, initNavbar } from '../components/navbar.js';
import { renderSidebar, initSidebar, addSidebarStyles } from '../components/sidebar.js';
import ProfileService from '../services/profile.service.js';
import AuthService from '../services/auth.service.js';
import UserService from '../services/user.service.js';
import router from '../router.js';

export async function renderProfile() {
  const app = document.getElementById('app');
  const session = AuthService.getSession();

  if (!session) {
    router.navigate('/login');
    return;
  }

  addSidebarStyles();

  app.innerHTML = `
    ${renderNavbar()}
    ${renderSidebar()}
    
    <div class="main-content">
      <button class="btn btn-outline-primary d-lg-none mb-3" id="mobile-menu-btn">
        <i class="bi bi-list"></i> Menu
      </button>

      <div class="row mb-4">
        <div class="col-12">
          <h2 class="mb-1"><i class="bi bi-person me-2"></i>Ho so ca nhan</h2>
          <p class="text-muted">Quan ly thong tin ca nhan va cai dat tai khoan</p>
        </div>
      </div>

      <div id="alert-container"></div>

      <div class="row">
        <div class="col-lg-4 mb-4">
          <div class="card text-center">
            <div class="card-body">
              <div class="avatar avatar-lg mx-auto mb-3" style="width: 100px; height: 100px; font-size: 2.5rem;">
                ${session.username ? session.username.substring(0, 2).toUpperCase() : 'U'}
              </div>
              <h4 class="mb-1">${session.username || 'User'}</h4>
              <p class="text-muted">User ID: ${session.userId}</p>
            </div>
          </div>

          <div class="card mt-3">
            <div class="card-header">
              <h6 class="mb-0">Thong ke</h6>
            </div>
            <div class="card-body">
              <div class="d-flex justify-content-between mb-2">
                <span class="text-muted">Ban be</span>
                <strong id="friends-count">-</strong>
              </div>
              <div class="d-flex justify-content-between mb-2">
                <span class="text-muted">Nhom</span>
                <strong id="groups-count">-</strong>
              </div>
              <div class="d-flex justify-content-between">
                <span class="text-muted">Tin nhan</span>
                <strong id="messages-count">-</strong>
              </div>
            </div>
          </div>
        </div>

        <div class="col-lg-8">
          <ul class="nav nav-tabs mb-3" id="profileTabs">
            <li class="nav-item">
              <a class="nav-link active" data-tab="info" href="#info">
                <i class="bi bi-info-circle me-2"></i>Thong tin
              </a>
            </li>
            <li class="nav-item">
              <a class="nav-link" data-tab="edit" href="#edit">
                <i class="bi bi-pencil me-2"></i>Chinh sua
              </a>
            </li>
            <li class="nav-item">
              <a class="nav-link" data-tab="password" href="#password">
                <i class="bi bi-shield-lock me-2"></i>Doi mat khau
              </a>
            </li>
          </ul>

          <div class="tab-content">
            <div class="tab-pane active" id="info-tab">
              <div class="card">
                <div class="card-header">
                  <h5 class="mb-0">Thong tin ca nhan</h5>
                </div>
                <div class="card-body" id="profile-info">
                  <div class="text-center py-4">
                    <span class="spinner"></span> Dang tai...
                  </div>
                </div>
              </div>
            </div>

            <div class="tab-pane" id="edit-tab" style="display: none;">
              <div class="card">
                <div class="card-header">
                  <h5 class="mb-0">Chinh sua ho so</h5>
                </div>
                <div class="card-body">
                  <form id="edit-profile-form">
                    <div class="form-group">
                      <label class="form-label">Ten day du</label>
                      <input 
                        type="text" 
                        class="form-control" 
                        id="edit-fullname"
                        placeholder="Nhap ten day du"
                      />
                    </div>
                    <div class="alert alert-light border" role="alert">
                      Backend hien tai chua tra email trong profile, nen email tam thoi chi hien o tab thong tin.
                    </div>
                    <div class="form-group">
                      <label class="form-label">So dien thoai</label>
                      <input 
                        type="tel" 
                        class="form-control" 
                        id="edit-phone"
                        placeholder="Nhap so dien thoai"
                      />
                    </div>
                    <div class="form-group">
                      <label class="form-label">Gioi thieu</label>
                      <textarea 
                        class="form-control" 
                        id="edit-bio"
                        rows="3"
                        placeholder="Viet vai dong ve ban than..."
                      ></textarea>
                    </div>
                    <button type="submit" class="btn btn-primary">
                      <i class="bi bi-check-lg me-2"></i>Luu thay doi
                    </button>
                  </form>
                </div>
              </div>
            </div>

            <div class="tab-pane" id="password-tab" style="display: none;">
              <div class="card">
                <div class="card-header">
                  <h5 class="mb-0">Doi mat khau</h5>
                </div>
                <div class="card-body">
                  <form id="change-password-form">
                    <div class="form-group">
                      <label class="form-label">Mat khau hien tai</label>
                      <input 
                        type="password" 
                        class="form-control" 
                        id="current-password"
                        required
                      />
                    </div>
                    <div class="form-group">
                      <label class="form-label">Mat khau moi</label>
                      <input 
                        type="password" 
                        class="form-control" 
                        id="new-password"
                        required
                        minlength="6"
                      />
                      <div class="form-text">Toi thieu 6 ky tu</div>
                    </div>
                    <div class="form-group">
                      <label class="form-label">Xac nhan mat khau moi</label>
                      <input 
                        type="password" 
                        class="form-control" 
                        id="confirm-password"
                        required
                      />
                    </div>
                    <button type="submit" class="btn btn-primary">
                      <i class="bi bi-shield-check me-2"></i>Doi mat khau
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  initNavbar();
  initSidebar();
  addProfileStyles();

  await loadProfileData();
  setupEventListeners();
}

async function loadProfileData() {
  const session = AuthService.getSession();

  try {
    const statsResponse = await UserService.getDashboardStats();
    const response = await ProfileService.getProfile(session.userId);

    if (response.success && response.data) {
      renderProfileInfo(response.data);
      populateEditForm(response.data);
    }
    if (statsResponse.success && statsResponse.data) {
      document.getElementById('friends-count').textContent = statsResponse.data.friendCount ?? '-';
      document.getElementById('groups-count').textContent = statsResponse.data.groupCount ?? '-';
      document.getElementById('messages-count').textContent = statsResponse.data.messageCount ?? '-';
    }
  } catch (error) {
    console.error('Error loading profile:', error);
    document.getElementById('profile-info').innerHTML = `
      <div class="text-center py-4 text-danger">
        Khong the tai thong tin ho so
      </div>
    `;
  }
}

function renderProfileInfo(profile) {
  const container = document.getElementById('profile-info');

  container.innerHTML = `
    <div class="alert alert-light border mb-4" role="alert">
      Backend hien chua tra email trong profile. Email se duoc bo sung khi contract BE hoan thien.
    </div>
    <div class="row">
      <div class="col-md-6 mb-3">
        <label class="text-muted small">Ten day du</label>
        <p class="mb-0">${profile.fullName || 'Chua cap nhat'}</p>
      </div>
      <div class="col-md-6 mb-3">
        <label class="text-muted small">Email</label>
        <p class="mb-0 text-muted">Chua co du lieu tu backend</p>
      </div>
      <div class="col-md-6 mb-3">
        <label class="text-muted small">So dien thoai</label>
        <p class="mb-0">${profile.phoneNumber || 'Chua cap nhat'}</p>
      </div>
      <div class="col-md-6 mb-3">
        <label class="text-muted small">Ngay tham gia</label>
        <p class="mb-0">${profile.createdAt ? new Date(profile.createdAt).toLocaleDateString('vi-VN') : 'N/A'}</p>
      </div>
      <div class="col-12 mb-3">
        <label class="text-muted small">Gioi thieu</label>
        <p class="mb-0">${profile.bio || 'Chua co gioi thieu'}</p>
      </div>
    </div>
  `;
}

function populateEditForm(profile) {
  document.getElementById('edit-fullname').value = profile.fullName || '';
  document.getElementById('edit-phone').value = profile.phoneNumber || '';
  document.getElementById('edit-bio').value = profile.bio || '';
}

function setupEventListeners() {
  const session = AuthService.getSession();

  document.querySelectorAll('#profileTabs .nav-link').forEach((tab) => {
    tab.addEventListener('click', (e) => {
      e.preventDefault();

      document.querySelectorAll('#profileTabs .nav-link').forEach((t) => t.classList.remove('active'));
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

  document.getElementById('edit-profile-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const data = {
      fullName: document.getElementById('edit-fullname').value.trim(),
      phoneNumber: document.getElementById('edit-phone').value.trim(),
      bio: document.getElementById('edit-bio').value.trim()
    };

    try {
      const response = await ProfileService.updateProfile(session.userId, data);

      if (response.success) {
        showAlert('Cap nhat ho so thanh cong!', 'success');
        await loadProfileData();
      }
    } catch (error) {
      showAlert(error.message || 'Khong the cap nhat ho so', 'danger');
    }
  });

  document.getElementById('change-password-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    if (newPassword !== confirmPassword) {
      showAlert('Mat khau xac nhan khong khop', 'danger');
      return;
    }

    if (newPassword.length < 6) {
      showAlert('Mat khau moi phai co it nhat 6 ky tu', 'danger');
      return;
    }

    try {
      const response = await AuthService.changePassword({
        currentPassword,
        newPassword
      });

      if (response.success) {
        showAlert('Doi mat khau thanh cong!', 'success');
        document.getElementById('change-password-form').reset();
      }
    } catch (error) {
      showAlert(error.message || 'Khong the doi mat khau', 'danger');
    }
  });
}

function showAlert(message, type) {
  const container = document.getElementById('alert-container');
  container.innerHTML = `
    <div class="alert alert-${type} alert-dismissible fade show" role="alert">
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    </div>
  `;

  setTimeout(() => {
    container.innerHTML = '';
  }, 5000);
}

function addProfileStyles() {
  if (!document.getElementById('profile-styles')) {
    const style = document.createElement('style');
    style.id = 'profile-styles';
    style.textContent = `
      .nav-tabs .nav-link {
        color: var(--text-secondary);
        border: none;
        border-bottom: 2px solid transparent;
      }

      .nav-tabs .nav-link:hover {
        border-bottom-color: var(--border-color);
      }

      .nav-tabs .nav-link.active {
        color: var(--primary-color);
        border-bottom-color: var(--primary-color);
        font-weight: 600;
      }

      .btn-close {
        background: transparent url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='%23000'%3e%3cpath d='M.293.293a1 1 0 011.414 0L8 6.586 14.293.293a1 1 0 111.414 1.414L9.414 8l6.293 6.293a1 1 0 01-1.414 1.414L8 9.414l-6.293 6.293a1 1 0 01-1.414-1.414L6.586 8 .293 1.707a1 1 0 010-1.414z'/%3e%3c/svg%3e") center/1em auto no-repeat;
        border: 0;
        opacity: .5;
      }
    `;
    document.head.appendChild(style);
  }
}
