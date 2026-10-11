export type RetryOptions = {
  /** Total attempts, including the first attempt. */
  maxAttempts?: number;
  /** Delay before the next attempt; receives the failed attempt number (1-based). */
  delayMs?: (failedAttempt: number) => number;
  /** Decide whether a thrown error is transient and should be retried. */
  shouldRetry?: (error: unknown, failedAttempt: number) => boolean;
  /** Injectable for deterministic tests. */
  sleep?: (milliseconds: number) => Promise<void>;
};

/**
 * Retry an operation only when the caller classifies the failure as transient.
 * Defaults to one attempt, avoiding accidental retries of unsafe operations.
 */
export async function withRetry<T>(
  operation: (attempt: number) => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const maxAttempts = Math.max(1, Math.floor(options.maxAttempts ?? 1));
  const delayMs = options.delayMs ?? ((failedAttempt) => Math.min(250 * 2 ** (failedAttempt - 1), 4_000));
  const shouldRetry = options.shouldRetry ?? (() => false);
  const sleep = options.sleep ?? ((ms) => new Promise<void>((resolve) => setTimeout(resolve, ms)));

  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await operation(attempt);
    } catch (error) {
      lastError = error;
      if (attempt >= maxAttempts || !shouldRetry(error, attempt)) {
        throw error;
      }
      const delay = delayMs(attempt);
      if (Number.isFinite(delay) && delay > 0) {
        await sleep(delay);
      }
    }
  }
  throw lastError;
}
