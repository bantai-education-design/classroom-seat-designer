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
9. [Electronでのデスクトップアプリ起動とWindows用ポータブルexeの作成手順](#9-electronでのデスクトップアプリ起動とwindows用ポータブルexeの作成手順)
10. [Web版（GitHub Pages）と Electron（Windowsアプリ版）のパス（base）自動切替について](#10-web版github-pagesと-electronwindowsアプリ版のパスbase自動切替について)

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

## 9. Electronでのデスクトップアプリ起動とWindows用ポータブルexeの作成手順

Windows用のポータブル実行ファイル（exe）を作成したり、デスクトップアプリ版の動作を確認するコマンドです。

```powershell
# 1. デスクトップアプリのローカル開発用起動（ホットリロード対応）
npm run electron:dev

# 2. Windows用ポータブルexeのパッケージ作成 (ビルド)
# 実行すると、Web用のビルドを行ったのち、Electron用のパッケージングが実行されます。
npm run electron:pack

# 3. 作成されたexeファイルなどの確認
Get-ChildItem -Path release

# 4. 作成されたポータブル版アプリをPowerShellから直接起動してテストする
.\release\学級座席デザイナー-v1.0.0-portable.exe
```

> [!WARNING]
> **【超重要】release/ フォルダは絶対に GitHub にプッシュしないでください**
> ビルドによって自動生成される `release/` フォルダはファイルサイズが非常に大きく、また環境依存のバイナリが含まれます。そのため、`.gitignore` ファイルによって自動的にGitの管理対象外に設定されています。
> 誤って `release/` や生成された `.exe` ファイルを `git add` などでコミット・プッシュしないよう厳重に注意してください。

## 10. Web版（GitHub Pages）と Electron（Windowsアプリ版）のパス（base）自動切替について

Web公開版（GitHub Pages）と、Windowsアプリ版（Electron）では、プログラム内のアセット（画像やスクリプト）を読み込むための基準ルートパス（`base`）の設定が異なります。

* **GitHub Pages（Web公開版）**: `/classroom-seat-designer/` （リポジトリ名）
* **Electron（Windowsアプリ版）**: `./` （相対パス）

本プロジェクトでは、`vite.config.ts` において環境変数 `BUILD_TARGET` を参照し、以下のように自動で切り替える両立設計を行っています。

```typescript
const isElectron = process.env.BUILD_TARGET === 'electron';
// ...
base: isElectron ? './' : '/classroom-seat-designer/',
```

これにより、同一のソースコードからWeb公開版とWindowsアプリ版の両方を同時に維持・動作させることができます。

---

## 11. 配布ZIP作成後のリリース手順（v1.0.0など正式版のとき）

バージョン（`package.json` の `version`）を更新し、`npm run electron:pack` で新しいexeを作成した後の、配布物の管理・公開手順です。

```powershell
# 1. package.json の version を更新（例: 1.0.0）した後、ビルド
npm run build
npm run electron:pack

# 2. 作成された release/ 配下のexeを、保管用フォルダーへコピー
#    （保管用フォルダーはGit管理対象外。バージョンごとにフォルダを分けて保管する）
Copy-Item ".\release\学級座席デザイナー-v1.0.0-portable.exe" "C:\Users\User\Documents\アプリ\classroom-seat-designer\"

# 3. 保管用フォルダー側で配布用ZIPを作成（exe + README_最初にお読みください.txt + MANUAL.md）
#    ZIPの中身は手作業またはスクリプトでまとめてください
```

> [!WARNING]
> **release/、dist/、node_modules/、exeファイル、zipファイルは、いずれもGitHubにコミット・プッシュしないでください。**
> これらはすべて `.gitignore` の対象、またはビルド生成物です。Gitにコミットしてよいのは `package.json`・`package-lock.json`・`README.md`・`MANUAL.md`・`POWERSHELL_GUIDE.md` などの設定・ドキュメントファイルのみです。

> [!NOTE]
> 配布用のexe・ZIPファイルは `C:\Users\User\Documents\アプリ\classroom-seat-designer\`（保管用フォルダー）で管理します。GitHubリポジトリ本体には含めません。
> GitHub Releases への登録（タグ作成・ZIP添付・公開）は、このガイドの範囲外の**手動作業**です。準備ができたら GitHub の「Releases」画面から手動でタグ（例: `v1.0.0`）を作成し、保管用フォルダーのZIPを添付して公開してください。

---
