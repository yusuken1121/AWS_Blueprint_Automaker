/**
 * AWS SAA試験問題解説作成ユースケース
 * Gemini 3 Pro による問題分析とNotionへの保存をオーケストレート
 */

import { GeminiClient } from "../infrastructure/gemini-client";
import { NotionClient } from "../infrastructure/notion-client";
import { logger } from "../infrastructure/logger";
import type { ExamQuestionNote, ExamQuestionInput } from "../entities/types";

/**
 * 高精度な問題分析結果を取得
 * Gemini 3 Pro による推論を実行
 */
async function getQuestionAnalysis(
  questionInput: ExamQuestionInput,
  geminiClient: GeminiClient
): Promise<ExamQuestionNote> {
  const analysis = await geminiClient.analyzeQuestion(questionInput);

  // GeminiQuestionAnalysis を ExamQuestionNote に変換
  return {
    questionText: questionInput.questionText,
    choices: questionInput.choices,
    correctAnswer: analysis.correctAnswer,
    correctChoiceText: analysis.correctChoiceText,
    explanation: analysis.explanation,
    relatedServices: analysis.relatedServices,
    wellArchitectedCategories: analysis.wellArchitectedCategories,
    choiceExplanations: analysis.choiceExplanations,
    architectureDiagram: analysis.architectureDiagram,
    learningPoints: analysis.learningPoints,
    similarQuestionsHint: analysis.similarQuestionsHint,
  };
}

// キャッシュ機能は将来的に実装予定
// Next.js 15のcache関数を使用する場合は、Server Component内で使用する必要があります

/**
 * AWS SAA試験問題解説作成のメインオーケストレーション
 */
export class CreateSaaNoteUseCase {
  constructor(
    private geminiClient: GeminiClient,
    private notionClient: NotionClient
  ) {}

  /**
   * 問題文と選択肢から完全な解説ノートを作成してNotionに保存
   */
  async execute(questionInput: ExamQuestionInput): Promise<{
    note: ExamQuestionNote;
    notionPageId: string;
  }> {
    logger.info("CreateSaaNoteUseCase.execute started", {
      questionTextLength: questionInput.questionText.length,
      choicesCount: questionInput.choices.length,
    });

    try {
      // 1. Gemini 3 Pro による高精度な問題分析
      // 注意: キャッシュは将来的に実装（現時点では毎回API呼び出し）
      logger.debug("Step 1: Analyzing question with Gemini");
      const note = await getQuestionAnalysis(questionInput, this.geminiClient);

      logger.info("Question analysis completed", {
        correctAnswer: note.correctAnswer,
        relatedServicesCount: note.relatedServices.length,
      });

      // 2. Notionへの保存（既存の場合は更新）
      logger.debug("Step 2: Saving to Notion");
      const notionPageId = await this.notionClient.upsertQuestionNote(note);

      logger.info("CreateSaaNoteUseCase.execute completed successfully", {
        notionPageId,
        correctAnswer: note.correctAnswer,
      });

      return {
        note,
        notionPageId,
      };
    } catch (error) {
      logger.error("CreateSaaNoteUseCase.execute failed", error as Error, {
        questionTextLength: questionInput.questionText.length,
        choicesCount: questionInput.choices.length,
      });
      throw error;
    }
  }
}
