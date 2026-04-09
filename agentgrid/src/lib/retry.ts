export interface RetryOptions {
  maxAttempts: number;
  baseDelayMs: number;
  multiplier: number;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: RetryOptions,
  onRetry?: (attempt: number, error: unknown) => void
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < opts.maxAttempts) {
        onRetry?.(attempt, err);
        const delay = opts.baseDelayMs * Math.pow(opts.multiplier, attempt - 1);
        await new Promise((res) => setTimeout(res, delay));
      }
    }
  }
  throw lastError;
}
