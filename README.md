# AWS SAA 学習効率最大化システム (Gemini 3 Pro 搭載版)

AWS Certified Solutions Architect - Associate (SAA) の合格に必要な「問題理解と解答根拠の深い理解」を最短距離で実現するためのシステム。

## システムコンセプト

- **問題ベース学習**: 試験問題と選択肢を入力することで、AIが詳細な解説を生成
- **深い推論**: Gemini 3 Pro の高度な推論能力を用いて、各選択肢が正解・不正解である理由を明確に説明
- **包括的な解説**: 正解の理由、各選択肢の解説、学習ポイント、関連サービスを網羅的に提供

## 技術スタック

- **Framework**: Next.js 15 (App Router)
- **AI Model**: Gemini 3 Pro (via Google Generative AI SDK)
- **Database**: Notion (ヘッドレスDBとして)
- **Architecture**: Clean Architecture パターン
- **Styling**: Tailwind CSS

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.local` ファイルを作成し、以下の環境変数を設定してください：

```bash
cp .env.example .env.local
```

必要な環境変数：
- `GEMINI_API_KEY`: Google AI Studio で取得したAPIキー
- `NOTION_API_KEY`: Notion Integration で作成したAPIキー
- `NOTION_DATABASE_ID`: NotionデータベースのID

### 3. Notionデータベースのセットアップ

Notionで以下のプロパティを持つデータベースを作成してください：

| プロパティ名 | 型 | 必須 |
| --- | --- | --- |
| **Question Text** | Title | ✓ |
| **Choices** | Rich Text | ✓ |
| **Correct Answer** | Number | ✓ |
| **Correct Choice Text** | Rich Text | ✓ |
| **Explanation** | Rich Text | ✓ |
| **Related Services** | Multi-select | ✓ |
| **Well-Architected Category** | Multi-select | ✓ |
| **Choice Explanations** | Rich Text | ✓ |
| **Architecture Diagram** | Rich Text | - |
| **Learning Points** | Rich Text | ✓ |
| **Similar Questions Hint** | Rich Text | - |

**Multi-select のオプション:**
- `cost-optimization`
- `performance-efficiency`
- `reliability`
- `security`
- `operational-excellence`
- `sustainability`

**Notion Integration の設定:**
1. [Notion Integrations](https://www.notion.so/my-integrations) にアクセス
2. 新しいIntegrationを作成
3. 作成したデータベースにIntegrationを接続（右上の「...」→「接続」→ Integrationを選択）

**注意: Architecture Diagram について**
- Notion APIではCode型のプロパティを直接サポートしていないため、Rich Text型として保存されます
- Mermaid図を表示するには、Notionページ内で手動でCodeブロックを作成し、言語を「mermaid」に設定してください
- または、NotionのMermaid統合機能（利用可能な場合）を使用してください

**問題入力のヒント**
- 問題文は完全に入力してください（省略しない）
- 選択肢は最低2つ、最大4つまで入力可能です
- 空の選択肢は自動的に除外されます

### 4. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いてください。

## 使用方法

1. メインページで問題文を入力
2. 選択肢を入力（最低2つ、最大4つ）
3. 「解説を生成」ボタンをクリック
4. Gemini 3 Pro が問題を分析し、詳細な解説を生成
5. 解説がNotionに自動保存される
6. 生成された内容を確認（正解、解説、各選択肢の説明、学習ポイントなど）

## アーキテクチャ

### Clean Architecture のレイヤー構造

```
src/
├── features/
│   └── aws-note/
│       ├── entities/          # ドメインエンティティ（型定義）
│       ├── usecases/          # ビジネスロジック（オーケストレーション）
│       └── infrastructure/    # 外部SDK（Gemini / Notion）
└── app/
    ├── actions.ts             # Server Actions（エントリポイント）
    └── page.tsx               # UIコンポーネント
```

### データフロー

```
User Input → Server Action → UseCase → Gemini 3 Pro API
                                              ↓
                                    Structured Analysis
                                              ↓
                                    Notion SDK → Notion Database
```

## 機能

### 1. AI Brain: Gemini 3 Pro による問題解説生成

- **Reasoning Mode**: 解答根拠をステップバイステップで抽出
- **Choice Analysis**: 各選択肢が正解・不正解である理由を詳細に説明
- **Schema Consistency**: 100%厳格なJSON構造出力

### 2. Notion Data Bridge: ヘッドレスDB連携

- **Automatic Provisioning**: 問題文と選択肢を入力するだけで、完全に埋められたNotionページを自動生成
- **Bidirectional Context**: 既存ノートを読み込んで知識のアップデートを提案（将来実装予定）

### 3. Categorization Engine: インテリジェント・タギング

- **Auto-Categorization**: Well-Architected Framework の6つの柱を自動判定
- **Service Tagging**: 関連するAWSサービスを自動抽出

### 4. 包括的な学習支援

- **Learning Points**: 試験合格のために重要なポイントを抽出
- **Similar Questions Hint**: 類似問題を解く際のヒントを提供
- **Architecture Diagrams**: 該当する場合、Mermaid.js形式のアーキテクチャ図を生成

## 開発

### 型チェック

```bash
npm run type-check
```

### リント

```bash
npm run lint
```

## ライセンス

MIT

