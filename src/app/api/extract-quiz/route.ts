/**
 * Quiz Extraction API Route
 * HTMLコンテンツからクイズデータを抽出するAPIエンドポイント
 */

import { NextResponse } from "next/server";
import { ExtractQuizUseCase } from "@/features/quiz-extractor/usecases/extract-quiz";
import { HtmlParser } from "@/features/quiz-extractor/infrastructure/html-parser";
import { logger } from "@/features/aws-note/infrastructure/logger";

/**
 * POST /api/extract-quiz
 * HTMLコンテンツからクイズデータを抽出
 */
export async function POST(request: Request) {
  logger.info("POST /api/extract-quiz called");

  try {
    const body = await request.json();
    const { htmlContent } = body;

    // 入力バリデーション
    if (!htmlContent || typeof htmlContent !== "string") {
      logger.warn("Invalid request: htmlContent is missing or invalid");
      return NextResponse.json(
        { success: false, error: "HTMLコンテンツが提供されていません" },
        { status: 400 }
      );
    }

    // ユースケースの実行
    const htmlParser = new HtmlParser();
    const useCase = new ExtractQuizUseCase(htmlParser);
    const result = await useCase.execute({ htmlContent });

    logger.info("Quiz extraction successful", {
      questionNumber: result.number,
      optionsCount: result.count,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error("Quiz extraction failed", error as Error);

    const errorMessage =
      error instanceof Error ? error.message : "HTMLの解析に失敗しました";

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
