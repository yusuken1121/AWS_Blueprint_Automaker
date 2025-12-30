/**
 * Extract Quiz Use Case - ユースケース層
 * クイズ抽出のビジネスロジックをオーケストレーション
 */

import { HtmlParser } from "../infrastructure/html-parser";
import { logger } from "@/features/aws-note/infrastructure/logger";
import type { ExtractedQuiz, HtmlExtractionInput } from "../entities/types";

/**
 * クイズ抽出ユースケース
 * HTMLコンテンツからクイズデータを抽出する
 */
export class ExtractQuizUseCase {
  private htmlParser: HtmlParser;

  /**
   * コンストラクタ
   * @param htmlParser - HTMLパーサーのインスタンス（依存注入）
   */
  constructor(htmlParser: HtmlParser) {
    this.htmlParser = htmlParser;
  }

  /**
   * HTMLコンテンツからクイズデータを抽出
   * @param input - HTML抽出の入力データ
   * @returns 抽出されたクイズデータ
   * @throws 抽出に失敗した場合にエラーをスロー
   */
  async execute(input: HtmlExtractionInput): Promise<ExtractedQuiz> {
    logger.info("ExtractQuizUseCase.execute called", {
      htmlContentLength: input.htmlContent.length,
    });

    try {
      // 入力バリデーション
      if (!input.htmlContent || input.htmlContent.trim().length === 0) {
        throw new Error("HTMLコンテンツが空です");
      }

      // HTMLパーサーを使用してクイズデータを抽出
      const result = this.htmlParser.extractQuiz(input.htmlContent);

      logger.info("Quiz extraction completed successfully", {
        questionNumber: result.number,
        optionsCount: result.count,
      });

      return result;
    } catch (error) {
      logger.error("Failed to extract quiz", error as Error, {
        htmlContentLength: input.htmlContent.length,
      });
      throw error;
    }
  }
}
