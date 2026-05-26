import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Actions 上でのビルド時はリポジトリ名をベースパスに自動設定
const base = process.env.GITHUB_REPOSITORY
  ? `/${process.env.GITHUB_REPOSITORY.split('/')[1]}/`
  : '/'

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [react()],
})
