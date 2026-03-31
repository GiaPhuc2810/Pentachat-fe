import router from '../router.js';

export function renderSidebar() {
  const currentRoute = router.getCurrentRoute();

  const menuItems = [
    { icon: 'bi-speedometer2', label: 'Dashboard', path: '/dashboard' },
    { icon: 'bi-chat-dots', label: 'Tin nhắn', path: '/messages', badge: '' },
    { icon: 'bi-people', label: 'Bạn bè', path: '/friends' },
    { icon: 'bi-collection', label: 'Nhóm', path: '/groups' },
    { icon: 'bi-wallet2', label: 'Ví', path: '/wallet' },
    { icon: 'bi-controller', label: 'Trò chơi', path: '/games' },
    { icon: 'bi-person', label: 'Hồ sơ', path: '/profile' }
  ];

  return `
    <div class="sidebar bg-white border-end shadow-sm">
      <div class="sidebar-content">
        <ul class="nav flex-column">
          ${menuItems.map(item => `
            <li class="nav-item">
              <a 
                class="nav-link ${currentRoute === item.path ? 'active' : ''}" 
                href="#${item.path}"
              >
                <i class="bi ${item.icon} me-2"></i>
                <span>${item.label}</span>
                ${item.badge ? `<span class="badge badge-primary ms-auto">${item.badge}</span>` : ''}
              </a>
            </li>
          `).join('')}
        </ul>
      </div>

      <!-- Sidebar Toggle for Mobile -->
      <button class="sidebar-toggle d-lg-none" id="sidebar-toggle">
        <i class="bi bi-x-lg"></i>
      </button>
    </div>

    <!-- Sidebar Overlay for Mobile -->
    <div class="sidebar-overlay" id="sidebar-overlay"></div>
  `;
}

export function initSidebar() {
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  const toggleBtn = document.getElementById('sidebar-toggle');

  // Mobile menu toggle
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', () => {
      sidebar?.classList.add('show');
      overlay?.classList.add('show');
    });
  }

  // Close sidebar
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      sidebar?.classList.remove('show');
      overlay?.classList.remove('show');
    });
  }

  // Close on overlay click
  if (overlay) {
    overlay.addEventListener('click', () => {
      sidebar?.classList.remove('show');
      overlay?.classList.remove('show');
    });
  }

  // Close sidebar on navigation (mobile)
  const navLinks = document.querySelectorAll('.sidebar .nav-link');
  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      if (window.innerWidth < 992) {
        sidebar?.classList.remove('show');
        overlay?.classList.remove('show');
      }
    });
  });
}

// Add sidebar styles
export function addSidebarStyles() {
  if (!document.getElementById('sidebar-styles')) {
    const style = document.createElement('style');
    style.id = 'sidebar-styles';
    style.textContent = `
      .sidebar {
        position: fixed;
        top: 56px;
        left: 0;
        bottom: 0;
        width: 250px;
        z-index: 1000;
        transition: transform 0.3s ease;
      }

      .sidebar-content {
        height: 100%;
        overflow-y: auto;
        padding: 1rem 0;
      }

      .sidebar .nav-link {
        display: flex;
        align-items: center;
        padding: 0.75rem 1.5rem;
        color: var(--text-secondary);
        transition: all 0.2s;
        border-left: 3px solid transparent;
      }

      .sidebar .nav-link:hover {
        background-color: var(--bg-hover);
        color: var(--primary-color);
      }

      .sidebar .nav-link.active {
        background-color: rgba(13, 110, 253, 0.1);
        color: var(--primary-color);
        border-left-color: var(--primary-color);
        font-weight: 600;
      }

      .sidebar .nav-link i {
        font-size: 1.1rem;
      }

      .sidebar-toggle {
        display: none;
        position: absolute;
        top: 1rem;
        right: 1rem;
        background: none;
        border: none;
        font-size: 1.5rem;
        color: var(--text-secondary);
        cursor: pointer;
      }

      .sidebar-overlay {
        display: none;
        position: fixed;
        top: 56px;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(0, 0, 0, 0.5);
        z-index: 999;
      }

      @media (max-width: 991px) {
        .sidebar {
          transform: translateX(-100%);
        }

        .sidebar.show {
          transform: translateX(0);
        }

        .sidebar-toggle {
          display: block;
        }

        .sidebar-overlay.show {
          display: block;
        }
      }

      .main-content {
        margin-left: 250px;
        margin-top: 56px;
        padding: 2rem;
        min-height: calc(100vh - 56px);
      }

      @media (max-width: 991px) {
        .main-content {
          margin-left: 0;
        }
      }
    `;
    document.head.appendChild(style);
  }
}
