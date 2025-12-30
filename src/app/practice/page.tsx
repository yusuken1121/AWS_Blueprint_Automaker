/**
 * 練習ページ - Notionから取得した問題を解く
 */

"use client";

import { useState, useEffect, useRef } from "react";
import { getAllQuestions } from "../actions";
import type { ExamQuestionNote } from "@/features/aws-note/entities/types";
import mermaid from "mermaid";
import {
  validateAndFixMermaid,
  mermaidToTextDiagram,
} from "@/features/aws-note/infrastructure/mermaid-validator";
import Link from "next/link";

export default function PracticePage() {
  const [allQuestions, setAllQuestions] = useState<ExamQuestionNote[]>([]);
  const [filteredQuestions, setFilteredQuestions] = useState<
    ExamQuestionNote[]
  >([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
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

  // 問題データの取得
  useEffect(() => {
    const fetchQuestions = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await getAllQuestions();
        if (result.success && result.questions) {
          setAllQuestions(result.questions);
          setFilteredQuestions(result.questions);
          if (result.questions.length > 0) {
            setCurrentQuestionIndex(0);
          }
        } else {
          setError(result.error || "問題の取得に失敗しました");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();
  }, []);

  // フィルター適用
  useEffect(() => {
    if (allQuestions.length === 0) return;

    let filtered = [...allQuestions];

    // 関連サービスでフィルター
    if (selectedServices.length > 0) {
      filtered = filtered.filter((q) =>
        selectedServices.some((service) => q.relatedServices.includes(service))
      );
    }

    // Well-Architected Frameworkでフィルター
    if (selectedCategories.length > 0) {
      filtered = filtered.filter((q) =>
        selectedCategories.some((category) =>
          q.wellArchitectedCategories.includes(category)
        )
      );
    }

    setFilteredQuestions(filtered);
  }, [selectedServices, selectedCategories, allQuestions]);

  // フィルター変更時に現在の問題インデックスを調整
  useEffect(() => {
    if (filteredQuestions.length === 0) {
      setCurrentQuestionIndex(0);
      setSelectedAnswer(null);
      setShowExplanation(false);
      return;
    }

    // 現在表示中の問題がフィルター結果に含まれているか確認
    const currentQuestion = filteredQuestions[currentQuestionIndex];
    if (!currentQuestion && filteredQuestions.length > 0) {
      // 現在の問題がフィルター結果にない場合、最初の問題にリセット
      setCurrentQuestionIndex(0);
      setSelectedAnswer(null);
      setShowExplanation(false);
    } else if (currentQuestionIndex >= filteredQuestions.length) {
      // インデックスが範囲外の場合、最後の問題に調整
      setCurrentQuestionIndex(filteredQuestions.length - 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
    }
  }, [filteredQuestions, currentQuestionIndex]);

  // ユニークなサービスとカテゴリを抽出
  const allServices = Array.from(
    new Set(allQuestions.flatMap((q) => q.relatedServices))
  ).sort();

  const allCategories = Array.from(
    new Set(allQuestions.flatMap((q) => q.wellArchitectedCategories))
  ).sort();

  const currentQuestion =
    filteredQuestions.length > 0 &&
    currentQuestionIndex < filteredQuestions.length
      ? filteredQuestions[currentQuestionIndex]
      : null;
  const questions = filteredQuestions;

  // ExplanationからMermaidコードを抽出
  const extractMermaidFromExplanation = (explanation: string) => {
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
  };

  // Mermaid図をレンダリング（Explanation内）
  useEffect(() => {
    if (currentQuestion?.explanation && mermaidRef.current && showExplanation) {
      const mermaidData = extractMermaidFromExplanation(
        currentQuestion.explanation
      );
      if (mermaidData && mermaidData.mermaidCode) {
        mermaidRef.current.innerHTML = "";

        const validation = validateAndFixMermaid(mermaidData.mermaidCode);
        const codeToRender = validation.fixedCode || mermaidData.mermaidCode;
        const diagramId = `mermaid-diagram-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        mermaid
          .render(diagramId, codeToRender)
          .then(({ svg }) => {
            if (mermaidRef.current) {
              mermaidRef.current.innerHTML = svg;
            }
          })
          .catch((error) => {
            console.error("Mermaid rendering error:", error);
            if (mermaidRef.current) {
              const textDiagram = mermaidToTextDiagram(codeToRender);
              mermaidRef.current.innerHTML = `
                <div class="space-y-2">
                  <div class="text-red-600 p-2 bg-red-50 rounded text-sm">
                    ⚠️ Mermaid図のレンダリングエラー
                  </div>
                  <div class="text-slate-600 text-xs p-2 bg-slate-50 rounded font-mono whitespace-pre-wrap">
                    ${textDiagram}
                  </div>
                </div>
              `;
            }
          });
      } else if (mermaidRef.current) {
        mermaidRef.current.innerHTML = "";
      }
    }
  }, [currentQuestion?.explanation, showExplanation]);

  // Architecture Diagramをレンダリング
  useEffect(() => {
    if (
      currentQuestion?.architectureDiagram &&
      architectureDiagramRef.current &&
      showExplanation
    ) {
      const diagramCode = currentQuestion.architectureDiagram.trim();
      architectureDiagramRef.current.innerHTML = "";

      const validation = validateAndFixMermaid(diagramCode);
      const codeToRender = validation.fixedCode || diagramCode;
      const diagramId = `architecture-diagram-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      mermaid
        .render(diagramId, codeToRender)
        .then(({ svg }) => {
          if (architectureDiagramRef.current) {
            architectureDiagramRef.current.innerHTML = svg;
          }
        })
        .catch((error) => {
          console.error("Architecture Diagram rendering error:", error);
          if (architectureDiagramRef.current) {
            const textDiagram = mermaidToTextDiagram(codeToRender);
            architectureDiagramRef.current.innerHTML = `
              <div class="space-y-2">
                <div class="text-red-600 p-2 bg-red-50 rounded text-sm">
                  ⚠️ Mermaid図のレンダリングエラー
                </div>
                <div class="text-slate-600 text-xs p-2 bg-slate-50 rounded font-mono whitespace-pre-wrap">
                  ${textDiagram}
                </div>
              </div>
            `;
          }
        });
    } else if (architectureDiagramRef.current) {
      architectureDiagramRef.current.innerHTML = "";
    }
  }, [currentQuestion?.architectureDiagram, showExplanation]);

  const handleAnswerSelect = (answer: number) => {
    if (!showExplanation) {
      setSelectedAnswer(answer);
    }
  };

  const handleShowExplanation = () => {
    setShowExplanation(true);
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
    }
  };

  const handleRandomQuestion = () => {
    if (filteredQuestions.length > 0) {
      const randomIndex = Math.floor(Math.random() * filteredQuestions.length);
      setCurrentQuestionIndex(randomIndex);
      setSelectedAnswer(null);
      setShowExplanation(false);
    }
  };

  const handleServiceToggle = (service: string) => {
    setSelectedServices((prev) =>
      prev.includes(service)
        ? prev.filter((s) => s !== service)
        : [...prev, service]
    );
  };

  const handleCategoryToggle = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const handleClearFilters = () => {
    setSelectedServices([]);
    setSelectedCategories([]);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="text-slate-600">問題を読み込み中...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-red-600 mb-4">
              <h2 className="font-bold text-lg mb-2">エラー</h2>
              <p>{error}</p>
            </div>
            <Link href="/" className="text-blue-600 hover:underline">
              ← ホームに戻る
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (allQuestions.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="text-slate-600 mb-4">
              問題が見つかりませんでした。
            </div>
            <Link href="/" className="text-blue-600 hover:underline">
              ← ホームに戻る
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (filteredQuestions.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-slate-600 mb-4">
              <h2 className="font-bold text-lg mb-2">フィルター結果</h2>
              <p>選択した条件に一致する問題が見つかりませんでした。</p>
            </div>
            <button
              onClick={handleClearFilters}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              フィルターをクリア
            </button>
            <div className="mt-4">
              <Link href="/" className="text-blue-600 hover:underline">
                ← ホームに戻る
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="text-slate-600 mb-4">問題を読み込み中...</div>
          </div>
        </div>
      </div>
    );
  }

  const isCorrect = selectedAnswer === currentQuestion.correctAnswer;
  const mermaidData = currentQuestion.explanation
    ? extractMermaidFromExplanation(currentQuestion.explanation)
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2">
                AWS SAA 問題練習
              </h1>
              <p className="text-slate-600">
                問題 {currentQuestionIndex + 1} / {filteredQuestions.length}
                {filteredQuestions.length !== allQuestions.length && (
                  <span className="text-slate-400 ml-2">
                    (全 {allQuestions.length} 問中)
                  </span>
                )}
              </p>
            </div>
            <Link
              href="/"
              className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
            >
              ← ホーム
            </Link>
          </div>

          {/* フィルターセクション */}
          <div className="bg-white rounded-lg shadow-md p-4 mb-6">
            <div className="flex justify-between items-center mb-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
              >
                <span>🔍 フィルター</span>
                {(selectedServices.length > 0 ||
                  selectedCategories.length > 0) && (
                  <span className="px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full">
                    {selectedServices.length + selectedCategories.length}
                  </span>
                )}
              </button>
              {(selectedServices.length > 0 ||
                selectedCategories.length > 0) && (
                <button
                  onClick={handleClearFilters}
                  className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded transition"
                >
                  クリア
                </button>
              )}
            </div>

            {showFilters && (
              <div className="space-y-4 pt-4 border-t">
                {/* 関連サービスフィルター */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-2">
                    関連サービス
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {allServices.map((service) => (
                      <button
                        key={service}
                        onClick={() => handleServiceToggle(service)}
                        className={`px-3 py-1 rounded-full text-sm transition ${
                          selectedServices.includes(service)
                            ? "bg-purple-600 text-white"
                            : "bg-purple-100 text-purple-800 hover:bg-purple-200"
                        }`}
                      >
                        {service}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Well-Architected Frameworkフィルター */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-2">
                    Well-Architected Framework
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {allCategories.map((category) => (
                      <button
                        key={category}
                        onClick={() => handleCategoryToggle(category)}
                        className={`px-3 py-1 rounded-full text-sm transition ${
                          selectedCategories.includes(category)
                            ? "bg-blue-600 text-white"
                            : "bg-blue-100 text-blue-800 hover:bg-blue-200"
                        }`}
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </header>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              {currentQuestion.questionText}
            </h2>

            <div className="space-y-3">
              {currentQuestion.choices.map((choice, index) => {
                const choiceNumber = index + 1;
                const isSelected = selectedAnswer === choiceNumber;
                const isCorrectChoice =
                  choiceNumber === currentQuestion.correctAnswer;
                let borderColor = "border-slate-200";
                let bgColor = "bg-slate-50";

                if (showExplanation) {
                  if (isCorrectChoice) {
                    borderColor = "border-green-500";
                    bgColor = "bg-green-50";
                  } else if (isSelected && !isCorrectChoice) {
                    borderColor = "border-red-500";
                    bgColor = "bg-red-50";
                  }
                } else if (isSelected) {
                  borderColor = "border-blue-500";
                  bgColor = "bg-blue-50";
                }

                return (
                  <button
                    key={index}
                    onClick={() => handleAnswerSelect(choiceNumber)}
                    disabled={showExplanation}
                    className={`w-full text-left p-4 rounded-lg border-2 ${borderColor} ${bgColor} transition ${
                      showExplanation
                        ? "cursor-default"
                        : "hover:border-blue-400 cursor-pointer"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">
                        {choiceNumber}. {choice}
                      </span>
                      {showExplanation && isCorrectChoice && (
                        <span className="text-green-600 font-bold">✓ 正解</span>
                      )}
                      {showExplanation && isSelected && !isCorrectChoice && (
                        <span className="text-red-600 font-bold">✗ 不正解</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {!showExplanation && selectedAnswer !== null && (
            <div className="mt-6 flex gap-4">
              <button
                onClick={handleShowExplanation}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                解説を表示
              </button>
            </div>
          )}

          {showExplanation && (
            <div className="mt-6 space-y-6 border-t pt-6">
              <div>
                <h3 className="font-bold text-lg mb-3 text-slate-800">解説</h3>
                <div className="bg-slate-50 p-4 rounded-lg space-y-4">
                  {mermaidData && mermaidData.mermaidCode ? (
                    <>
                      {mermaidData.textBefore && (
                        <p className="whitespace-pre-wrap text-slate-700">
                          {mermaidData.textBefore}
                        </p>
                      )}
                      <div className="my-4">
                        <h4 className="text-sm font-semibold text-slate-600 mb-2">
                          図解
                        </h4>
                        <div
                          ref={mermaidRef}
                          className="flex justify-center items-center bg-white p-4 rounded border overflow-x-auto"
                        />
                      </div>
                      {mermaidData.textAfter && (
                        <p className="whitespace-pre-wrap text-slate-700">
                          {mermaidData.textAfter}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="whitespace-pre-wrap text-slate-700">
                      {currentQuestion.explanation}
                    </p>
                  )}
                </div>
              </div>

              {currentQuestion.choiceExplanations.length > 0 && (
                <div>
                  <h3 className="font-bold text-lg mb-3 text-slate-800">
                    各選択肢の解説
                  </h3>
                  <div className="space-y-3">
                    {currentQuestion.choiceExplanations.map((ce) => (
                      <div
                        key={ce.choiceNumber}
                        className={`p-4 rounded-lg border-2 ${
                          ce.isCorrect
                            ? "border-green-500 bg-green-50"
                            : "border-red-200 bg-red-50"
                        }`}
                      >
                        <div className="font-semibold mb-2">
                          選択肢{ce.choiceNumber}: {ce.choiceText}
                          <span
                            className={`ml-2 ${
                              ce.isCorrect ? "text-green-600" : "text-red-600"
                            }`}
                          >
                            {ce.isCorrect ? "✓ 正解" : "✗ 不正解"}
                          </span>
                        </div>
                        <p className="text-slate-700">{ce.explanation}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {currentQuestion.learningPoints.length > 0 && (
                <div>
                  <h3 className="font-bold text-lg mb-3 text-slate-800">
                    学習ポイント
                  </h3>
                  <ul className="list-disc list-inside space-y-1 bg-slate-50 p-4 rounded-lg">
                    {currentQuestion.learningPoints.map((point, index) => (
                      <li key={index} className="text-slate-700">
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {currentQuestion.architectureDiagram && (
                <div>
                  <h3 className="font-bold text-lg mb-2 text-slate-800">
                    Architecture Diagram
                  </h3>
                  <div className="bg-slate-50 p-4 rounded-lg overflow-x-auto">
                    <div
                      ref={architectureDiagramRef}
                      className="flex justify-center items-center bg-white p-4 rounded border"
                    />
                  </div>
                </div>
              )}

              {currentQuestion.relatedServices.length > 0 && (
                <div>
                  <h3 className="font-bold text-lg mb-2 text-slate-800">
                    関連サービス
                  </h3>
                  <div className="flex gap-2 flex-wrap">
                    {currentQuestion.relatedServices.map((service) => (
                      <span
                        key={service}
                        className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm"
                      >
                        {service}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {currentQuestion.wellArchitectedCategories.length > 0 && (
                <div>
                  <h3 className="font-bold text-lg mb-2 text-slate-800">
                    Well-Architected Framework
                  </h3>
                  <div className="flex gap-2 flex-wrap">
                    {currentQuestion.wellArchitectedCategories.map(
                      (category) => (
                        <span
                          key={category}
                          className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                        >
                          {category}
                        </span>
                      )
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex gap-4 justify-between">
            <button
              onClick={handlePreviousQuestion}
              disabled={currentQuestionIndex === 0}
              className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ← 前の問題
            </button>
            <button
              onClick={handleRandomQuestion}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              🎲 ランダム
            </button>
            <button
              onClick={handleNextQuestion}
              disabled={currentQuestionIndex === questions.length - 1}
              className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              次の問題 →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
