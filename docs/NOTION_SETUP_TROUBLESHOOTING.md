# Notion データベース設定のトラブルシューティング

## エラー: "is not a property that exists"

このエラーは、Notionデータベースに必要なプロパティが存在しない場合に発生します。

### 原因

Notion APIは、データベースに存在しないプロパティ名を指定するとエラーを返します。プロパティ名は**完全に一致**する必要があります（大文字小文字、スペース、記号など）。

### 解決方法

#### 1. プロパティ名の確認

以下のプロパティがNotionデータベースに存在するか確認してください：

| プロパティ名 | 型 | 必須 |
|------------|-----|------|
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

#### 2. プロパティ名が一致しているか確認

**重要**: プロパティ名は完全に一致する必要があります。

- ✅ 正しい: `Explanation`
- ❌ 間違い: `explanation` (小文字)
- ❌ 間違い: `Explanations` (複数形)
- ❌ 間違い: `Explanation ` (末尾にスペース)

#### 3. プロパティの追加方法

1. Notionデータベースを開く
2. 右上の「...」メニューをクリック
3. 「Properties」を選択
4. 「Add a property」をクリック
5. プロパティ名と型を設定
6. 保存

#### 4. オプショナルプロパティについて

`Architecture Diagram` と `Similar Questions Hint` はオプショナルです。

- **これらのプロパティが存在しない場合**: エラーは発生しません（値がある場合のみ送信されます）
- **これらのプロパティが存在する場合**: 値が設定されます

### よくある間違い

#### 間違い 1: プロパティ名のタイポ

```
エラー: "Explanation is not a property that exists"
原因: データベースのプロパティ名が "Explanations" (複数形) になっている
解決: プロパティ名を "Explanation" (単数形) に変更
```

#### 間違い 2: スペースの不一致

```
エラー: "Choice Explanations is not a property that exists"
原因: データベースのプロパティ名が "ChoiceExplanations" (スペースなし) になっている
解決: プロパティ名を "Choice Explanations" (スペースあり) に変更
```

#### 間違い 3: 異なるデータベースを参照

```
エラー: 複数のプロパティが存在しない
原因: .env.local の NOTION_DATABASE_ID が間違ったデータベースを指している
解決: 正しいデータベースIDを設定
```

### データベースIDの確認方法

1. Notionデータベースを開く
2. ブラウザのURLを確認
3. URLの最後の32文字の文字列がデータベースIDです

例:
```
https://www.notion.so/workspace/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
                                    ↑ これがデータベースID
```

### プロパティの型が間違っている場合

プロパティが存在しても、型が間違っているとエラーが発生する場合があります。

- **Number型**: `Correct Answer` は Number 型である必要があります
- **Multi-select型**: `Related Services` と `Well-Architected Category` は Multi-select 型である必要があります
- **Rich Text型**: その他のテキストプロパティは Rich Text 型である必要があります

### デバッグ方法

1. **ログレベルをDEBUGに設定**
   ```bash
   # .env.local
   LOG_LEVEL=DEBUG
   ```

2. **開発サーバーを再起動**
   ```bash
   npm run dev
   ```

3. **ログを確認**
   - ターミナルで詳細なログを確認
   - `databaseId` が正しいか確認
   - エラーメッセージの詳細を確認

### 確認チェックリスト

- [ ] すべての必須プロパティが存在する
- [ ] プロパティ名が完全に一致している（大文字小文字、スペース）
- [ ] プロパティの型が正しい
- [ ] `.env.local` の `NOTION_DATABASE_ID` が正しい
- [ ] Notion Integration がデータベースに接続されている
- [ ] Integration に適切な権限がある

### サポート

問題が解決しない場合：
1. ログを確認してエラーの詳細を把握
2. Notionデータベースのプロパティ一覧をスクリーンショット
3. `.env.local` の設定を確認（機密情報は除く）

