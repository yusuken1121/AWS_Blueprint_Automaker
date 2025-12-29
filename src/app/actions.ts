/**
 * Server Actions - プレゼンテーション層のエントリポイント
 * Next.js 15 App Router の Server Actions を使用
 */

"use server";

import { CreateSaaNoteUseCase } from "@/features/aws-note/usecases/create-saa-note";
import { GeminiClient } from "@/features/aws-note/infrastructure/gemini-client";
import { NotionClient } from "@/features/aws-note/infrastructure/notion-client";
import { logger } from "@/features/aws-note/infrastructure/logger";
import type {
  ExamQuestionNote,
  ExamQuestionInput,
} from "@/features/aws-note/entities/types";

/**
 * 環境変数の検証
 */
function getEnvVars() {
  logger.debug("Validating environment variables");
  const geminiApiKey = process.env.GEMINI_API_KEY;
  const notionApiKey = process.env.NOTION_API_KEY;
  const notionDatabaseId = process.env.NOTION_DATABASE_ID;

  if (!geminiApiKey) {
    const error = new Error("GEMINI_API_KEY is not set");
    logger.error("Environment variable validation failed", error);
    throw error;
  }
  if (!notionApiKey) {
    const error = new Error("NOTION_API_KEY is not set");
    logger.error("Environment variable validation failed", error);
    throw error;
  }
  if (!notionDatabaseId) {
    const error = new Error("NOTION_DATABASE_ID is not set");
    logger.error("Environment variable validation failed", error);
    throw error;
  }

  logger.debug("Environment variables validated successfully");
  return { geminiApiKey, notionApiKey, notionDatabaseId };
}

/**
 * 試験問題から解説ノートを作成
 */
export async function createExamQuestionNote(
  questionInput: ExamQuestionInput
): Promise<{
  success: boolean;
  note?: ExamQuestionNote;
  notionPageId?: string;
  error?: string;
}> {
  logger.info("createExamQuestionNote called", {
    questionTextLength: questionInput.questionText.length,
    choicesCount: questionInput.choices.length,
  });

  try {
    const { geminiApiKey, notionApiKey, notionDatabaseId } = getEnvVars();

    logger.debug("Initializing infrastructure clients");
    // インフラ層のインスタンス化
    const geminiClient = new GeminiClient(geminiApiKey);
    const notionClient = new NotionClient(notionApiKey, notionDatabaseId);

    // ユースケースの実行
    logger.info("Executing CreateSaaNoteUseCase");
    const useCase = new CreateSaaNoteUseCase(geminiClient, notionClient);
    const result = await useCase.execute(questionInput);

    logger.info("Exam question note created successfully", {
      notionPageId: result.notionPageId,
      correctAnswer: result.note.correctAnswer,
    });

    return {
      success: true,
      note: result.note,
      notionPageId: result.notionPageId,
    };
  } catch (error) {
    logger.error("Failed to create exam question note", error as Error, {
      questionTextLength: questionInput.questionText.length,
      choicesCount: questionInput.choices.length,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
