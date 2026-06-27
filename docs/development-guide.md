# GitHub を使った開発手順ガイド

## 全体の流れ

```
① ローカルでコード修正（VS Code）
    ↓
② ローカルで動作確認（localhost）
    ↓
③ 変更を記録（git add → git commit）
    ↓
④ GitHub に送信（git push）
    ↓
⑤ 自動デプロイ（Render / Vercel が自動で反映）
    ↓
⑥ 本番環境で確認（vercel.app）
```

---

## 事前準備

### 必要なツール

| ツール | 用途 |
|---|---|
| Git | バージョン管理 |
| VS Code | コード編集 |
| Node.js / npm | フロントエンド開発 |
| Python / pip | バックエンド開発 |

### 環境構成

```
weather/
├── backend/          ← Python (FastAPI)
│   ├── main.py
│   ├── requirements.txt
│   └── venv/         ← 仮想環境（Git管理対象外）
├── frontend/         ← React (Vite)
│   ├── src/
│   ├── package.json
│   └── node_modules/ ← 依存パッケージ（Git管理対象外）
├── start.bat         ← ローカル起動用
├── stop.bat          ← ローカル停止用
└── .gitignore        ← Git管理対象外ファイルの指定
```

---

## 開発手順（日常作業）

### ステップ①：ローカルサーバーを起動

`start.bat` をダブルクリック、またはターミナルで以下を実行：

**ターミナル 1（バックエンド）：**
```powershell
cd c:\Users\tm941102\Box\MyFolder\ai-app\weather\backend
.\venv\Scripts\activate
uvicorn main:app --reload
```

**ターミナル 2（フロントエンド）：**
```powershell
cd c:\Users\tm941102\Box\MyFolder\ai-app\weather\frontend
npm run dev
```

ブラウザで `http://localhost:5173` を開いて動作確認。

### ステップ②：コードを修正

VS Code でファイルを編集して保存。  
`--reload` オプションにより、保存すると自動でサーバーが再起動される。  
ブラウザをリロードして変更を確認。

### ステップ③：変更内容を確認

```powershell
git status
```

変更されたファイルの一覧が表示される。

```powershell
git diff
```

変更内容の詳細（差分）が表示される。

### ステップ④：変更を記録（コミット）

```powershell
git add ファイル名
```

複数ファイルの場合：
```powershell
git add backend/main.py frontend/src/App.jsx
```

コミット（変更を履歴に記録）：
```powershell
git commit -m "変更内容の説明"
```

コミットメッセージの例：
- `"Fix: 湿度の表示が正しくない問題を修正"`
- `"Add: 週間予報カードを追加"`
- `"Update: グラフのデザインを改善"`

### ステップ⑤：GitHub に送信（プッシュ）

```powershell
git push
```

このコマンドで GitHub にコードが送信される。  
Render（バックエンド）と Vercel（フロントエンド）が自動で再デプロイされる。

### ステップ⑥：本番環境で確認

2〜3 分後にブラウザで確認：
- フロントエンド: https://weather-dashboard-vert-kappa.vercel.app
- バックエンド API: https://weather-dashboard-f37y.onrender.com/docs

---

## よく使う Git コマンド一覧

### 基本操作

| コマンド | 説明 |
|---|---|
| `git status` | 変更されたファイルを確認 |
| `git diff` | 変更内容の差分を表示 |
| `git add ファイル名` | ファイルをステージング（コミット対象に追加） |
| `git commit -m "メッセージ"` | 変更を履歴に記録 |
| `git push` | GitHub に送信 |
| `git log --oneline` | コミット履歴を一覧表示 |

### 取り消し操作

| コマンド | 説明 |
|---|---|
| `git checkout -- ファイル名` | 未コミットの変更を元に戻す |
| `git reset HEAD ファイル名` | ステージングを取り消す（変更は残る） |

### 確認操作

| コマンド | 説明 |
|---|---|
| `git log` | コミット履歴を詳細表示 |
| `git log --oneline` | コミット履歴を1行ずつ表示 |
| `git show コミットID` | 特定のコミットの変更内容を表示 |

---

## ローカルサーバーの起動・停止

### 起動
`start.bat` をダブルクリック（黒い画面が 2 つ開く）

### 停止
`stop.bat` をダブルクリック（全プロセスが終了する）

### 手動で停止する場合
各ターミナルで `Ctrl + C` を押す

---

## トラブルシューティング

### `git push` でエラーが出る

```powershell
git pull --rebase
git push
```

### ローカルサーバーが起動しない

ポートが使用中の可能性がある。`stop.bat` を実行してから再度 `start.bat` を実行。

### npm パッケージの追加が必要な場合

```powershell
cd c:\Users\tm941102\Box\MyFolder\ai-app\weather\frontend
npm install パッケージ名
```

### Python パッケージの追加が必要な場合

```powershell
cd c:\Users\tm941102\Box\MyFolder\ai-app\weather\backend
.\venv\Scripts\activate
pip install パッケージ名
```

`requirements.txt` も更新すること：
```powershell
pip freeze > requirements.txt
```

---

## 環境情報

| 項目 | 値 |
|---|---|
| GitHub リポジトリ | https://github.com/cam17510-stack/weather-dashboard |
| フロントエンド（本番） | https://weather-dashboard-vert-kappa.vercel.app |
| バックエンド API（本番） | https://weather-dashboard-f37y.onrender.com |
| フロントエンド（ローカル） | http://localhost:5173 |
| バックエンド API（ローカル） | http://localhost:8000 |
