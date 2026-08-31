import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // GitHub Pages: https://coldclosewin-design.github.io/family-relation-view/
  base: '/family-relation-view/',
})
