# AWS SAA 学習システム - コーディングルール

## アーキテクチャ原則

### Clean Architecture の遵守

本プロジェクトは Clean Architecture パターンに基づいて設計されています。以下のレイヤー構造を厳守してください。

```
src/features/aws-note/
├── entities/          # ドメインエンティティ（型定義、ビジネスロジック）
├── usecases/          # ユースケース（ビジネスロジックのオーケストレーション）
├── infrastructure/    # 外部SDK（Gemini API、Notion API）
└── presentation/      # UI層（Next.js App Router）
```

### 依存関係の方向

- **Entities** → 依存なし（純粋なドメインロジック）
- **UseCases** → Entities のみに依存
- **Infrastructure** → Entities のみに依存
- **Presentation** → UseCases と Entities に依存

**禁止事項:**
- Infrastructure層がUseCases層に依存すること
- Entities層が外部ライブラリに直接依存すること

## コーディングスタイル

### TypeScript

- **型安全性を最優先**: `any` の使用は最小限に。型定義を必ず作成
- **インターフェース優先**: 型エイリアスよりインターフェースを優先
- **厳格な型チェック**: `strict: true` を維持

```typescript
// ✅ Good
interface ExamQuestionNote {
  questionText: string;
  choices: string[];
}

// ❌ Bad
type ExamQuestionNote = {
  questionText: string;
  choices: string[];
}
```

### 命名規則

- **ファイル名**: kebab-case（例: `create-saa-note.ts`）
- **クラス名**: PascalCase（例: `GeminiClient`）
- **関数・変数名**: camelCase（例: `createExamQuestionNote`）
- **定数名**: UPPER_SNAKE_CASE（例: `GEMINI_API_KEY`）
- **型・インターフェース名**: PascalCase（例: `ExamQuestionNote`）

### インポート順序

1. 外部ライブラリ
2. 内部モジュール（`@/` エイリアス）
3. 相対パス（`../`）

```typescript
// ✅ Good
import { z } from "zod";
import type { ExamQuestionNote } from "@/features/aws-note/entities/types";
import { GeminiClient } from "../infrastructure/gemini-client";
```

### エラーハンドリング

- **明示的なエラーメッセージ**: エラー発生時は具体的なメッセージを提供
- **型安全なエラー処理**: `error instanceof Error` を使用

```typescript
// ✅ Good
try {
  // ...
} catch (error) {
  if (error instanceof z.ZodError) {
    throw new Error(`Schema validation failed: ${error.message}`);
  }
  throw new Error(
    `API error: ${error instanceof Error ? error.message : "Unknown error"}`
  );
}
```

## ファイル構造

### エンティティ層 (`entities/`)

- ドメインオブジェクトの型定義のみ
- ビジネスロジックを含まない
- 外部ライブラリへの依存なし

### ユースケース層 (`usecases/`)

- ビジネスロジックのオーケストレーション
- Infrastructure層への依存はコンストラクタインジェクションで注入
- テスト容易性を考慮した設計

```typescript
// ✅ Good
export class CreateSaaNoteUseCase {
  constructor(
    private geminiClient: GeminiClient,
    private notionClient: NotionClient
  ) {}
}
```

### インフラ層 (`infrastructure/`)

- 外部API（Gemini、Notion）との通信
- エラーハンドリングとリトライロジック
- レスポンスの型変換

### プレゼンテーション層 (`app/`)

- Next.js Server Actions を使用
- UIコンポーネントは `'use client'` を明示
- ビジネスロジックはUseCase層に委譲

## コメント規約

### JSDoc コメント

公開APIには必ずJSDocコメントを記述：

```typescript
/**
 * 試験問題から詳細な解説を生成
 * Reasoning Mode による解答根拠の抽出
 * 
 * @param questionInput - 問題文と選択肢
 * @returns 詳細な問題解説
 * @throws {Error} API呼び出し失敗時
 */
async analyzeQuestion(
  questionInput: ExamQuestionInput
): Promise<GeminiQuestionAnalysis> {
  // ...
}
```

## 環境変数

- 環境変数は `.env.local` に保存（Git管理外）
- `.env.example` にテンプレートを提供
- 環境変数の検証は `getEnvVars()` 関数で一元管理

## テスト

- ユニットテスト: `*.test.ts` または `*.spec.ts`
- テストファイルは対象ファイルと同じディレクトリに配置

## Git コミット

- コミットメッセージは明確に
- 機能追加: `feat: 問題解説生成機能を追加`
- バグ修正: `fix: Notion APIの型エラーを修正`
- リファクタリング: `refactor: UseCase層の構造を改善`

## 禁止事項

1. **`any` 型の使用**: 可能な限り避ける
2. **console.log の本番コード**: デバッグ時のみ使用、本番では削除
3. **マジックナンバー**: 定数として定義
4. **深いネスト**: 3階層以上は避ける
5. **長い関数**: 50行を超える場合は分割を検討

## パフォーマンス

- 不要な再レンダリングを避ける（React.memo、useMemo の適切な使用）
- API呼び出しのキャッシュを検討（将来実装予定）
- 大きなデータの処理はサーバーサイドで実行

## セキュリティ

- APIキーは環境変数で管理（コードに直接記述しない）
- ユーザー入力のバリデーション（Zodスキーマを使用）
- XSS対策（Reactの自動エスケープ機能を活用）

