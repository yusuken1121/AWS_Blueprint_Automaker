/**
 * Notion API クライアント
 * ヘッドレスDBとしてのNotion連携
 */

import { Client } from "@notionhq/client";
import type { ExamQuestionNote } from "../entities/types";

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
    // 既存ページを検索（問題文の最初の50文字をキーとして使用）
    const searchKey = note.questionText.substring(0, 50);
    const existingPageId = await this.findExistingPage(searchKey);

    if (existingPageId) {
      // 既存ページを更新
      await this.notion.pages.update({
        page_id: existingPageId,
        properties: this.buildProperties(note),
      });
      return existingPageId;
    } else {
      // 新規ページを作成
      const response = await this.notion.pages.create({
        parent: { database_id: this.databaseId },
        properties: this.buildProperties(note),
      });
      return response.id;
    }
  }

  /**
   * 既存ページを検索
   */
  private async findExistingPage(
    questionTextPrefix: string
  ): Promise<string | null> {
    try {
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
        return response.results[0].id;
      }
      return null;
    } catch (error) {
      console.error("Error finding existing page:", error);
      return null;
    }
  }

  /**
   * Notionプロパティ構造を構築
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

    return {
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
      "Architecture Diagram": {
        rich_text: [
          {
            text: {
              content: note.architectureDiagram || "",
            },
          },
        ],
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
      "Similar Questions Hint": {
        rich_text: [
          {
            text: {
              content: note.similarQuestionsHint || "",
            },
          },
        ],
      },
    };
  }
}
