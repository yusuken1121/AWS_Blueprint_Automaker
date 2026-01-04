/**
 * Quiz Extractor Page - HTMLからクイズデータを抽出するページ
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ExtractedQuiz } from "@/features/quiz-extractor/entities/types";

export default function ExtractorPage() {
  const router = useRouter();
  const [htmlInput, setHtmlInput] = useState("");
  const [result, setResult] = useState<ExtractedQuiz | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [questionCopyStatus, setQuestionCopyStatus] = useState("Copy Question");
  const [optionCopyStatuses, setOptionCopyStatuses] = useState<
    Record<number, string>
  >({});

  /**
   * HTMLからクイズデータを抽出
   */
  const processExtraction = async (shouldRedirect: boolean) => {
    // リセット
    setResult(null);
    setError(null);
    setQuestionCopyStatus("Copy Question");
    setOptionCopyStatuses({});

    if (!htmlInput.trim()) {
      setError("HTMLコンテンツを入力してください");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/extract-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ htmlContent: htmlInput }),
      });

      const data = await response.json();

      if (data.success && data.data) {
        setResult(data.data);

        if (shouldRedirect) {
          sessionStorage.setItem(
            "quiz_extractor_data",
            JSON.stringify({
              question: data.data.question,
              options: data.data.options,
              autoGenerate: true,
            })
          );
          router.push("/");
        }
      } else {
        setError(data.error || "抽出に失敗しました");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "抽出中にエラーが発生しました"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleExtract = () => processExtraction(false);
  const handleExtractAndGenerate = () => processExtraction(true);

  /**
   * 問題文のみをクリップボードにコピー
   */
  const copyQuestionToClipboard = async () => {
    if (!result) return;

    const questionText = `${result.number}\n${result.question}`.trim();
    await copyTextToClipboard(
      questionText,
      setQuestionCopyStatus,
      "Copy Question"
    );
  };

  /**
   * 個別の選択肢をクリップボードにコピー
   */
  const copyOptionToClipboard = async (index: number) => {
    if (!result || !result.options[index]) return;

    const optionText = `(${index + 1}) ${result.options[index]}`;

    const setStatus = (status: string) => {
      setOptionCopyStatuses((prev) => ({
        ...prev,
        [index]: status,
      }));
    };

    await copyTextToClipboard(optionText, setStatus, "Copy");
  };

  /**
   * テキストをクリップボードにコピーする共通関数
   */
  const copyTextToClipboard = async (
    text: string,
    setStatus: (status: string) => void,
    defaultStatus: string
  ) => {
    try {
      await navigator.clipboard.writeText(text);
      setStatus("Copied! ✅");
      setTimeout(() => setStatus(defaultStatus), 2000);
    } catch (err) {
      console.error("Failed to copy to clipboard:", err);
      setStatus("Copy Failed");
      setTimeout(() => setStatus(defaultStatus), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-3xl mx-auto">
        <header className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Quiz Extractor
              </h1>
              <p className="text-muted-foreground">
                HTMLコンテンツからクイズデータを抽出します
              </p>
            </div>
            <Link
              href="/"
              className="px-4 py-2 text-primary hover:bg-accent rounded-lg transition"
            >
              ← ホーム
            </Link>
          </div>
        </header>

        {/* 入力エリア */}
        <div className="bg-card rounded-lg border border-border p-6 mb-6">
          <label
            htmlFor="html-input"
            className="block text-sm font-medium text-foreground mb-2"
          >
            HTMLコンテンツ（&lt;body&gt;タグ内のコンテンツを貼り付けてください）
          </label>
          <textarea
            id="html-input"
            className="w-full h-32 p-3 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent resize-y text-foreground placeholder:text-muted-foreground font-mono text-sm"
            placeholder="Paste the &lt;body&gt; HTML content here..."
            value={htmlInput}
            onChange={(e) => setHtmlInput(e.target.value)}
            disabled={loading}
          />

          <div className="flex gap-4 mt-4">
            <button
              onClick={handleExtractAndGenerate}
              disabled={loading || !htmlInput.trim()}
              className="flex-1 px-6 py-2 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
            >
              {loading ? "処理中..." : "抽出して解説生成 🚀"}
            </button>
            <button
              onClick={handleExtract}
              disabled={loading || !htmlInput.trim()}
              className="px-6 py-2 bg-secondary text-secondary-foreground font-semibold rounded-lg hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading ? "..." : "抽出のみ"}
            </button>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-destructive/10 border border-destructive/50 rounded-lg">
              <p className="text-destructive text-sm">{error}</p>
            </div>
          )}
        </div>

        {/* プレビューエリア */}
        {result && (
          <div className="bg-card rounded-lg border border-border p-6">
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">
              Preview
            </h2>

            <div className="mb-6">
              <div className="flex items-start justify-between mb-2">
                <span className="inline-block px-2 py-1 bg-primary/20 text-primary text-xs font-bold rounded">
                  {result.number}
                </span>
                <button
                  onClick={copyQuestionToClipboard}
                  className={`px-3 py-1 text-xs font-semibold rounded transition ${
                    questionCopyStatus === "Copied! ✅"
                      ? "bg-green-600 text-white"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  }`}
                >
                  {questionCopyStatus}
                </button>
              </div>
              <p className="text-lg font-medium text-foreground leading-relaxed">
                {result.question}
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground mb-2">
                選択肢
              </h3>
              {result.options.map((opt, index) => (
                <div
                  key={index}
                  className="flex items-start justify-between p-3 bg-muted rounded-lg gap-3"
                >
                  <div className="flex items-start flex-1 gap-3">
                    <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-secondary rounded-full text-xs font-bold text-secondary-foreground">
                      {index + 1}
                    </span>
                    <span className="text-foreground flex-1">{opt}</span>
                  </div>
                  <button
                    onClick={() => copyOptionToClipboard(index)}
                    className={`px-3 py-1 text-xs font-semibold rounded transition whitespace-nowrap flex-shrink-0 ${
                      optionCopyStatuses[index] === "Copied! ✅"
                        ? "bg-green-600 text-white"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    }`}
                  >
                    {optionCopyStatuses[index] || "Copy"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
