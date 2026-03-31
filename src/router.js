import AuthService from './services/auth.service.js';

class Router {
    constructor() {
        this.routes = new Map();
        this.currentRoute = null;
        this.init();
    }

    init() {
        // Listen for hash changes
        window.addEventListener('hashchange', () => this.handleRoute());
        window.addEventListener('load', () => this.handleRoute());
    }

    /**
     * Register a route
     * @param {string} path - Route path (e.g., '/login', '/dashboard')
     * @param {Function} handler - Function that renders the page
     * @param {boolean} requiresAuth - Whether route requires authentication
     */
    register(path, handler, requiresAuth = false) {
        this.routes.set(path, { handler, requiresAuth });
    }

    /**
     * Navigate to a route
     * @param {string} path - Route path
     */
    navigate(path) {
        window.location.hash = `#${path}`;
    }

    /**
     * Handle route changes
     */
    async handleRoute() {
        // Get current path from hash and ignore query string for route lookup
        const rawHash = window.location.hash.slice(1) || '/';
        const [pathOnly] = rawHash.split('?');
        let path = pathOnly || '/';

        // Remove trailing slash
        if (path !== '/' && path.endsWith('/')) {
            path = path.slice(0, -1);
        }

        // Find matching route
        const route = this.routes.get(path);

        // If route not found, redirect to 404 or home
        if (!route) {
            if (AuthService.isAuthenticated()) {
                this.navigate('/dashboard');
            } else {
                this.navigate('/login');
            }
            return;
        }

        // Check authentication
        if (route.requiresAuth && !AuthService.isAuthenticated()) {
            this.navigate('/login');
            return;
        }

        // If authenticated user tries to access login/register, redirect to dashboard
        if ((path === '/login' || path === '/register') && AuthService.isAuthenticated()) {
            this.navigate('/dashboard');
            return;
        }

        // Store current route
        this.currentRoute = path;

        // Execute route handler
        try {
            await route.handler();

            // Hide loading indicator after first successful render
            const loadingEl = document.getElementById('loading');
            if (loadingEl) {
                loadingEl.style.display = 'none';
            }
        } catch (error) {
            console.error('Error rendering route:', error);

            // Hide loading indicator even on error
            const loadingEl = document.getElementById('loading');
            if (loadingEl) {
                loadingEl.style.display = 'none';
            }

            this.showError('Failed to load page');
        }
    }

    /**
     * Get current route path
     */
    getCurrentRoute() {
        return this.currentRoute;
    }

    /**
     * Show error message
     */
    showError(message) {
        const app = document.getElementById('app');
        if (app) {
            app.innerHTML = `
        <div class="container mt-5">
          <div class="alert alert-danger">
            <h4>Error</h4>
            <p>${message}</p>
            <button class="btn btn-primary" onclick="window.location.reload()">
              Reload Page
            </button>
          </div>
        </div>
      `;
        }
    }
}

// Create and export router instance
const router = new Router();
export default router;
