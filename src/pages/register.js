import AuthService from '../services/auth.service.js';
import router from '../router.js';

export function renderRegister() {
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
            <p class="text-muted">Tạo tài khoản mới</p>
          </div>

          <div id="alert-container"></div>

          <form id="register-form">
            <div class="form-group">
              <label class="form-label" for="reg-username">Tên đăng nhập</label>
              <input 
                type="text" 
                class="form-control" 
                id="reg-username" 
                name="username"
                placeholder="Nhập tên đăng nhập"
                required
                minlength="3"
              />
              <div class="form-text">Tối thiểu 3 ký tự</div>
            </div>

            <div class="form-group">
              <label class="form-label" for="reg-email">Email</label>
              <input 
                type="email" 
                class="form-control" 
                id="reg-email" 
                name="email"
                placeholder="Nhập email"
                required
              />
            </div>

            <div class="form-group">
              <label class="form-label" for="reg-password">Mật khẩu</label>
              <input 
                type="password" 
                class="form-control" 
                id="reg-password" 
                name="password"
                placeholder="Nhập mật khẩu"
                required
                minlength="6"
              />
              <div class="form-text">Tối thiểu 6 ký tự</div>
            </div>

            <div class="form-group">
              <label class="form-label" for="reg-confirm-password">Xác nhận mật khẩu</label>
              <input 
                type="password" 
                class="form-control" 
                id="reg-confirm-password" 
                name="confirmPassword"
                placeholder="Nhập lại mật khẩu"
                required
              />
            </div>

            <div class="form-check mb-3">
              <input class="form-check-input" type="checkbox" id="terms" required>
              <label class="form-check-label" for="terms">
                Tôi đồng ý với <a href="#" class="text-primary">Điều khoản sử dụng</a>
              </label>
            </div>

            <button type="submit" class="btn btn-primary btn-block btn-lg" id="register-btn">
              <span id="register-text">Đăng ký</span>
              <span id="register-spinner" class="spinner d-none"></span>
            </button>
          </form>

          <div class="text-center mt-4">
            <p class="text-muted">
              Đã có tài khoản? 
              <a href="#/login" class="text-primary fw-bold">Đăng nhập</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  `;

    // Add styles
    addAuthStyles();

    // Handle form submission
    const form = document.getElementById('register-form');
    form.addEventListener('submit', handleRegister);
}

async function handleRegister(e) {
    e.preventDefault();

    const username = document.getElementById('reg-username').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const confirmPassword = document.getElementById('reg-confirm-password').value;
    const terms = document.getElementById('terms').checked;

    const registerBtn = document.getElementById('register-btn');
    const registerText = document.getElementById('register-text');
    const registerSpinner = document.getElementById('register-spinner');

    // Validation
    if (!username || !email || !password || !confirmPassword) {
        showAlert('Vui lòng nhập đầy đủ thông tin', 'danger');
        return;
    }

    if (username.length < 3) {
        showAlert('Tên đăng nhập phải có ít nhất 3 ký tự', 'danger');
        return;
    }

    if (password.length < 6) {
        showAlert('Mật khẩu phải có ít nhất 6 ký tự', 'danger');
        return;
    }

    if (password !== confirmPassword) {
        showAlert('Mật khẩu xác nhận không khớp', 'danger');
        return;
    }

    if (!terms) {
        showAlert('Vui lòng đồng ý với điều khoản sử dụng', 'danger');
        return;
    }

    // Show loading
    registerBtn.disabled = true;
    registerText.classList.add('d-none');
    registerSpinner.classList.remove('d-none');

    try {
        const response = await AuthService.register({ username, email, password });

        if (response.success) {
            showAlert('Đăng ký thành công! Đang chuyển đến trang đăng nhập...', 'success');
            setTimeout(() => {
                router.navigate('/login');
            }, 1500);
        } else {
            showAlert(response.message || 'Đăng ký thất bại', 'danger');
            registerBtn.disabled = false;
            registerText.classList.remove('d-none');
            registerSpinner.classList.add('d-none');
        }
    } catch (error) {
        showAlert(error.message || 'Có lỗi xảy ra. Vui lòng thử lại.', 'danger');
        registerBtn.disabled = false;
        registerText.classList.remove('d-none');
        registerSpinner.classList.add('d-none');
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
