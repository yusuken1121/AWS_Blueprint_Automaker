# ロガー機能の使用方法

## ログの出力先

### 開発環境（`npm run dev`）

ログは**開発サーバーを起動しているターミナル**に出力されます。

```bash
# ターミナルで開発サーバーを起動
npm run dev

# 以下のようにログが表示されます：
[2024-12-29T12:34:56.789Z] INFO  gemini-client.ts:72 analyzeQuestion - Starting question analysis
  Context: { questionLength: 150, choicesCount: 4 }
[2024-12-29T12:34:57.123Z] INFO  gemini-client.ts:94 analyzeQuestion - Question analysis completed successfully
  Context: { correctAnswer: 2, relatedServicesCount: 3 }
```

**重要**: ログは**ブラウザのコンソールではなく、サーバーサイド（Node.js）のターミナル**に出力されます。

### 本番環境

本番環境では、デプロイ先のログストリームに出力されます：

- **Vercel**: Vercel Dashboard の Functions タブで確認
- **AWS Lambda**: CloudWatch Logs で確認
- **Docker**: `docker logs <container-name>` で確認
- **その他**: デプロイ先のログ管理システムで確認

本番環境ではJSON形式で出力されます：

```json
{
  "timestamp": "2024-12-29T12:34:56.789Z",
  "level": "INFO",
  "message": "Starting question analysis",
  "file": "gemini-client.ts",
  "function": "GeminiClient.analyzeQuestion",
  "line": 72,
  "questionLength": 150,
  "choicesCount": 4
}
```

## ログが出力されるタイミング

ログは以下のタイミングで出力されます：

### 1. Server Action 実行時

```typescript
// src/app/actions.ts
logger.info("createExamQuestionNote called", {...});
```

**確認方法**: 問題解説生成を実行した際に、ターミナルにログが表示されます。

### 2. Gemini API 呼び出し時

```typescript
// src/features/aws-note/infrastructure/gemini-client.ts
logger.info("Starting question analysis", {...});
logger.debug("Sending request to Gemini API");
logger.error("Gemini API request failed", error, {...});
```

**確認方法**: 
- API呼び出し開始時
- API呼び出し成功時
- API呼び出し失敗時（エラーログ）

### 3. Notion API 呼び出し時

```typescript
// src/features/aws-note/infrastructure/notion-client.ts
logger.info("Starting Notion upsert operation", {...});
logger.debug("Searching for existing page", {...});
logger.error("Failed to upsert Notion page", error, {...});
```

**確認方法**: 
- Notionへの保存開始時
- ページ検索時
- 保存成功/失敗時

### 4. UseCase 実行時

```typescript
// src/features/aws-note/usecases/create-saa-note.ts
logger.info("CreateSaaNoteUseCase.execute started", {...});
logger.debug("Step 1: Analyzing question with Gemini");
logger.debug("Step 2: Saving to Notion");
```

**確認方法**: オーケストレーションの各ステップでログが出力されます。

## ログレベルの設定

環境変数 `LOG_LEVEL` でログレベルを設定できます。

### `.env.local` に設定

```bash
# すべてのログを表示（デバッグ時）
LOG_LEVEL=DEBUG

# 情報レベルのログを表示（デフォルト）
LOG_LEVEL=INFO

# 警告以上のログを表示
LOG_LEVEL=WARN

# エラーログのみ表示
LOG_LEVEL=ERROR
```

### ログレベルの説明

- **DEBUG**: デバッグ情報を含むすべてのログ（詳細な情報）
- **INFO**: 通常の動作情報（デフォルト）
- **WARN**: 警告レベルのログ
- **ERROR**: エラーログのみ

## ログの確認方法

### 開発環境での確認

1. **ターミナルで開発サーバーを起動**
   ```bash
   npm run dev
   ```

2. **ブラウザで問題解説生成を実行**

3. **ターミナルでログを確認**
   - ログはリアルタイムで表示されます
   - エラーが発生した場合、詳細なスタックトレースが表示されます

### ログのフィルタリング

ターミナルでログをフィルタリングする場合：

```bash
# INFO レベルのログのみ表示
npm run dev | grep "INFO"

# エラーログのみ表示
npm run dev | grep "ERROR"

# 特定のファイルのログのみ表示
npm run dev | grep "gemini-client.ts"
```

### ログをファイルに保存

```bash
# ログをファイルに保存
npm run dev > logs/dev.log 2>&1

# または、tee コマンドで画面とファイルの両方に出力
npm run dev 2>&1 | tee logs/dev.log
```

## トラブルシューティング

### ログが表示されない場合

1. **ログレベルを確認**
   ```bash
   # .env.local を確認
   cat .env.local | grep LOG_LEVEL
   ```

2. **環境変数が読み込まれているか確認**
   - Next.js の開発サーバーを再起動してください
   - `.env.local` の変更後は必ず再起動が必要です

3. **正しいターミナルを確認**
   - ログは開発サーバーを起動したターミナルに表示されます
   - ブラウザのコンソールには表示されません

### エラーログの確認

エラーが発生した場合、以下の情報がログに含まれます：

- **ファイル名と行番号**: エラーが発生した場所
- **関数名**: エラーが発生した関数
- **エラーメッセージ**: エラーの内容
- **スタックトレース**: エラーの呼び出しスタック
- **コンテキスト情報**: エラー発生時の状態

例：
```
[2024-12-29T12:34:56.789Z] ERROR gemini-client.ts:99 analyzeQuestion - Gemini API request failed
  Context: { questionLength: 150, choicesCount: 4 }
  Error: API key is invalid
  Stack: Error: API key is invalid
    at GeminiClient.analyzeQuestion (gemini-client.ts:99:15)
    at getQuestionAnalysis (create-saa-note.ts:18:25)
    ...
```

## ベストプラクティス

1. **開発時は DEBUG レベルを使用**
   - 詳細な情報を確認できます

2. **本番環境では INFO 以上に設定**
   - パフォーマンスへの影響を最小限に

3. **エラー発生時は ERROR ログを確認**
   - スタックトレースとコンテキスト情報を確認

4. **ログファイルを定期的に確認**
   - 本番環境ではログローテーションを設定

