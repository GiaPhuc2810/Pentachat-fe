import AuthService from '../services/auth.service.js';
import router from '../router.js';

export function renderNavbar() {
    const session = AuthService.getSession();
    if (!session) return '';

    const username = session.username || 'User';
    const initials = username.substring(0, 2).toUpperCase();

    return `
    <nav class="navbar navbar-expand-lg navbar-light bg-white border-bottom shadow-sm">
      <div class="container-fluid px-4">
        <a class="navbar-brand d-flex align-items-center" href="#/dashboard">
          <i class="bi bi-chat-dots-fill text-primary fs-4 me-2"></i>
          <span class="fw-bold">Pentachat</span>
        </a>

        <button class="navbar-toggler" type="button" id="navbar-toggler">
          <span class="navbar-toggler-icon"></span>
        </button>

        <div class="collapse navbar-collapse" id="navbarContent">
          <ul class="navbar-nav ms-auto align-items-center">
            <!-- Search -->
            <li class="nav-item me-3 d-none d-lg-block">
              <div class="input-group input-group-sm">
                <span class="input-group-text bg-white border-end-0">
                  <i class="bi bi-search"></i>
                </span>
                <input 
                  type="text" 
                  class="form-control border-start-0" 
                  placeholder="Tìm kiếm..."
                  style="max-width: 200px;"
                />
              </div>
            </li>

            <!-- Notifications -->
            <li class="nav-item dropdown me-3">
              <a class="nav-link position-relative" href="#" id="notificationDropdown">
                <i class="bi bi-bell fs-5"></i>
                <span class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style="font-size: 0.6rem;">
                  3
                </span>
              </a>
            </li>

            <!-- User Menu -->
            <li class="nav-item dropdown">
              <a class="nav-link d-flex align-items-center" href="#" id="userDropdown">
                <div class="avatar avatar-sm me-2">
                  ${initials}
                </div>
                <span class="d-none d-md-inline">${username}</span>
                <i class="bi bi-chevron-down ms-2"></i>
              </a>
              <ul class="dropdown-menu dropdown-menu-end" id="userDropdownMenu" style="display: none;">
                <li><a class="dropdown-item" href="#/profile"><i class="bi bi-person me-2"></i>Hồ sơ</a></li>
                <li><a class="dropdown-item" href="#/wallet"><i class="bi bi-wallet2 me-2"></i>Ví của tôi</a></li>
                <li><hr class="dropdown-divider"></li>
                <li><a class="dropdown-item text-danger" href="#" id="logout-btn"><i class="bi bi-box-arrow-right me-2"></i>Đăng xuất</a></li>
              </ul>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  `;
}

export function initNavbar() {
    // Toggle mobile menu
    const toggler = document.getElementById('navbar-toggler');
    const navbarContent = document.getElementById('navbarContent');

    if (toggler && navbarContent) {
        toggler.addEventListener('click', () => {
            navbarContent.classList.toggle('show');
        });
    }

    // User dropdown
    const userDropdown = document.getElementById('userDropdown');
    const userDropdownMenu = document.getElementById('userDropdownMenu');

    if (userDropdown && userDropdownMenu) {
        userDropdown.addEventListener('click', (e) => {
            e.preventDefault();
            const isVisible = userDropdownMenu.style.display === 'block';
            userDropdownMenu.style.display = isVisible ? 'none' : 'block';
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!userDropdown.contains(e.target) && !userDropdownMenu.contains(e.target)) {
                userDropdownMenu.style.display = 'none';
            }
        });
    }

    // Logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm('Bạn có chắc muốn đăng xuất?')) {
                AuthService.logout();
            }
        });
    }
}
