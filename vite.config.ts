import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// ビルド時のターゲット環境変数を取得
const isElectron = process.env.BUILD_TARGET === 'electron'

// 1. Electronビルド時は相対パス "./"
// 2. GitHub Actions上でのWeb公開ビルド時はリポジトリ名 "/[repo-name]/"
// 3. ローカル開発サーバー起動時は "/"
const base = isElectron
  ? './'
  : process.env.GITHUB_REPOSITORY
    ? `/${process.env.GITHUB_REPOSITORY.split('/')[1]}/`
    : '/'

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [react()],
})
