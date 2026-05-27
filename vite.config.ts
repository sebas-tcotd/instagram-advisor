import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  root: 'src',
  envDir: '../',
  build: { outDir: '../dist' },
  server: { port: 5173 },
  resolve: {
    alias: { '@prompts': resolve(__dirname, 'prompts') },
  },
})
