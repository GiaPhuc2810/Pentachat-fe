import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backendTarget = env.VITE_DEV_BACKEND_URL || 'http://127.0.0.1:8080'

  return {
    define: {
      global: 'window'
    },
    server: {
      host: true,
      port: 5173,
      allowedHosts: [
        'nontheistically-subcutaneous-albertina.ngrok-free.dev'
      ],
      proxy: {
        '/api': {
          target: backendTarget,
          changeOrigin: true
        },
        '/ws': {
          target: backendTarget,
          ws: true,
          changeOrigin: true
        }
      }
    },
    build: {
      outDir: 'dist',
      sourcemap: true
    }
  }
})
