type Level = "info" | "warn" | "error" | "security";

interface LogEntry {
  level: Level;
  event: string;
  ts: string;
  [key: string]: unknown;
}

function emit(level: Level, event: string, meta: Record<string, unknown>) {
  const entry: LogEntry = { level, event, ts: new Date().toISOString(), ...meta };
  // console.error for security/error so Vercel surfaces them in the error log stream
  if (level === "error" || level === "security") {
    console.error(JSON.stringify(entry));
  } else {
    console.log(JSON.stringify(entry));
  }
}

export const logger = {
  info: (event: string, meta: Record<string, unknown> = {}) => emit("info", event, meta),
  warn: (event: string, meta: Record<string, unknown> = {}) => emit("warn", event, meta),
  error: (event: string, meta: Record<string, unknown> = {}) => emit("error", event, meta),
  security: (event: string, meta: Record<string, unknown> = {}) => emit("security", event, meta),
};
