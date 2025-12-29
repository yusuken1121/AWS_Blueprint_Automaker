/**
 * Gemini 3 Pro API クライアント
 * 高度な推論能力を活用したAWS SAA試験問題の解説生成
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import type {
  GeminiQuestionAnalysis,
  ExamQuestionInput,
} from "../entities/types";
import { z } from "zod";
import { logger } from "./logger";

/**
 * Gemini 3 Pro のレスポンススキーマ検証
 */
const GeminiResponseSchema = z.object({
  correctAnswer: z.number().int().min(1).max(4),
  correctChoiceText: z.string(),
  explanation: z.string(),
  relatedServices: z.array(z.string()),
  wellArchitectedCategories: z.array(
    z.enum([
      "cost-optimization",
      "performance-efficiency",
      "reliability",
      "security",
      "operational-excellence",
      "sustainability",
    ])
  ),
  choiceExplanations: z.array(
    z.object({
      choiceNumber: z.number().int().min(1).max(4),
      choiceText: z.string(),
      isCorrect: z.boolean(),
      explanation: z.string(),
    })
  ),
  architectureDiagram: z.string().nullish(), // null と undefined の両方を許可
  learningPoints: z.array(z.string()),
  similarQuestionsHint: z.string().nullish(), // null と undefined の両方を許可
});

export class GeminiClient {
  private genAI: GoogleGenerativeAI;
  private model: ReturnType<GoogleGenerativeAI["getGenerativeModel"]>;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is required");
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
    // Gemini 3 Pro モデルを使用
    // 注意: Gemini 3 Pro がリリースされ次第、モデル名を更新してください
    // 現在利用可能なモデル: 'gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-2.0-flash-exp'
    // Gemini 3 Pro のモデル名が確定したら、ここを更新してください
    this.model = this.genAI.getGenerativeModel({
      model: "gemini-2.0-flash", // Gemini 3 Pro リリース後は 'gemini-3-pro' などに変更
      generationConfig: {
        temperature: 0.7,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 8192,
      },
    });
  }

  /**
   * 試験問題から詳細な解説を生成
   * Reasoning Mode による解答根拠の抽出
   */
  async analyzeQuestion(
    questionInput: ExamQuestionInput
  ): Promise<GeminiQuestionAnalysis> {
    logger.info("Starting question analysis", {
      questionLength: questionInput.questionText.length,
      choicesCount: questionInput.choices.length,
    });

    const prompt = this.buildQuestionAnalysisPrompt(questionInput);

    try {
      logger.debug("Sending request to Gemini API");
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      logger.debug("Received response from Gemini API", {
        responseLength: text.length,
      });

      // JSON形式のレスポンスを抽出
      const jsonMatch =
        text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        const error = new Error("Failed to extract JSON from Gemini response");
        logger.error("Failed to extract JSON from response", error, {
          responsePreview: text.substring(0, 200),
        });
        throw error;
      }

      const jsonText = jsonMatch[1] || jsonMatch[0];
      let parsed: unknown;
      try {
        parsed = JSON.parse(jsonText);
        // null を undefined に変換（Zodスキーマと型定義の整合性のため）
        if (parsed && typeof parsed === "object") {
          const parsedObj = parsed as Record<string, unknown>;
          if (parsedObj.architectureDiagram === null) {
            parsedObj.architectureDiagram = undefined;
          }
          if (parsedObj.similarQuestionsHint === null) {
            parsedObj.similarQuestionsHint = undefined;
          }
        }
      } catch (parseError) {
        const error = new Error("Failed to parse JSON response");
        logger.error("JSON parsing failed", parseError as Error, {
          jsonText: jsonText.substring(0, 200),
        });
        throw error;
      }

      // スキーマ検証
      try {
        const validated = GeminiResponseSchema.parse(parsed);

        // null を undefined に変換（型定義との整合性のため）
        const result: GeminiQuestionAnalysis = {
          ...validated,
          architectureDiagram:
            validated.architectureDiagram === null
              ? undefined
              : validated.architectureDiagram,
          similarQuestionsHint:
            validated.similarQuestionsHint === null
              ? undefined
              : validated.similarQuestionsHint,
        };

        logger.info("Question analysis completed successfully", {
          correctAnswer: result.correctAnswer,
          relatedServicesCount: result.relatedServices.length,
        });
        return result;
      } catch (validationError) {
        if (validationError instanceof z.ZodError) {
          const error = new Error(
            `Schema validation failed: ${validationError.message}`
          );
          logger.error("Schema validation failed", error, {
            zodErrors: validationError.errors,
            parsedData: parsed,
          });
          throw error;
        }
        throw validationError;
      }
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("Schema validation")
      ) {
        throw error;
      }
      const apiError = new Error(
        `Gemini API error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
      logger.error("Gemini API request failed", error as Error, {
        questionLength: questionInput.questionText.length,
      });
      throw apiError;
    }
  }

  /**
   * 高精度な問題解説プロンプトの構築
   */
  private buildQuestionAnalysisPrompt(
    questionInput: ExamQuestionInput
  ): string {
    const choicesText = questionInput.choices
      .map((choice, index) => `${index + 1}. ${choice}`)
      .join("\n");

    return `あなたはAWS Certified Solutions Architect - Associate (SAA) 試験の専門家です。
以下の試験問題について、深い推論を行って解答と詳細な解説を提供してください。

【問題文】
${questionInput.questionText}

【選択肢】
${choicesText}

以下のJSON形式で、厳密に構造化された回答を提供してください。各フィールドは必須です（オプションを除く）。

{
  "correctAnswer": 1, // 正解の選択肢番号（1-4）
  "correctChoiceText": "正解の選択肢のテキスト",
  "explanation": "なぜこの答えが正しいのか、詳細な解説。Well-Architected Frameworkの観点も含めて説明。",
  "relatedServices": ["関連するAWSサービス1", "関連するAWSサービス2"], // この問題で問われているAWSサービス
  "wellArchitectedCategories": ["cost-optimization", "performance-efficiency", ...], // 該当するWell-Architected Frameworkの柱
  "choiceExplanations": [
    {
      "choiceNumber": 1,
      "choiceText": "選択肢1のテキスト",
      "isCorrect": true,
      "explanation": "なぜこの選択肢が正しい（または間違っている）のかの詳細な説明"
    },
    // 各選択肢について同様に記述
  ],
  "architectureDiagram": "Mermaid.js 形式のアーキテクチャ図コード（該当する場合）。graph TD または graph LR で開始。", // オプション
  "learningPoints": [
    "この問題で学ぶべき重要なポイント1",
    "この問題で学ぶべき重要なポイント2"
  ],
  "similarQuestionsHint": "類似問題を解く際のヒント（オプション）"
}

重要事項:
1. correctAnswer は1-4の整数で、選択肢の番号を指定
2. explanation は「なぜこの答えが正しいのか」をWell-Architected Frameworkの観点も含めて詳しく説明
3. choiceExplanations は全ての選択肢について、正解・不正解の理由を明確に説明
4. architectureDiagram は該当する場合のみ提供し、有効なMermaid.js構文であること
5. learningPoints は試験合格のために重要なポイントを3-5個挙げる
6. 推論過程を明確に示し、単なる暗記ではなく「なぜ」を理解できるようにする

JSONのみを返してください。`;
  }
}
