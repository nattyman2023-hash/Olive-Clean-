type LogLevel = "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  message: string;
  data?: unknown;
  timestamp: string;
}

const isDev = import.meta.env.DEV;

function log(level: LogLevel, message: string, data?: unknown) {
  const entry: LogEntry = {
    level,
    message,
    data,
    timestamp: new Date().toISOString(),
  };

  if (isDev) {
    const fn = level === "error" ? console.error : level === "warn" ? console.warn : console.info;
    fn(`[${entry.level.toUpperCase()}] ${entry.message}`, data ?? "");
  }

  // Production: extend here to send to Sentry, LogRocket, etc.
  // if (!isDev && level === "error") { sendToErrorService(entry); }
}

export const logger = {
  info: (message: string, data?: unknown) => log("info", message, data),
  warn: (message: string, data?: unknown) => log("warn", message, data),
  error: (message: string, data?: unknown) => log("error", message, data),
};
