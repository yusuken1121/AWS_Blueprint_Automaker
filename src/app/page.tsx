/**
 * メインページ - AWS SAA試験問題解説生成UI
 */

"use client";

import { useState } from "react";
import { createExamQuestionNote } from "./actions";
import type { ExamQuestionNote } from "@/features/aws-note/entities/types";

export default function HomePage() {
  const [questionText, setQuestionText] = useState("");
  const [choices, setChoices] = useState(["", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    note?: ExamQuestionNote;
    notionPageId?: string;
    error?: string;
  } | null>(null);

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-12 text-center">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            AWS SAA 学習効率最大化システム
          </h1>
          <p className="text-slate-600">
            Gemini 3 Pro による深い推論とNotion連携で、試験問題の理解を最短距離で習得
          </p>
        </header>

        <form onSubmit={handleSubmit} className="mb-8 bg-white rounded-lg shadow-lg p-6">
          <div className="space-y-4">
            <div>
              <label
                htmlFor="question"
                className="block text-sm font-medium text-slate-700 mb-2"
              >
                問題文
              </label>
              <textarea
                id="question"
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                placeholder="AWS SAA試験の問題文を入力してください"
                rows={4}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
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
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {loading ? "解説生成中..." : "解説を生成"}
            </button>
          </div>
        </form>

        {result && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            {result.error ? (
              <div className="text-red-600">
                <h2 className="font-bold text-lg mb-2">エラー</h2>
                <p>{result.error}</p>
              </div>
            ) : result.note ? (
              <div className="space-y-6">
                <div className="border-b pb-4">
                  <h2 className="text-xl font-bold text-slate-900 mb-3">
                    問題文
                  </h2>
                  <p className="text-slate-700 mb-4">{result.note.questionText}</p>

                  <h3 className="text-lg font-semibold text-slate-800 mb-2">
                    選択肢
                  </h3>
                  <div className="space-y-2 mb-4">
                    {result.note.choices.map((choice, index) => (
                      <div
                        key={index}
                        className={`p-3 rounded-lg border-2 ${
                          index + 1 === result.note!.correctAnswer
                            ? "border-green-500 bg-green-50"
                            : "border-slate-200 bg-slate-50"
                        }`}
                      >
                        <span className="font-medium">
                          {index + 1}. {choice}
                        </span>
                        {index + 1 === result.note!.correctAnswer && (
                          <span className="ml-2 text-green-600 font-bold">
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
                        className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
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
                          className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm"
                        >
                          {service}
                        </span>
                      ))}
                    </div>
                  )}
                  {result.notionPageId && (
                    <p className="text-sm text-green-600 mt-2">
                      ✓ Notionに保存されました
                    </p>
                  )}
                </div>

                <section>
                  <h3 className="font-bold text-lg mb-2 text-slate-800">
                    解説
                  </h3>
                  <div className="bg-slate-50 p-4 rounded-lg">
                    <p className="whitespace-pre-wrap text-slate-700">
                      {result.note.explanation}
                    </p>
                  </div>
                </section>

                <section>
                  <h3 className="font-bold text-lg mb-2 text-slate-800">
                    各選択肢の解説
                  </h3>
                  <div className="space-y-3">
                    {result.note.choiceExplanations.map((ce) => (
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
                </section>

                <section>
                  <h3 className="font-bold text-lg mb-2 text-slate-800">
                    学習ポイント
                  </h3>
                  <ul className="list-disc list-inside space-y-1 bg-slate-50 p-4 rounded-lg">
                    {result.note.learningPoints.map((point, index) => (
                      <li key={index} className="text-slate-700">
                        {point}
                      </li>
                    ))}
                  </ul>
                </section>

                {result.note.architectureDiagram && (
                  <section>
                    <h3 className="font-bold text-lg mb-2 text-slate-800">
                      Architecture Diagram
                    </h3>
                    <div className="bg-slate-50 p-4 rounded-lg overflow-x-auto">
                      <pre className="text-xs text-slate-600 font-mono">
                        {result.note.architectureDiagram}
                      </pre>
                    </div>
                    <p className="text-sm text-slate-500 mt-2">
                      ※ Mermaid.js形式。Notionでレンダリング可能
                    </p>
                  </section>
                )}

                {result.note.similarQuestionsHint && (
                  <section>
                    <h3 className="font-bold text-lg mb-2 text-slate-800">
                      類似問題へのヒント
                    </h3>
                    <div className="bg-slate-50 p-4 rounded-lg">
                      <p className="text-slate-700">
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

