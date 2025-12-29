/**
 * Notion API クライアント
 * ヘッドレスDBとしてのNotion連携
 */

import { Client } from "@notionhq/client";
import type { ExamQuestionNote } from "../entities/types";
import { logger } from "./logger";

export class NotionClient {
  private notion: Client;
  private databaseId: string;

  constructor(apiKey: string, databaseId: string) {
    if (!apiKey || !databaseId) {
      throw new Error("NOTION_API_KEY and NOTION_DATABASE_ID are required");
    }
    this.notion = new Client({ auth: apiKey });
    this.databaseId = databaseId;
  }

  /**
   * 試験問題ノートをNotionに保存（既存の場合は更新）
   */
  async upsertQuestionNote(note: ExamQuestionNote): Promise<string> {
    logger.info("Starting Notion upsert operation", {
      questionTextLength: note.questionText.length,
      choicesCount: note.choices.length,
    });

    try {
      // 既存ページを検索（問題文の最初の50文字をキーとして使用）
      const searchKey = note.questionText.substring(0, 50);
      logger.debug("Searching for existing page", { searchKey });
      const existingPageId = await this.findExistingPage(searchKey);

      if (existingPageId) {
        logger.info("Updating existing Notion page", {
          pageId: existingPageId,
        });
        // 既存ページを更新
        await this.notion.pages.update({
          page_id: existingPageId,
          properties: this.buildProperties(note),
        });
        logger.info("Notion page updated successfully", {
          pageId: existingPageId,
        });
        return existingPageId;
      } else {
        logger.info("Creating new Notion page");
        // 新規ページを作成
        const response = await this.notion.pages.create({
          parent: { database_id: this.databaseId },
          properties: this.buildProperties(note),
        });
        logger.info("Notion page created successfully", {
          pageId: response.id,
        });
        return response.id;
      }
    } catch (error) {
      // Notion APIのエラーメッセージから存在しないプロパティを特定
      let errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      // プロパティが存在しないエラーの場合、より詳細なメッセージを提供
      if (errorMessage.includes("is not a property that exists")) {
        const missingProperties = errorMessage.match(
          /([^,]+) is not a property that exists/g
        );
        if (missingProperties) {
          errorMessage =
            `以下のプロパティがNotionデータベースに存在しません: ${missingProperties.join(", ")}\n\n` +
            `解決方法:\n` +
            `1. Notionデータベースに以下のプロパティを追加してください:\n` +
            `   - Explanation (Rich Text)\n` +
            `   - Choice Explanations (Rich Text)\n` +
            `   - Architecture Diagram (Rich Text, オプション)\n` +
            `2. または、.env.local で NOTION_DATABASE_ID が正しいデータベースを指しているか確認してください。\n` +
            `3. README.md の「Notionデータベースのセットアップ」セクションを参照してください。`;
        }
      }

      const notionError = new Error(`Notion API error: ${errorMessage}`);
      logger.error("Failed to upsert Notion page", error as Error, {
        questionTextLength: note.questionText.length,
        databaseId: this.databaseId,
        errorMessage,
      });
      throw notionError;
    }
  }

  /**
   * 既存ページを検索
   */
  private async findExistingPage(
    questionTextPrefix: string
  ): Promise<string | null> {
    try {
      logger.debug("Querying Notion database", {
        databaseId: this.databaseId,
        searchPrefix: questionTextPrefix,
      });
      const response = await this.notion.databases.query({
        database_id: this.databaseId,
        filter: {
          property: "Question Text",
          title: {
            contains: questionTextPrefix,
          },
        },
      });

      if (response.results.length > 0) {
        logger.debug("Found existing page", {
          pageId: response.results[0].id,
          resultsCount: response.results.length,
        });
        return response.results[0].id;
      }
      logger.debug("No existing page found");
      return null;
    } catch (error) {
      logger.error("Error finding existing page", error as Error, {
        questionTextPrefix,
        databaseId: this.databaseId,
      });
      return null;
    }
  }

  /**
   * Notionプロパティ構造を構築
   * 注意: プロパティ名はNotionデータベースのプロパティ名と完全に一致する必要があります
   */
  private buildProperties(note: ExamQuestionNote): Record<string, any> {
    const choicesText = note.choices
      .map((choice, index) => `${index + 1}. ${choice}`)
      .join("\n");

    const choiceExplanationsText = note.choiceExplanations
      .map(
        (ce) =>
          `【選択肢${ce.choiceNumber}】${ce.isCorrect ? "✓ 正解" : "✗ 不正解"}\n${ce.choiceText}\n${ce.explanation}`
      )
      .join("\n\n");

    // 必須プロパティ
    const properties: Record<string, any> = {
      "Question Text": {
        title: [{ text: { content: note.questionText } }],
      },
      Choices: {
        rich_text: [{ text: { content: choicesText } }],
      },
      "Correct Answer": {
        number: note.correctAnswer,
      },
      "Correct Choice Text": {
        rich_text: [{ text: { content: note.correctChoiceText } }],
      },
      Explanation: {
        rich_text: [{ text: { content: note.explanation } }],
      },
      "Related Services": {
        multi_select: note.relatedServices.map((service) => ({
          name: service,
        })),
      },
      "Well-Architected Category": {
        multi_select: note.wellArchitectedCategories.map((category) => ({
          name: category,
        })),
      },
      "Choice Explanations": {
        rich_text: [{ text: { content: choiceExplanationsText } }],
      },
      "Learning Points": {
        rich_text: [
          {
            text: {
              content: note.learningPoints.join("\n• "),
            },
          },
        ],
      },
    };

    // オプショナルプロパティ（値がある場合のみ追加）
    // 注意: これらのプロパティがNotionデータベースに存在しない場合は、
    // データベースに追加するか、このコードをコメントアウトしてください
    if (note.architectureDiagram) {
      properties["Architecture Diagram"] = {
        rich_text: [
          {
            text: {
              content: note.architectureDiagram,
            },
          },
        ],
      };
    }

    if (note.similarQuestionsHint) {
      properties["Similar Questions Hint"] = {
        rich_text: [
          {
            text: {
              content: note.similarQuestionsHint,
            },
          },
        ],
      };
    }

    return properties;
  }
}
