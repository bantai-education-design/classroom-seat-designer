# 学級座席デザイナー PowerShell操作手順ガイド

このガイドは、「学級座席デザイナー」の開発作業（GitHubへの保存、テストビルド、将来のWindowsアプリ化の準備など）をPowerShellで行う際の手順書です。

初心者の方でも、記載されているコマンドをコピー＆ペーストするだけで安全に作業を行えるように構成されています。

---

## 📅 目次
1. [最初にプロジェクトフォルダーへ移動する](#1-最初にプロジェクトフォルダーへ移動する)
2. [現在のGit状態を確認する](#2-現在のgit状態を確認する)
3. [ドキュメント（README / MANUAL）の変更をGitHubへ反映する](#3-ドキュメントreadme--manualの変更をgithubへ反映する)
4. [プログラム（App.tsx / index.css）を修正した後の確認手順](#4-プログラムapptsx--indexcssを修正した後の確認手順)
5. [プログラムの修正をGitHubへ反映する標準手順](#5-プログラムの修正をgithubへ反映する標準手順)
6. [GitHub Pagesの公開反映を確認する流れ](#6-github-pagesの公開反映を確認する流れ)
7. [.gitignoreの確認（不要なファイルを送信しない設定）](#7-gitignoreの確認不要なファイルを送信しない設定)
8. [誤って不要なファイルがGitの管理に入ってしまった場合の対処法](#8-誤って不要なファイルがgitの管理に入ってしまった場合の対処法)
9. [将来ElectronでWindowsアプリ（.exe）化する前の動作確認](#9-将来electronでwindowsアプリexe化する前の動作確認)
10. [【重要】将来の.exe化におけるパス（base）の注意点](#10-重要将来のexe化におけるパスbaseの注意点)

---

## 1. 最初にプロジェクトフォルダーへ移動する
PowerShellを起動したら、まず以下のコマンドを実行して、このアプリが置かれているフォルダ（作業場所）に移動します。
```powershell
cd "C:\Users\User\.gemini\antigravity\scratch\classroom-seat-designer"
```

## 2. 現在のGit状態を確認する
「どのファイルを修正したか」「まだ保存（コミット）していない変更があるか」を確認します。
```powershell
# 変更されたファイルの一覧を確認
git status

# 具体的にどの行を修正したかの差分（違い）を確認
git diff
```

## 3. ドキュメント（README / MANUAL）の変更をGitHubへ反映する
README.md や MANUAL.md のテキストファイルを修正・追加した際、その変更をGitHubへ保存・反映します。
```powershell
# 1. 変更したファイルを追加候補に入れる
git add README.md MANUAL.md

# 2. 変更内容を記録（コミット）する
git commit -m "docs: update README.md and add MANUAL.md"

# 3. GitHubのリモートリポジトリへ送信する
git push origin main
```

## 4. プログラム（App.tsx / index.css）を修正した後の確認手順
プログラムファイル（App.tsx など）を書き換えた後は、GitHubに保存する前に、正しく動作するかテスト（ビルド）を行います。
```powershell
# 1. プログラムの型チェックとビルド（テスト）を実行
# ※エラーが出ずに成功することを確認してください
npm run build

# 2. 変更があったファイルの状態を確認
git status

# 3. 意図しないテスト用の記述などが残っていないか差分を確認
git diff
```

## 5. プログラムの修正をGitHubへ反映する標準手順
テストビルドに成功したプログラムの変更を、安全にGitHubへ保存します。
```powershell
# 1. 修正したプログラムファイルを追加候補に入れる
git add src/App.tsx src/index.css

# 2. 変更内容を分かりやすくメッセージにして記録（コミット）
git commit -m "feat: modify print layout and name size option"

# 3. GitHubのリモートリポジトリへ送信
git push origin main
```

## 6. GitHub Pagesの公開反映を確認する流れ
GitHubへ送信（Push）した後、Web公開版に反映されるのを確認する手順です。

1. **GitHub上の Actions タブを確認する**:
   ブラウザでGitHubのリポジトリ（ `https://github.com/bantai-education-design/classroom-seat-designer` ）にアクセスし、上部メニューの **「Actions」** タブをクリックします。
2. **緑色のチェックマークを確認する**:
   `pages-build-deployment` という処理が動いているので、これが **緑色のチェックマーク（Success）** になるまで待ちます（通常1〜3分かかります）。
3. **公開URLで確認する**:
   [公開URL（https://bantai-education-design.github.io/classroom-seat-designer/）](https://bantai-education-design.github.io/classroom-seat-designer/) にアクセスします。
4. **スーパーリロードで最新にする**:
   表示が変わらない場合は、以前のキャッシュがブラウザに残っている可能性があります。Windowsの場合はキーボードの **`Ctrl + F5`**（または `Shift + F5`）を押して、ページを強制的に最新状態へ更新してください。

## 7. .gitignoreの確認（不要なファイルを送信しない設定）
アプリの開発に必要な外部ライブラリ（`node_modules`）や、ビルド時に自動生成される一時ファイル（`dist`）は、ファイルサイズが非常に大きいため、GitHubに送信しないルールになっています。
プロジェクトフォルダ内にある `.gitignore` ファイルを開き、以下の行が記述されていることを確認してください。
```text
node_modules/
dist/
```

## 8. 誤って不要なファイルがGitの管理に入ってしまった場合の対処法
もし `.gitignore` を設定し忘れるなどして、誤って `node_modules` や `dist` フォルダの中身が `git status` でコミット候補（送信候補）に出てきてしまった場合は、以下のコマンドを実行してGitの管理追跡から外します。
```powershell
# ※このコマンドを実行しても、パソコン内の実際のファイルやフォルダは削除されませんので安心してください。
git rm -r --cached dist
git rm -r --cached node_modules
```

## 9. 将来ElectronでWindowsアプリ（.exe）化する前の動作確認
将来的に、学校のオフライン環境でもインストールして動かせる Windows専用アプリ（.exe）を作るための準備確認コマンドです。
```powershell
# 1. パソコンのNode.jsおよびnpmが動作しているかバージョンを確認
node -v
npm -v

# 2. ローカルの開発用サーバーを立ち上げて、パソコン上で正常に動くか確認
npm run dev

# 3. 静的なビルド成果物ファイルが dist フォルダに正しく書き出されるか確認
npm run build
```

## 10. 【重要】将来の.exe化におけるパス（base）の注意点
Web公開版（GitHub Pages）と、将来のWindowsアプリ版（Electron）では、プログラム内のアセット（画像やスクリプト）を読み込むための基準ルートパス（`base`）の設定が異なります。

* **GitHub Pages（Web公開版）**: `/classroom-seat-designer/` （リポジトリ名）
* **Electron（Windowsアプリ版）**: `./` （相対パス）

> [!WARNING]
> **単純な固定値の書き換えはNGです**
> `vite.config.ts` ファイル内の `base` 設定を単純に固定の `"./"` に書き換えてGitHubに送信すると、**Web公開版（GitHub Pages）の表示が真っ白になり壊れてしまいます**。
> 将来的に.exe化を進める際は、ビルド時の環境変数（例：`process.env.BUILD_TARGET === 'electron'` など）を用いて、自動で出力パスが切り替わるような「両立設計」にする必要があります。

---
