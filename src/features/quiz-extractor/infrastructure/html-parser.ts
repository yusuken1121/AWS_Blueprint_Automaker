/**
 * HTML Parser - インフラストラクチャ層
 * HTMLコンテンツからクイズデータを抽出
 */

import * as cheerio from "cheerio";
import { logger } from "@/features/aws-note/infrastructure/logger";
import type { ExtractedQuiz } from "../entities/types";

/**
 * HTMLパーサークラス
 * cheerioを使用してHTMLからクイズデータを抽出
 */
export class HtmlParser {
  /**
   * HTMLコンテンツからクイズデータを抽出
   * @param htmlContent - HTMLコンテンツ（<body>タグ内のコンテンツ）
   * @returns 抽出されたクイズデータ
   * @throws 抽出に失敗した場合にエラーをスロー
   */
  extractQuiz(htmlContent: string): ExtractedQuiz {
    logger.debug("Starting HTML extraction", {
      htmlContentLength: htmlContent.length,
    });

    try {
      const $ = cheerio.load(htmlContent);

      // 1. 問題番号を抽出
      // .mc-quiz-question--container--dV-tK 内の span から取得
      let questionNumber = $(".mc-quiz-question--container--dV-tK span")
        .first()
        .text()
        .trim();
      // 末尾のコロンを削除（例: "問題2:" -> "問題2"）
      questionNumber = questionNumber.replace(/:$/, "");

      if (!questionNumber) {
        throw new Error("問題番号が見つかりませんでした");
      }

      logger.debug("Question number extracted", { questionNumber });

      // 2. 問題文を抽出
      // #question-prompt から取得
      const questionText = $("#question-prompt").text().trim();

      if (!questionText) {
        throw new Error("問題文が見つかりませんでした");
      }

      logger.debug("Question text extracted", {
        questionTextLength: questionText.length,
      });

      // 3. 選択肢を抽出
      // .mc-quiz-answer--answer-body--V-o8d から取得
      const options: string[] = [];
      $(".mc-quiz-answer--answer-body--V-o8d").each((index, element) => {
        // 余分な空白や改行を削除してクリーンなテキストを取得
        const text = $(element).text().replace(/\s\s+/g, " ").trim();
        if (text) {
          options.push(text);
        }
      });

      if (options.length === 0) {
        throw new Error("選択肢が見つかりませんでした");
      }

      logger.debug("Options extracted", { optionsCount: options.length });

      const result: ExtractedQuiz = {
        number: questionNumber,
        question: questionText,
        options,
        count: options.length,
      };

      logger.info("Quiz extraction completed successfully", {
        questionNumber,
        optionsCount: options.length,
      });

      return result;
    } catch (error) {
      logger.error("Failed to extract quiz from HTML", error as Error, {
        htmlContentLength: htmlContent.length,
      });
      throw error;
    }
  }
}
