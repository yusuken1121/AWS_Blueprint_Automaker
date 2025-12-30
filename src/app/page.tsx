/**
 * メインページ - AWS SAA試験問題解説生成UI
 */

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createExamQuestionNote } from "./actions";
import type { ExamQuestionNote } from "@/features/aws-note/entities/types";
import mermaid from "mermaid";
import {
  validateAndFixMermaid,
  mermaidToTextDiagram,
} from "@/features/aws-note/infrastructure/mermaid-validator";
import Link from "next/link";

export default function HomePage() {
  const [questionText, setQuestionText] = useState("");
  const [choices, setChoices] = useState(["", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    note?: ExamQuestionNote;
    notionPageId?: string;
    error?: string;
  } | null>(null);
  const mermaidRef = useRef<HTMLDivElement>(null);
  const architectureDiagramRef = useRef<HTMLDivElement>(null);

  // Mermaidの初期化
  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: "default",
      securityLevel: "loose",
    });
  }, []);

  // ExplanationからMermaidコードを抽出
  const extractMermaidFromExplanation = useCallback((explanation: string) => {
    const mermaidMatch = explanation.match(/```mermaid\s*([\s\S]*?)\s*```/);
    if (mermaidMatch && mermaidMatch.index !== undefined) {
      return {
        mermaidCode: mermaidMatch[1].trim(),
        textBefore: explanation.substring(0, mermaidMatch.index).trim(),
        textAfter: explanation
          .substring(mermaidMatch.index + mermaidMatch[0].length)
          .trim(),
      };
    }
    return null;
  }, []);

  // Mermaid図をレンダリング（検証と自動修正付き）
  useEffect(() => {
    if (result?.note?.explanation && mermaidRef.current) {
      const mermaidData = extractMermaidFromExplanation(
        result.note.explanation
      );
      if (mermaidData && mermaidData.mermaidCode) {
        // 既存の内容をクリア
        mermaidRef.current.innerHTML = "";

        // Mermaidコードを検証して修正
        const validation = validateAndFixMermaid(mermaidData.mermaidCode);
        const codeToRender = validation.fixedCode || mermaidData.mermaidCode;

        // 警告がある場合は表示
        if (validation.warnings && validation.warnings.length > 0) {
          console.warn("Mermaidコードの修正:", validation.warnings);
        }

        // ユニークなIDを生成
        const diagramId = `mermaid-diagram-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        mermaid
          .render(diagramId, codeToRender)
          .then(({ svg }) => {
            if (mermaidRef.current) {
              mermaidRef.current.innerHTML = svg;
              // 警告がある場合は表示
              if (validation.warnings && validation.warnings.length > 0) {
                const warningDiv = document.createElement("div");
                warningDiv.className =
                  "text-yellow-600 text-xs mt-2 p-2 bg-yellow-50 rounded";
                warningDiv.textContent = `⚠️ 図解を自動修正しました: ${validation.warnings.join(", ")}`;
                mermaidRef.current.appendChild(warningDiv);
              }
            }
          })
          .catch((error) => {
            console.error("Mermaid rendering error:", error);
            if (mermaidRef.current) {
              // エラー時はテキスト図をフォールバックとして表示
              const textDiagram = mermaidToTextDiagram(codeToRender);
              mermaidRef.current.innerHTML = `
                <div class="space-y-2">
                  <div class="text-destructive p-2 bg-destructive/10 rounded text-sm">
                    ⚠️ Mermaid図のレンダリングエラー: ${error instanceof Error ? error.message : "Unknown error"}
                  </div>
                  <div class="text-muted-foreground text-xs p-2 bg-muted rounded font-mono whitespace-pre-wrap">
                    ${textDiagram}
                  </div>
                </div>
              `;
            }
          });
      } else if (mermaidRef.current) {
        // Mermaid図がない場合はクリア
        mermaidRef.current.innerHTML = "";
      }
    }
  }, [result?.note?.explanation, extractMermaidFromExplanation]);

  // Architecture Diagramをレンダリング
  useEffect(() => {
    if (result?.note?.architectureDiagram && architectureDiagramRef.current) {
      const diagramCode = result.note.architectureDiagram.trim();

      // 既存の内容をクリア
      architectureDiagramRef.current.innerHTML = "";

      // Mermaidコードを検証して修正
      const validation = validateAndFixMermaid(diagramCode);
      const codeToRender = validation.fixedCode || diagramCode;

      // 警告がある場合は表示
      if (validation.warnings && validation.warnings.length > 0) {
        console.warn("Architecture Diagramの修正:", validation.warnings);
      }

      // ユニークなIDを生成
      const diagramId = `architecture-diagram-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      mermaid
        .render(diagramId, codeToRender)
        .then(({ svg }) => {
          if (architectureDiagramRef.current) {
            architectureDiagramRef.current.innerHTML = svg;
            // 警告がある場合は表示
            if (validation.warnings && validation.warnings.length > 0) {
              const warningDiv = document.createElement("div");
              warningDiv.className =
                "text-yellow-600 text-xs mt-2 p-2 bg-yellow-50 rounded";
              warningDiv.textContent = `⚠️ 図解を自動修正しました: ${validation.warnings.join(", ")}`;
              architectureDiagramRef.current.appendChild(warningDiv);
            }
          }
        })
        .catch((error) => {
          console.error("Architecture Diagram rendering error:", error);
          if (architectureDiagramRef.current) {
            // エラー時はテキスト図をフォールバックとして表示
            const textDiagram = mermaidToTextDiagram(codeToRender);
            architectureDiagramRef.current.innerHTML = `
              <div class="space-y-2">
                <div class="text-destructive p-2 bg-destructive/10 rounded text-sm">
                  ⚠️ Mermaid図のレンダリングエラー: ${error instanceof Error ? error.message : "Unknown error"}
                </div>
                <div class="text-muted-foreground text-xs p-2 bg-muted rounded font-mono whitespace-pre-wrap">
                  ${textDiagram}
                </div>
              </div>
            `;
          }
        });
    } else if (architectureDiagramRef.current) {
      // Architecture Diagramがない場合はクリア
      architectureDiagramRef.current.innerHTML = "";
    }
  }, [result?.note?.architectureDiagram]);

  const handleChoiceChange = (index: number, value: string) => {
    const newChoices = [...choices];
    newChoices[index] = value;
    setChoices(newChoices);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionText.trim()) return;
    if (choices.filter((c) => c.trim()).length < 2) {
      alert("選択肢は最低2つ入力してください");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await createExamQuestionNote({
        questionText: questionText.trim(),
        choices: choices.filter((c) => c.trim()),
      });
      setResult(response);
    } catch (error) {
      setResult({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-12 text-center">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            AWS SAA 学習効率最大化システム
          </h1>
          <p className="text-muted-foreground mb-4">
            Gemini 3 Pro
            による深い推論とNotion連携で、試験問題の理解を最短距離で習得
          </p>
          <Link
            href="/practice"
            className="inline-block px-6 py-3 bg-accent text-accent-foreground rounded-lg hover:bg-accent/80 font-medium transition"
          >
            📚 問題練習ページへ
          </Link>
        </header>

        <form
          onSubmit={handleSubmit}
          className="mb-8 bg-card rounded-lg border border-border p-6"
        >
          <div className="space-y-4">
            <div>
              <label
                htmlFor="question"
                className="block text-sm font-medium text-foreground mb-2"
              >
                問題文
              </label>
              <textarea
                id="question"
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                placeholder="AWS SAA試験の問題文を入力してください"
                rows={4}
                className="w-full px-4 py-3 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent resize-y text-foreground placeholder:text-muted-foreground"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                選択肢（最低2つ、最大4つ）
              </label>
              <div className="space-y-2">
                {choices.map((choice, index) => (
                  <input
                    key={index}
                    type="text"
                    value={choice}
                    onChange={(e) => handleChoiceChange(index, e.target.value)}
                    placeholder={`選択肢 ${index + 1}`}
                    className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent text-foreground placeholder:text-muted-foreground"
                    disabled={loading}
                  />
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={
                loading ||
                !questionText.trim() ||
                choices.filter((c) => c.trim()).length < 2
              }
              className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition"
            >
              {loading ? "解説生成中..." : "解説を生成"}
            </button>
          </div>
        </form>

        {result && (
          <div className="bg-card rounded-lg border border-border p-6">
            {result.error ? (
              <div className="text-destructive">
                <h2 className="font-bold text-lg mb-2">エラー</h2>
                <p>{result.error}</p>
              </div>
            ) : result.note ? (
              <div className="space-y-6">
                <div className="border-b border-border pb-4">
                  <h2 className="text-xl font-bold text-foreground mb-3">
                    問題文
                  </h2>
                  <p className="text-muted-foreground mb-4">
                    {result.note.questionText}
                  </p>

                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    選択肢
                  </h3>
                  <div className="space-y-2 mb-4">
                    {result.note.choices.map((choice, index) => (
                      <div
                        key={index}
                        className={`p-3 rounded-lg border-2 ${
                          index + 1 === result.note!.correctAnswer
                            ? "border-green-500/50 bg-green-500/10"
                            : "border-border bg-muted"
                        }`}
                      >
                        <span className="font-medium text-foreground">
                          {index + 1}. {choice}
                        </span>
                        {index + 1 === result.note!.correctAnswer && (
                          <span className="ml-2 text-green-400 font-bold">
                            ✓ 正解
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2 flex-wrap mb-2">
                    {result.note.wellArchitectedCategories.map((category) => (
                      <span
                        key={category}
                        className="px-3 py-1 bg-accent text-accent-foreground rounded-full text-sm"
                      >
                        {category}
                      </span>
                    ))}
                  </div>
                  {result.note.relatedServices.length > 0 && (
                    <div className="flex gap-2 flex-wrap mb-2">
                      {result.note.relatedServices.map((service) => (
                        <span
                          key={service}
                          className="px-3 py-1 bg-secondary text-secondary-foreground rounded-full text-sm"
                        >
                          {service}
                        </span>
                      ))}
                    </div>
                  )}
                  {result.notionPageId && (
                    <p className="text-sm text-green-400 mt-2">
                      ✓ Notionに保存されました
                    </p>
                  )}
                </div>

                <section>
                  <h3 className="font-bold text-lg mb-2 text-foreground">
                    解説
                  </h3>
                  <div className="bg-muted p-4 rounded-lg space-y-4">
                    {(() => {
                      const mermaidData = extractMermaidFromExplanation(
                        result.note.explanation
                      );
                      if (mermaidData && mermaidData.mermaidCode) {
                        return (
                          <>
                            {mermaidData.textBefore && (
                              <p className="whitespace-pre-wrap text-foreground">
                                {mermaidData.textBefore}
                              </p>
                            )}
                            <div className="my-4">
                              <h4 className="text-sm font-semibold text-muted-foreground mb-2">
                                図解
                              </h4>
                              <div
                                ref={mermaidRef}
                                className="flex justify-center items-center bg-card p-4 rounded border border-border overflow-x-auto"
                              />
                            </div>
                            {mermaidData.textAfter && (
                              <p className="whitespace-pre-wrap text-foreground">
                                {mermaidData.textAfter}
                              </p>
                            )}
                          </>
                        );
                      }
                      // Mermaid図がない場合（フォールバック）
                      return (
                        <>
                          <p className="whitespace-pre-wrap text-foreground">
                            {result.note.explanation}
                          </p>
                          <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded text-sm text-yellow-400">
                            ⚠️
                            図解が含まれていません。次回の生成時に図解が含まれるように改善します。
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </section>

                <section>
                  <h3 className="font-bold text-lg mb-2 text-foreground">
                    各選択肢の解説
                  </h3>
                  <div className="space-y-3">
                    {result.note.choiceExplanations.map((ce) => (
                      <div
                        key={ce.choiceNumber}
                        className={`p-4 rounded-lg border-2 ${
                          ce.isCorrect
                            ? "border-green-500/50 bg-green-500/10"
                            : "border-destructive/50 bg-destructive/10"
                        }`}
                      >
                        <div className="font-semibold mb-2 text-foreground">
                          選択肢{ce.choiceNumber}: {ce.choiceText}
                          <span
                            className={`ml-2 ${
                              ce.isCorrect
                                ? "text-green-400"
                                : "text-destructive"
                            }`}
                          >
                            {ce.isCorrect ? "✓ 正解" : "✗ 不正解"}
                          </span>
                        </div>
                        <p className="text-muted-foreground">
                          {ce.explanation}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>

                <section>
                  <h3 className="font-bold text-lg mb-2 text-foreground">
                    学習ポイント
                  </h3>
                  <ul className="list-disc list-inside space-y-1 bg-muted p-4 rounded-lg">
                    {result.note.learningPoints.map((point, index) => (
                      <li key={index} className="text-foreground">
                        {point}
                      </li>
                    ))}
                  </ul>
                </section>

                {result.note.architectureDiagram && (
                  <section>
                    <h3 className="font-bold text-lg mb-2 text-foreground">
                      Architecture Diagram
                    </h3>
                    <div className="bg-muted p-4 rounded-lg overflow-x-auto">
                      <div
                        ref={architectureDiagramRef}
                        className="flex justify-center items-center bg-card p-4 rounded border border-border"
                      />
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      ※ Mermaid.js形式で自動レンダリング
                    </p>
                  </section>
                )}

                {result.note.similarQuestionsHint && (
                  <section>
                    <h3 className="font-bold text-lg mb-2 text-foreground">
                      類似問題へのヒント
                    </h3>
                    <div className="bg-muted p-4 rounded-lg">
                      <p className="text-foreground">
                        {result.note.similarQuestionsHint}
                      </p>
                    </div>
                  </section>
                )}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
