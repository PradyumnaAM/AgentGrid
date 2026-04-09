type LogLevel = 'info' | 'warn' | 'error';

/**
 * Structured JSON logger. Output is machine-parseable by any log aggregator
 * (Datadog, Logtail, Railway logs, Fly.io, etc.) — no SDK required.
 */
export function log(
  level: LogLevel,
  message: string,
  meta?: Record<string, unknown>
): void {
  const entry = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    message,
    ...meta,
  });

  if (level === 'error') console.error(entry);
  else if (level === 'warn') console.warn(entry);
  else console.log(entry);
}
