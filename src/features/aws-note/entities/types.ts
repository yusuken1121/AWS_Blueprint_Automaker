/**
 * AWS SAA 学習システム - エンティティ層
 * ドメインオブジェクトの型定義
 */

/**
 * Well-Architected Framework の6つの柱
 */
export type WellArchitectedPillar =
  | "cost-optimization"
  | "performance-efficiency"
  | "reliability"
  | "security"
  | "operational-excellence"
  | "sustainability";

/**
 * 試験問題の入力データ
 */
export interface ExamQuestionInput {
  /** 問題文 */
  questionText: string;
  /** 選択肢（2つ以上8つ以下） */
  choices: string[];
}

/**
 * 問題解説の完全な定義
 */
export interface ExamQuestionNote {
  /** 問題文 */
  questionText: string;

  /** 選択肢 */
  choices: string[];

  /** 正解の選択肢番号（1-indexed） */
  correctAnswer: number;

  /** 正解の選択肢テキスト */
  correctChoiceText: string;

  /** 詳細な解説（なぜこの答えが正しいのか） */
  explanation: string;

  /** 関連するAWSサービス名のリスト */
  relatedServices: string[];

  /** Well-Architected Framework の該当カテゴリ（複数選択可） */
  wellArchitectedCategories: WellArchitectedPillar[];

  /** 各選択肢の解説（なぜ間違っているのか、または正しいのか） */
  choiceExplanations: {
    choiceNumber: number;
    choiceText: string;
    isCorrect: boolean;
    explanation: string;
  }[];

  /** Mermaid.js によるアーキテクチャ図のソースコード（該当する場合） */
  architectureDiagram?: string;

  /** 学習ポイント（試験で重要なポイント） */
  learningPoints: string[];

  /** 類似問題へのヒント */
  similarQuestionsHint?: string;
}

/**
 * Gemini 3 Pro からのレスポンス構造
 */
export interface GeminiQuestionAnalysis {
  correctAnswer: number;
  correctChoiceText: string;
  explanation: string;
  relatedServices: string[];
  wellArchitectedCategories: WellArchitectedPillar[];
  choiceExplanations: {
    choiceNumber: number;
    choiceText: string;
    isCorrect: boolean;
    explanation: string;
  }[];
  architectureDiagram?: string;
  learningPoints: string[];
  similarQuestionsHint?: string;
}

/**
 * Notion データベースのプロパティ構造
 * 注意: Notion APIの実際の構造に合わせて調整が必要な場合があります
 */
export interface NotionPageProperties {
  "Question Text": { title: Array<{ text: { content: string } }> };
  Choices: { rich_text: Array<{ text: { content: string } }> };
  "Correct Answer": { number: number };
  "Correct Choice Text": { rich_text: Array<{ text: { content: string } }> };
  Explanation: { rich_text: Array<{ text: { content: string } }> };
  "Related Services": { multi_select: Array<{ name: string }> };
  "Well-Architected Category": { multi_select: Array<{ name: string }> };
  "Choice Explanations": { rich_text: Array<{ text: { content: string } }> };
  "Architecture Diagram": { rich_text: Array<{ text: { content: string } }> };
  "Learning Points": { rich_text: Array<{ text: { content: string } }> };
  "Similar Questions Hint": { rich_text: Array<{ text: { content: string } }> };
}
