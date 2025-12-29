/**
 * Gemini 3 Pro API クライアント
 * 修正版: トークン制限回避のためのプロンプト最適化
 */

import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
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
  architectureDiagram: z.string().nullish(),
  learningPoints: z.array(z.string()),
  similarQuestionsHint: z.string().nullish(),
});

export class GeminiClient {
  private genAI: GoogleGenerativeAI;
  private model: ReturnType<GoogleGenerativeAI["getGenerativeModel"]>;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is required");
    }
    this.genAI = new GoogleGenerativeAI(apiKey);

    this.model = this.genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig: {
        temperature: 0.5, // 少し創造性を下げて安定させる
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
      },
    });
  }

  /**
   * 試験問題から詳細な解説を生成
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
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // JSONブロックの抽出（安全策）
      let jsonText = text;
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1];
      } else {
        // バッククォートのみの場合の対応
        jsonText = text.replace(/^```\w*\s*/, "").replace(/\s*```$/, "");
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(jsonText);

        // null プロパティのクリーンアップ
        if (parsed && typeof parsed === "object") {
          const obj = parsed as Record<string, unknown>;
          if (obj.architectureDiagram === null)
            obj.architectureDiagram = undefined;
          if (obj.similarQuestionsHint === null)
            obj.similarQuestionsHint = undefined;

          // wellArchitectedCategories の値を正規化
          // 人間が読みやすい形式から小文字ハイフン形式に変換
          if (
            obj.wellArchitectedCategories &&
            Array.isArray(obj.wellArchitectedCategories)
          ) {
            obj.wellArchitectedCategories = obj.wellArchitectedCategories.map(
              (cat: unknown) => {
                if (typeof cat !== "string") return cat;

                // マッピング: 人間が読みやすい形式 → 小文字ハイフン形式
                const mapping: Record<string, string> = {
                  "Cost Optimization": "cost-optimization",
                  "cost optimization": "cost-optimization",
                  "Performance Efficiency": "performance-efficiency",
                  "performance efficiency": "performance-efficiency",
                  Reliability: "reliability",
                  reliability: "reliability",
                  Security: "security",
                  security: "security",
                  "Operational Excellence": "operational-excellence",
                  "operational excellence": "operational-excellence",
                  Sustainability: "sustainability",
                  sustainability: "sustainability",
                };

                return mapping[cat] || cat.toLowerCase().replace(/\s+/g, "-");
              }
            );
          }
        }
      } catch (parseError) {
        logger.error("JSON parsing failed", parseError as Error, {
          preview: jsonText.substring(0, 200),
          endOfText: jsonText.substring(Math.max(0, jsonText.length - 200)),
        });
        throw new Error(
          `Failed to parse JSON response: ${(parseError as Error).message}`
        );
      }

      // スキーマ検証
      let validated;
      try {
        validated = GeminiResponseSchema.parse(parsed);
      } catch (validationError) {
        if (validationError instanceof z.ZodError) {
          logger.error("Schema validation failed", validationError, {
            zodErrors: validationError.errors,
            parsedData: parsed,
          });
          throw new Error(
            `Schema validation failed: ${validationError.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ")}`
          );
        }
        throw validationError;
      }

      return {
        ...validated,
        architectureDiagram: validated.architectureDiagram ?? undefined,
        similarQuestionsHint: validated.similarQuestionsHint ?? undefined,
      };
    } catch (error) {
      logger.error("Gemini API request failed", error as Error);
      throw error;
    }
  }

  /**
   * プロンプト構築（長さを抑制する指示を追加）
   */
  private buildQuestionAnalysisPrompt(
    questionInput: ExamQuestionInput
  ): string {
    const choicesText = questionInput.choices
      .map((choice, index) => `${index + 1}. ${choice}`)
      .join("\n");

    return `あなたはAWS Certified Solutions Architect (SAA) 試験のエキスパートです。
以下の問題に対する解説を作成してください。

【問題文】
${questionInput.questionText}

【選択肢】
${choicesText}

以下のJSONスキーマに従って出力してください。
**重要: 出力が途切れるのを防ぐため、解説は要点を絞って簡潔に記述してください。**

{
  "correctAnswer": integer,
  "correctChoiceText": string,
  "explanation": string, // **重要: 500文字以内で、正解の理由と重要な概念のみを簡潔に説明してください。必ず最後にMermaid.js形式の図解（\`\`\`mermaid ... \`\`\`）を含めてください。**
  "relatedServices": string[],
  "wellArchitectedCategories": string[], // **重要: 以下の値のみ使用（小文字、ハイフン区切り）: "cost-optimization", "performance-efficiency", "reliability", "security", "operational-excellence", "sustainability"。人間が読みやすい形式（"Cost Optimization"など）は使用しないでください。**
  "choiceExplanations": [
    {
      "choiceNumber": integer,
      "choiceText": string,
      "isCorrect": boolean,
      "explanation": string // **重要: 各選択肢につき1-2文で簡潔に記述してください。**
    }
  ],
  "architectureDiagram": string, // Mermaid.jsコード (graph TD/LR) - オプション
  "learningPoints": string[], // 3つまで
  "similarQuestionsHint": string // オプション
}

**重要事項:**
1. wellArchitectedCategories は必ず小文字のハイフン区切り形式で指定してください（例: "cost-optimization" ではなく "Cost Optimization" は不可）
2. explanation には必ずMermaid.js形式の図解を含めてください（\`\`\`mermaid ... \`\`\`）
3. JSON文字列内の特殊文字（改行、バッククォートなど）は適切にエスケープしてください`;
  }
}
