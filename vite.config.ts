import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'url'
import { nitro } from 'nitro/vite'

const config = defineConfig({
  server: {
    allowedHosts: ['.ngrok-free.app', '.ngrok.io', '.trycloudflare.com'],
  },
  optimizeDeps: {
    exclude: [
      '@tanstack/start-server-core',
      '@tanstack/react-start',
      '@tanstack/react-start/server',
    ],
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  plugins: [
    // devtools(), // Disabled to reduce requests through ngrok
    nitro({
      // Externalize firebase-admin and dependencies to avoid ESM/grpc issues
      rollupConfig: {
        external: [
          'firebase-admin',
          'firebase-admin/app',
          'firebase-admin/firestore',
          '@google-cloud/firestore',
          'google-gax',
          '@grpc/grpc-js',
          '@grpc/proto-loader',
          'google-auth-library',
        ],
      },
      // Server handlers for dynamic routes
      handlers: [
        {
          route: '/.well-known/oauth-client.json',
          handler: './server/oauth-metadata.ts',
        },
        {
          route: '/api/block-stream',
          method: 'POST',
          handler: './server/api/block-stream.ts',
        },
        {
          route: '/api/login-app-password',
          method: 'POST',
          handler: './server/api/login-app-password.ts',
        },
        {
          route: '/api/oauth-start',
          method: 'GET',
          handler: './server/api/oauth-start.ts',
        },
        {
          route: '/api/get-blocking-tokens',
          method: 'GET',
          handler: './server/api/get-blocking-tokens.ts',
        },
      ],
    }),
    tailwindcss(),
    viteTsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    tanstackStart(),
    viteReact(),
  ],
})

export default config
