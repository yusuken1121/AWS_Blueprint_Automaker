/**
 * ロガー機能
 * エラーの発生場所を特定するための構造化ログ出力
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogContext {
  /** ファイル名 */
  file?: string;
  /** 関数名 */
  function?: string;
  /** 行番号 */
  line?: number;
  /** 追加のコンテキスト情報 */
  [key: string]: unknown;
}

export class Logger {
  private static instance: Logger;
  private logLevel: LogLevel;

  private constructor() {
    // 環境変数からログレベルを取得（デフォルト: INFO）
    const envLogLevel = process.env.LOG_LEVEL?.toUpperCase();
    this.logLevel =
      envLogLevel &&
      LogLevel[envLogLevel as keyof typeof LogLevel] !== undefined
        ? LogLevel[envLogLevel as keyof typeof LogLevel]
        : LogLevel.INFO;
  }

  /**
   * シングルトンインスタンスを取得
   */
  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  /**
   * 呼び出し元の情報を取得
   */
  private getCallerInfo(): LogContext {
    const stack = new Error().stack;
    if (!stack) {
      return {};
    }

    const stackLines = stack.split("\n");
    // 4行目が実際の呼び出し元（Logger -> getCallerInfo -> ログメソッド -> 呼び出し元）
    const callerLine = stackLines[4] || stackLines[3] || stackLines[2];

    if (!callerLine) {
      return {};
    }

    // ファイル名と行番号を抽出
    // 例: "    at GeminiClient.analyzeQuestion (/path/to/file.ts:58:15)"
    const match = callerLine.match(
      /at\s+(?:(\w+)\.)?(\w+)\s+\((.+):(\d+):(\d+)\)/
    );
    if (match) {
      const [, className, functionName, filePath, line, column] = match;
      const fileName = filePath.split("/").pop() || filePath;

      return {
        file: fileName,
        function: className ? `${className}.${functionName}` : functionName,
        line: parseInt(line, 10),
        column: parseInt(column, 10),
      };
    }

    // フォールバック: 関数名のみ抽出
    const functionMatch = callerLine.match(/at\s+(?:(\w+)\.)?(\w+)/);
    if (functionMatch) {
      const [, className, functionName] = functionMatch;
      return {
        function: className ? `${className}.${functionName}` : functionName,
      };
    }

    return {};
  }

  /**
   * ログを出力
   */
  private log(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error
  ): void {
    if (level < this.logLevel) {
      return;
    }

    const callerInfo = this.getCallerInfo();
    const timestamp = new Date().toISOString();
    const levelName = LogLevel[level];

    const logEntry = {
      timestamp,
      level: levelName,
      message,
      ...callerInfo,
      ...context,
      ...(error && {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
      }),
    };

    // 本番環境ではJSON形式、開発環境では読みやすい形式
    const isProduction = process.env.NODE_ENV === "production";

    if (isProduction) {
      console.log(JSON.stringify(logEntry));
    } else {
      const location = callerInfo.file
        ? `${callerInfo.file}:${callerInfo.line || "?"}`
        : "unknown";
      const functionName = callerInfo.function || "unknown";

      console.log(
        `[${timestamp}] ${levelName.padEnd(5)} ${location} ${functionName} - ${message}`
      );

      if (context && Object.keys(context).length > 0) {
        console.log("  Context:", context);
      }

      if (error) {
        console.error("  Error:", error.message);
        if (error.stack) {
          console.error("  Stack:", error.stack);
        }
      }
    }
  }

  /**
   * DEBUG レベルのログ
   */
  debug(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  /**
   * INFO レベルのログ
   */
  info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, context);
  }

  /**
   * WARN レベルのログ
   */
  warn(message: string, context?: LogContext): void {
    this.log(LogLevel.WARN, message, context);
  }

  /**
   * ERROR レベルのログ
   */
  error(message: string, error?: Error, context?: LogContext): void {
    this.log(LogLevel.ERROR, message, context, error);
  }
}

/**
 * ロガーのシングルトンインスタンスをエクスポート
 */
export const logger = Logger.getInstance();
