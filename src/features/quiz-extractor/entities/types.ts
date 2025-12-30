/**
 * Quiz Extractor - エンティティ層
 * ドメインオブジェクトの型定義
 */

/**
 * HTMLから抽出されたクイズデータ
 */
export interface ExtractedQuiz {
  /** 問題番号（例: "問題1", "問題2"） */
  number: string;
  /** 問題文 */
  question: string;
  /** 選択肢の配列 */
  options: string[];
  /** 選択肢の数 */
  count: number;
}

/**
 * HTML抽出の入力データ
 */
export interface HtmlExtractionInput {
  /** HTMLコンテンツ（<body>タグ内のコンテンツ） */
  htmlContent: string;
}
