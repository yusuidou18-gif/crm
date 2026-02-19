# 湧水堂リフォーム CRM

住宅リフォーム（水回り・内装）の営業プロセスを自動化・データ化するWebアプリケーション。

---

## アーキテクチャ概要

```
┌──────────────────┐         ┌──────────────────────────┐
│   Next.js 14     │  HTTP   │    FastAPI (Python)       │
│   (App Router)   │◄───────►│    + SQLAlchemy           │
│   Tailwind CSS   │         │    + SQLite               │
│   Recharts       │         │    + OpenAI GPT-4o         │
└──────────────────┘         │    + ReportLab (PDF)      │
                             └──────────────────────────┘
```

### ER図

```
Customer ──< Quote >── Staff
              │
              ├──< QuoteItem >── Product ──< ProductOption
                                  │
                                  └── Category
```

| エンティティ | 説明 |
|---|---|
| Customer | 顧客（法人・個人） |
| Staff | 営業担当者 |
| Category | 商品カテゴリ（トイレ/洗面/バス/キッチン/給湯器/内装/その他） |
| Product | 商品マスタ（販売単価・仕入単価・標準施工費） |
| ProductOption | 商品に紐づくオプション（親子構造） |
| Quote | 見積書（ステータス管理：作成中/提出済/受注/失注） |
| QuoteItem | 見積明細（インライン編集可、オプション選択） |

---

## 機能一覧

- **ダッシュボード**
  - KPI（総見積件数・受注件数・受注金額・受注率）
  - 月次受注金額推移グラフ（棒グラフ）
  - ステータス別件数（ドーナツチャート）
  - 担当者別受注実績ランキング
  - カテゴリ別売上比率（円グラフ）

- **AI自動見積生成**
  - 自然言語入力（例：「キッチンのリフォーム。LIXILのシエラ、食洗機付きで...」）
  - 画像アップロード対応（GPT-4o Vision）
  - 抽出結果のプレビューと明細への一括追加

- **ハイブリッド見積エディタ**
  - マニュアルモード：カテゴリ選択 → 商品マスタから選択 → オプション追加
  - インライン編集：品名・数量・単価・施工費をブラウザ上で直接編集
  - オプション加算ロジック：選択オプション合計を自動計算
  - 粗利益・粗利率のリアルタイム表示

- **商品マスタ管理**
  - カテゴリ別商品登録（販売単価・仕入単価・標準施工費）
  - 商品に紐づくオプションの親子構造管理

- **顧客・担当者管理**
  - 顧客CRUD（名前・連絡先・住所・備考）
  - 担当者CRUD

- **プロ仕様PDF出力**
  - 見積書PDF自動生成（ReportLab）
  - 日本語対応・会社ロゴ・合計金額・税込表示

---

## セットアップ

### 必要環境

- Python 3.11+
- Node.js 20+
- OpenAI API キー

### 1. バックエンドのセットアップ

```bash
cd backend

# 仮想環境の作成（推奨）
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate

# 依存パッケージのインストール
pip install -r requirements.txt

# 環境変数の設定
cp .env.example .env
# .env を編集して OPENAI_API_KEY を設定

# サーバー起動
uvicorn main:app --reload --port 8000
```

API ドキュメント: http://localhost:8000/docs

### 2. フロントエンドのセットアップ

```bash
cd frontend

# 依存パッケージのインストール
npm install

# 環境変数の設定（オプション）
# .env.local を作成
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local

# 開発サーバー起動
npm run dev
```

アプリ: http://localhost:3000

---

## 環境変数

### バックエンド (`.env`)

| 変数名 | 説明 | 例 |
|---|---|---|
| `OPENAI_API_KEY` | OpenAI APIキー（AI見積生成に必須） | `sk-...` |
| `DATABASE_URL` | SQLiteのDB URL | `sqlite:///./renovation_crm.db` |

### フロントエンド (`.env.local`)

| 変数名 | 説明 | デフォルト |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | バックエンドAPIのURL | `http://localhost:8000` |

---

## バックエンド `.env.example`

```env
OPENAI_API_KEY=sk-your-api-key-here
DATABASE_URL=sqlite:///./renovation_crm.db
```

---

## 初期データ

アプリ起動時に以下のサンプルデータが自動投入されます：

**カテゴリ**: トイレ / 洗面 / バス / キッチン / 給湯器 / 内装 / その他

**サンプル商品**:
- システムキッチン シエラS (LIXIL) - 食洗機・コンロオプション付き
- ユニットバス アライズ (LIXIL) - 暖房乾燥機オプション付き
- サティスSタイプ (LIXIL トイレ)
- エコジョーズ GTH-C2461SAW3H (ノーリツ)
- 壁紙張替え（量産品）

**サンプル担当者**: 田中一郎 / 鈴木花子 / 佐藤次郎

**サンプル顧客**: 山田太郎 / 株式会社スミス

---

## ディレクトリ構成

```
crm/
├── backend/
│   ├── main.py              # FastAPI アプリ本体・初期データ投入
│   ├── database.py          # SQLAlchemy 設定
│   ├── models.py            # DBモデル（Customer/Staff/Category/Product/Quote/QuoteItem）
│   ├── schemas.py           # Pydantic スキーマ
│   ├── requirements.txt
│   ├── routers/
│   │   ├── customers.py     # 顧客 CRUD
│   │   ├── staff.py         # 担当者 CRUD
│   │   ├── categories.py    # カテゴリ CRUD
│   │   ├── products.py      # 商品マスタ CRUD
│   │   ├── quotes.py        # 見積 CRUD + PDF生成
│   │   ├── dashboard.py     # ダッシュボード集計
│   │   └── ai_analysis.py   # AI見積解析エンドポイント
│   └── services/
│       ├── ai_service.py    # OpenAI GPT-4o 統合
│       └── pdf_service.py   # ReportLab PDF生成
└── frontend/
    └── src/
        ├── app/
        │   ├── dashboard/page.tsx      # ダッシュボード
        │   ├── quotes/
        │   │   ├── page.tsx            # 見積一覧
        │   │   ├── new/page.tsx        # 新規見積作成
        │   │   └── [id]/page.tsx       # 見積詳細・編集
        │   ├── customers/page.tsx      # 顧客管理
        │   ├── staff/page.tsx          # 担当者管理
        │   └── products/page.tsx       # 商品マスタ
        ├── components/
        │   ├── Sidebar.tsx             # ナビゲーション
        │   ├── QuoteEditor.tsx         # 見積明細インラインエディタ
        │   └── AIAnalysisPanel.tsx     # AI解析パネル
        └── lib/
            ├── api.ts                  # APIクライアント (axios)
            ├── types.ts                # TypeScript型定義
            └── utils.ts               # ユーティリティ（通貨フォーマット等）
```

---

## AI見積解析の仕組み

1. ユーザーが自然言語テキスト（または画像）を入力
2. GPT-4o にシステムプロンプトと入力を送信
3. GPT-4o が見積明細をJSON配列で返却
4. フロントエンドでプレビュー表示
5. 「明細に追加」ボタンで見積エディタに反映
6. 各項目はインライン編集可能

**例**:
```
入力: "キッチンのリフォーム。LIXILのシエラ、食洗機付きで壁紙も張り替えたい"

出力:
- システムキッチン シエラ (LIXIL) × 1式
  └ 食洗機（深型）オプション
- 壁紙張替え × 1式 (内装カテゴリ)
```

---

## 本番デプロイ

### バックエンド
- PostgreSQL への切替: `DATABASE_URL=postgresql://user:pass@host/db`
- `uvicorn main:app --host 0.0.0.0 --port 8000`

### フロントエンド
- `npm run build && npm run start`
- または Vercel / AWS Amplify へデプロイ

---

## ライセンス

社内利用専用
