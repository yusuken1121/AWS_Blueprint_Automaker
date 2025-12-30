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

  /**
   * Notionからすべての問題を取得
   */
  async getAllQuestions(): Promise<ExamQuestionNote[]> {
    logger.info("Fetching all questions from Notion", {
      databaseId: this.databaseId,
    });

    try {
      const questions: ExamQuestionNote[] = [];
      let hasMore = true;
      let startCursor: string | undefined = undefined;

      // ページネーションで全データを取得
      while (hasMore) {
        const response = await this.notion.databases.query({
          database_id: this.databaseId,
          start_cursor: startCursor,
          page_size: 100, // Notion APIの最大値
        });

        for (const page of response.results) {
          try {
            const question = await this.parseNotionPage(page);
            if (question) {
              questions.push(question);
            }
          } catch (error) {
            logger.warn("Failed to parse Notion page", {
              pageId: page.id,
              error: error instanceof Error ? error.message : "Unknown error",
            });
          }
        }

        hasMore = response.has_more;
        startCursor = response.next_cursor || undefined;
      }

      logger.info("Successfully fetched all questions", {
        count: questions.length,
      });

      return questions;
    } catch (error) {
      logger.error("Failed to fetch questions from Notion", error as Error, {
        databaseId: this.databaseId,
      });
      throw new Error(
        `Failed to fetch questions from Notion: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * NotionページをExamQuestionNoteに変換
   */
  private async parseNotionPage(page: any): Promise<ExamQuestionNote | null> {
    try {
      const props = page.properties;

      // 必須プロパティの取得
      const questionText =
        props["Question Text"]?.title?.[0]?.text?.content || "";
      if (!questionText) {
        logger.warn("Page missing question text", { pageId: page.id });
        return null;
      }

      // Choicesの取得（rich_textから）
      const choicesText = props.Choices?.rich_text?.[0]?.text?.content || "";
      const choices = choicesText
        .split("\n")
        .map((line: string) => line.replace(/^\d+\.\s*/, "").trim())
        .filter((choice: string) => choice.length > 0);

      if (choices.length === 0) {
        logger.warn("Page missing choices", { pageId: page.id });
        return null;
      }

      // Correct Answerの取得
      const correctAnswer = props["Correct Answer"]?.number;
      if (
        !correctAnswer ||
        correctAnswer < 1 ||
        correctAnswer > choices.length
      ) {
        logger.warn("Page has invalid correct answer", {
          pageId: page.id,
          correctAnswer,
        });
        return null;
      }

      // Correct Choice Textの取得
      const correctChoiceText =
        props["Correct Choice Text"]?.rich_text?.[0]?.text?.content || "";

      // Explanationの取得
      const explanation =
        props.Explanation?.rich_text?.[0]?.text?.content || "";

      // Related Servicesの取得
      const relatedServices =
        props["Related Services"]?.multi_select?.map(
          (item: { name: string }) => item.name
        ) || [];

      // Well-Architected Categoryの取得
      const wellArchitectedCategoriesRaw =
        props["Well-Architected Category"]?.multi_select?.map(
          (item: { name: string }) => item.name
        ) || [];

      // Well-Architectedカテゴリを正しい形式に変換
      const wellArchitectedCategories = wellArchitectedCategoriesRaw.map(
        (cat: string) => {
          // ハイフン形式に変換（例: "Cost Optimization" -> "cost-optimization"）
          return cat
            .toLowerCase()
            .replace(
              /\s+/g,
              "-"
            ) as ExamQuestionNote["wellArchitectedCategories"][0];
        }
      );

      // Choice Explanationsの取得とパース
      const choiceExplanationsText =
        props["Choice Explanations"]?.rich_text?.[0]?.text?.content || "";
      const choiceExplanations = this.parseChoiceExplanations(
        choiceExplanationsText,
        choices,
        correctAnswer
      );

      // Learning Pointsの取得
      const learningPointsText =
        props["Learning Points"]?.rich_text?.[0]?.text?.content || "";
      const learningPoints = learningPointsText
        .split("\n• ")
        .map((point: string) => point.trim())
        .filter((point: string) => point.length > 0);

      // Architecture Diagramの取得（オプション）
      const architectureDiagram =
        props["Architecture Diagram"]?.rich_text?.[0]?.text?.content ||
        undefined;

      // Similar Questions Hintの取得（オプション）
      const similarQuestionsHint =
        props["Similar Questions Hint"]?.rich_text?.[0]?.text?.content ||
        undefined;

      return {
        questionText,
        choices,
        correctAnswer,
        correctChoiceText,
        explanation,
        relatedServices,
        wellArchitectedCategories,
        choiceExplanations,
        learningPoints,
        architectureDiagram,
        similarQuestionsHint,
      };
    } catch (error) {
      logger.error("Error parsing Notion page", error as Error, {
        pageId: page.id,
      });
      return null;
    }
  }

  /**
   * Choice Explanationsテキストをパース
   */
  private parseChoiceExplanations(
    text: string,
    choices: string[],
    correctAnswer: number
  ): ExamQuestionNote["choiceExplanations"] {
    const explanations: ExamQuestionNote["choiceExplanations"] = [];
    const sections = text.split(/【選択肢\d+】/).filter((s) => s.trim());

    for (const section of sections) {
      const lines = section.trim().split("\n");
      if (lines.length < 2) continue;

      const firstLine = lines[0];
      const isCorrect = firstLine.includes("✓ 正解");
      const choiceText = lines[1]?.trim() || "";
      const explanation = lines.slice(2).join("\n").trim();

      // 選択肢番号を特定
      const choiceNumber = choices.findIndex(
        (c) => c === choiceText || c.includes(choiceText)
      );
      if (choiceNumber === -1) continue;

      explanations.push({
        choiceNumber: choiceNumber + 1,
        choiceText,
        isCorrect,
        explanation,
      });
    }

    // パースに失敗した場合は、choicesから生成
    if (explanations.length === 0) {
      return choices.map((choice, index) => ({
        choiceNumber: index + 1,
        choiceText: choice,
        isCorrect: index + 1 === correctAnswer,
        explanation: "",
      }));
    }

    // すべての選択肢が含まれているか確認し、不足している場合は追加
    const existingNumbers = new Set(explanations.map((e) => e.choiceNumber));
    for (let i = 0; i < choices.length; i++) {
      const choiceNumber = i + 1;
      if (!existingNumbers.has(choiceNumber)) {
        explanations.push({
          choiceNumber,
          choiceText: choices[i],
          isCorrect: false,
          explanation: "",
        });
      }
    }

    // 選択肢番号でソート
    explanations.sort((a, b) => a.choiceNumber - b.choiceNumber);

    return explanations;
  }
}
