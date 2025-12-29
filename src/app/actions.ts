/**
 * Server Actions - プレゼンテーション層のエントリポイント
 * Next.js 15 App Router の Server Actions を使用
 */

'use server';

import { CreateSaaNoteUseCase } from "@/features/aws-note/usecases/create-saa-note";
import { GeminiClient } from "@/features/aws-note/infrastructure/gemini-client";
import { NotionClient } from "@/features/aws-note/infrastructure/notion-client";
import type {
  ExamQuestionNote,
  ExamQuestionInput,
} from "@/features/aws-note/entities/types";

/**
 * 環境変数の検証
 */
function getEnvVars() {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  const notionApiKey = process.env.NOTION_API_KEY;
  const notionDatabaseId = process.env.NOTION_DATABASE_ID;

  if (!geminiApiKey) {
    throw new Error('GEMINI_API_KEY is not set');
  }
  if (!notionApiKey) {
    throw new Error('NOTION_API_KEY is not set');
  }
  if (!notionDatabaseId) {
    throw new Error('NOTION_DATABASE_ID is not set');
  }

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
  try {
    const { geminiApiKey, notionApiKey, notionDatabaseId } = getEnvVars();

    // インフラ層のインスタンス化
    const geminiClient = new GeminiClient(geminiApiKey);
    const notionClient = new NotionClient(notionApiKey, notionDatabaseId);

    // ユースケースの実行
    const useCase = new CreateSaaNoteUseCase(geminiClient, notionClient);
    const result = await useCase.execute(questionInput);

    return {
      success: true,
      note: result.note,
      notionPageId: result.notionPageId,
    };
  } catch (error) {
    console.error("Error creating exam question note:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

