import AuthService from '../services/auth.service.js';
import router from '../router.js';

export function renderLogin() {
    const app = document.getElementById('app');

    app.innerHTML = `
    <div class="auth-container">
      <div class="auth-card card shadow-lg">
        <div class="card-body p-4">
          <div class="text-center mb-4">
            <h1 class="h3 mb-2">
              <i class="bi bi-chat-dots-fill text-primary"></i>
              Pentachat
            </h1>
            <p class="text-muted">Đăng nhập vào tài khoản của bạn</p>
          </div>

          <div id="alert-container"></div>

          <form id="login-form">
            <div class="form-group">
              <label class="form-label" for="username">Tên đăng nhập</label>
              <input 
                type="text" 
                class="form-control" 
                id="username" 
                name="username"
                placeholder="Nhập tên đăng nhập"
                required
              />
            </div>

            <div class="form-group">
              <label class="form-label" for="password">Mật khẩu</label>
              <input 
                type="password" 
                class="form-control" 
                id="password" 
                name="password"
                placeholder="Nhập mật khẩu"
                required
              />
            </div>

            <div class="d-flex justify-content-between align-items-center mb-3">
              <div class="form-check">
                <input class="form-check-input" type="checkbox" id="remember">
                <label class="form-check-label" for="remember">
                  Ghi nhớ đăng nhập
                </label>
              </div>
              <a href="#/forgot-password" class="text-primary">Quên mật khẩu?</a>
            </div>

            <button type="submit" class="btn btn-primary btn-block btn-lg" id="login-btn">
              <span id="login-text">Đăng nhập</span>
              <span id="login-spinner" class="spinner d-none"></span>
            </button>
          </form>

          <div class="text-center mt-4">
            <p class="text-muted">
              Chưa có tài khoản? 
              <a href="#/register" class="text-primary fw-bold">Đăng ký ngay</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  `;

    // Add styles
    addAuthStyles();

    // Handle form submission
    const form = document.getElementById('login-form');
    form.addEventListener('submit', handleLogin);
}

async function handleLogin(e) {
    e.preventDefault();

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const loginBtn = document.getElementById('login-btn');
    const loginText = document.getElementById('login-text');
    const loginSpinner = document.getElementById('login-spinner');

    // Validation
    if (!username || !password) {
        showAlert('Vui lòng nhập đầy đủ thông tin', 'danger');
        return;
    }

    // Show loading
    loginBtn.disabled = true;
    loginText.classList.add('d-none');
    loginSpinner.classList.remove('d-none');

    try {
        const response = await AuthService.login({ username, password });

        if (response.success) {
            showAlert('Đăng nhập thành công!', 'success');
            setTimeout(() => {
                router.navigate('/dashboard');
            }, 500);
        } else {
            showAlert(response.message || 'Đăng nhập thất bại', 'danger');
        }
    } catch (error) {
        showAlert(error.message || 'Có lỗi xảy ra. Vui lòng thử lại.', 'danger');
    } finally {
        loginBtn.disabled = false;
        loginText.classList.remove('d-none');
        loginSpinner.classList.add('d-none');
    }
}

function showAlert(message, type) {
    const container = document.getElementById('alert-container');
    container.innerHTML = `
    <div class="alert alert-${type} alert-dismissible fade show" role="alert">
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    </div>
  `;

    // Auto dismiss after 5 seconds
    setTimeout(() => {
        container.innerHTML = '';
    }, 5000);
}

function addAuthStyles() {
    if (!document.getElementById('auth-styles')) {
        const style = document.createElement('style');
        style.id = 'auth-styles';
        style.textContent = `
      .auth-container {
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 2rem;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      }

      .auth-card {
        width: 100%;
        max-width: 420px;
        border: none;
        border-radius: 1rem;
      }

      .form-check-input:checked {
        background-color: var(--primary-color);
        border-color: var(--primary-color);
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
