# Claude Code インストール & GitHub連携

## ターミナルの種類（Windows）

Windowsには複数のターミナル環境があり、それぞれ役割が異なる。

| 名前 | 概要 | 用途 |
|------|------|------|
| **コマンドプロンプト（CMD）** | 最も古いWindowsのシェル。`.bat`ファイルを動かす用途が主 | レガシーなWindows操作 |
| **PowerShell** | Windowsに標準搭載された高機能シェル。スクリプトや自動化に強い | Windows管理・自動化 |
| **Git Bash** | Gitインストール時に付属するUnix互換シェル。`ls`や`cat`などが使える | Git操作・Unix系コマンド |
| **Windows Terminal** | 上記を統合して管理できるタブ型ターミナルアプリ | 複数シェルをまとめて使う |

### Node.js との関係

**Node.js はターミナルではなく、JavaScriptの実行環境。**

- ブラウザ外でJavaScriptを動かすためのランタイム
- `npm`（パッケージマネージャー）が同梱されており、`claude`や`gh`などのCLIツールをインストールするために使う
- Claude Codeのインストールには `npm install -g` を使うため、Node.jsが必須

```
Node.js（実行環境）
  └── npm（パッケージ管理）
        └── claude, gh などのCLIツールをインストール
```

### Claude Codeを動かすおすすめ環境

**PowerShell または Git Bash** を使うのが無難。
CMDでも動作するが、Unix系のコマンドが使えないため不便な場面がある。

---

## 前提条件

### Node.js 18以上

```bash
node --version
```

インストールされていない場合は https://nodejs.org からダウンロード。

### Git

```bash
git --version
```

「command not found」や「'git' は認識されていません」と表示された場合はインストールが必要。

**Windows:**

```bash
winget install --id Git.Git
```

または https://git-scm.com からダウンロード。

インストール後、ターミナルを再起動して再確認。

**初期設定（初回のみ）:**

```bash
git config --global user.name "Your Name"
git config --global user.email "your@email.com"
```

---

## 1. Claude Code インストール

```bash
npm install -g @anthropic-ai/claude-code
```

確認:

```bash
claude --version
```

---

## 2. Anthropic認証

```bash
claude
```

初回起動時にブラウザが開き、Anthropicアカウントでのログインを求められる。
ログイン後、CLIに戻って認証完了。

---

## 3. GitHub連携（GitHub CLI）

Claude Codeは `gh` コマンドを使ってGitHubと連携する。

### GitHub CLI インストール（Windows）

```bash
winget install --id GitHub.cli
```

または https://cli.github.com からダウンロード。

### 認証

```bash
gh auth login
```

対話形式で選択:

1. `GitHub.com`
2. `HTTPS`
3. ブラウザで認証

確認:

```bash
gh auth status
```

---

## 4. 動作確認

```bash
cd your-project
claude
```

`/help` で利用可能なコマンドを確認できる。

---

## よく使う操作

| 操作 | コマンド |
|------|---------|
| PR作成 | `gh pr create` |
| Issue一覧 | `gh issue list` |
| Claude起動 | `claude` |
