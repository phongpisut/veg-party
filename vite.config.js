import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base must match the GitHub Pages subpath (repo name) so assets resolve
// under https://<user>.github.io/veg-party/
export default defineConfig({
  plugins: [react()],
  base: '/veg-party/',
})
