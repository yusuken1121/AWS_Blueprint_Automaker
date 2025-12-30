/**
 * Mermaidコードの検証と自動修正機能
 */

export interface MermaidValidationResult {
  isValid: boolean;
  fixedCode?: string;
  error?: string;
  warnings?: string[];
}

/**
 * Mermaidコードを検証し、一般的なエラーを自動修正
 */
export function validateAndFixMermaid(code: string): MermaidValidationResult {
  const warnings: string[] = [];
  let fixedCode = code.trim();

  // 空のコードチェック
  if (!fixedCode) {
    return {
      isValid: false,
      error: "Mermaidコードが空です",
    };
  }

  // 基本的な構文チェックと修正
  try {
    // 1. graph宣言の確認と修正
    if (
      !fixedCode.match(
        /^\s*(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|gitgraph|journey|requirement)/i
      )
    ) {
      // graph宣言がない場合、自動的に追加
      if (fixedCode.includes("-->") || fixedCode.includes("---")) {
        fixedCode = `graph TD\n${fixedCode}`;
        warnings.push("graph宣言が不足していたため、自動的に追加しました");
      } else if (fixedCode.includes("->")) {
        fixedCode = `sequenceDiagram\n${fixedCode}`;
        warnings.push(
          "sequenceDiagram宣言が不足していたため、自動的に追加しました"
        );
      } else {
        fixedCode = `graph LR\n${fixedCode}`;
        warnings.push(
          "graph宣言が不足していたため、デフォルトのgraph LRを追加しました"
        );
      }
    }

    // 2. ノードIDの修正（スペースや特殊文字を含む場合）
    // パターン1: 引用符で囲まれたノードラベル A["Label"] 形式（先に処理）
    // 引用符で囲まれている場合は括弧を変換しない（Mermaidが正しく処理できる）
    fixedCode = fixedCode.replace(
      /([A-Za-z0-9_]+)\["([^"]+)"\]/g,
      (match, id, label) => {
        // IDにスペースや特殊文字が含まれている場合、修正
        const cleanId = id.replace(/[^A-Za-z0-9_]/g, "_");
        if (cleanId !== id) {
          warnings.push(`ノードID "${id}" を "${cleanId}" に修正しました`);
        }
        // 引用符で囲まれている場合は括弧をそのまま保持
        return `${cleanId}["${label}"]`;
      }
    );

    // パターン2: A[Label] 形式 - ラベル内の括弧を全角に変換
    fixedCode = fixedCode.replace(
      /([A-Za-z0-9_]+)\[([^\]]+)\]/g,
      (match, id, label) => {
        // IDにスペースや特殊文字が含まれている場合、修正
        const cleanId = id.replace(/[^A-Za-z0-9_]/g, "_");
        if (cleanId !== id) {
          warnings.push(`ノードID "${id}" を "${cleanId}" に修正しました`);
        }
        // ラベル内の半角括弧を全角に変換（Mermaidのパーサーエラーを防ぐ）
        const escapedLabel = label.replace(/\(/g, "（").replace(/\)/g, "）");
        return `${cleanId}[${escapedLabel}]`;
      }
    );

    // パターン3: スペースを含むノード定義を修正
    fixedCode = fixedCode.replace(
      /([A-Za-z0-9_]+)\s+\[([^\]]+)\]/g,
      (match, id, label) => {
        const cleanId = id.replace(/[^A-Za-z0-9_]/g, "_");
        const escapedLabel = label.replace(/\(/g, "（").replace(/\)/g, "）");
        return `${cleanId}[${escapedLabel}]`;
      }
    );

    // パターン4: 引用符で囲まれたノードID（古い形式）を修正
    fixedCode = fixedCode.replace(
      /"([^"]+)"\s*\[([^\]]+)\]/g,
      (match, id, label) => {
        const cleanId = id.replace(/[^A-Za-z0-9_]/g, "_");
        const escapedLabel = label.replace(/\(/g, "（").replace(/\)/g, "）");
        return `${cleanId}[${escapedLabel}]`;
      }
    );

    // 3. 複数のノード定義が同じ行にある場合、別々の行に分割
    fixedCode = fixedCode
      .split("\n")
      .map((line) => {
        const trimmed = line.trim();
        // 複数のノード定義を検出（例: A[Label]    B[Label]）
        const nodeMatches = trimmed.matchAll(/([A-Za-z0-9_]+)\[([^\]]+)\]/g);
        const nodes = Array.from(nodeMatches);

        if (nodes.length > 1) {
          // 複数のノード定義がある場合、それぞれを別の行に分割
          const nodeLines = nodes.map((match) => {
            const id = match[1];
            const label = match[2];
            const escapedLabel = label
              .replace(/\(/g, "（")
              .replace(/\)/g, "）");
            return `${id}[${escapedLabel}]`;
          });

          // エッジ定義がある場合は保持
          const edgeMatch = trimmed.match(
            /([A-Za-z0-9_]+)\s*-->\s*([A-Za-z0-9_]+)/
          );
          if (edgeMatch) {
            nodeLines.push(`${edgeMatch[1]} --> ${edgeMatch[2]}`);
          }

          warnings.push(`複数のノード定義を別々の行に分割しました: ${trimmed}`);
          return nodeLines.join("\n");
        }

        return line;
      })
      .join("\n");

    // 4. 不完全なエッジ定義の削除（エッジの後にノードIDがない場合）
    // 行単位で処理して、不完全なエッジ定義を削除
    fixedCode = fixedCode
      .split("\n")
      .map((line) => {
        const trimmed = line.trim();
        // エッジ記号で終わっている行（不完全なエッジ）を削除
        if (trimmed.match(/-->\s*$/) || trimmed.match(/---\s*$/)) {
          warnings.push(`不完全なエッジ定義を削除しました: ${trimmed}`);
          return "";
        }
        // エッジの後に無効な文字が続く場合も削除
        if (trimmed.match(/[A-Za-z0-9_]+\s*-->\s*[^A-Za-z0-9_\s]/)) {
          warnings.push(`不完全なエッジ定義を削除しました: ${trimmed}`);
          return "";
        }
        return line;
      })
      .filter((line) => line.trim().length > 0)
      .join("\n");

    // 5. エッジの構文修正
    // --> の前後にスペースがない場合、追加
    fixedCode = fixedCode.replace(
      /([A-Za-z0-9_]+)--?>([A-Za-z0-9_]+)/g,
      "$1 --> $2"
    );
    fixedCode = fixedCode.replace(
      /([A-Za-z0-9_]+)---([A-Za-z0-9_]+)/g,
      "$1 --- $2"
    );
    // エッジにラベルがある場合の修正
    fixedCode = fixedCode.replace(
      /([A-Za-z0-9_]+)--\|([^|]+)\|-->([A-Za-z0-9_]+)/g,
      "$1 -->|$2| $3"
    );
    fixedCode = fixedCode.replace(
      /([A-Za-z0-9_]+)-->([A-Za-z0-9_]+)\|([^|]+)\|/g,
      "$1 --> $2|$3|"
    );

    // 6. スタイル定義の修正
    // style コマンドの構文チェック
    fixedCode = fixedCode.replace(
      /style\s+([A-Za-z0-9_]+)\s+fill:([^,]+),stroke:([^,]+),stroke-width:(\d+)/g,
      (match, id, fill, stroke, width) => {
        // スタイル定義を正しい形式に修正
        return `style ${id} fill:${fill.trim()},stroke:${stroke.trim()},stroke-width:${width.trim()}px`;
      }
    );

    // 7. コメントの削除（Mermaidではコメントが問題を引き起こすことがある）
    fixedCode = fixedCode.replace(/%%[^\n]*\n?/g, "");

    // 8. 空行の整理
    fixedCode = fixedCode
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .join("\n");

    return {
      isValid: true,
      fixedCode,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  } catch (error) {
    return {
      isValid: false,
      error:
        error instanceof Error ? error.message : "検証中にエラーが発生しました",
    };
  }
}

/**
 * Mermaidコードを簡易的なテキスト図に変換（フォールバック）
 */
export function mermaidToTextDiagram(mermaidCode: string): string {
  try {
    // 基本的なgraph TD/LRをテキスト図に変換
    const lines = mermaidCode.split("\n");
    const textDiagram: string[] = [];

    for (const line of lines) {
      // ノード定義: A[Label] -> A: Label
      const nodeMatch = line.match(/([A-Za-z0-9_]+)\[([^\]]+)\]/);
      if (nodeMatch) {
        textDiagram.push(`${nodeMatch[1]}: ${nodeMatch[2]}`);
        continue;
      }

      // エッジ: A --> B -> A → B
      const edgeMatch = line.match(/([A-Za-z0-9_]+)\s*--?>?\s*([A-Za-z0-9_]+)/);
      if (edgeMatch) {
        textDiagram.push(`${edgeMatch[1]} → ${edgeMatch[2]}`);
        continue;
      }

      // その他の行はそのまま（スタイル定義などはスキップ）
      if (!line.trim().startsWith("style") && line.trim().length > 0) {
        textDiagram.push(line);
      }
    }

    return textDiagram.join("\n");
  } catch {
    return mermaidCode; // 変換に失敗した場合は元のコードを返す
  }
}
