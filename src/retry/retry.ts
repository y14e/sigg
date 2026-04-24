import { anySignal } from '../signal/any-signal';
import { sleep } from '../time/sleep';
import { timeout as _timeout } from '../time/timeout';
import type { RetryOptions, Task } from '../types';

export const retry = async <T>(
  callback: Task<T>,
  signal?: AbortSignal,
  options: RetryOptions<T> = {},
): Promise<T> => {
  const {
    factor = 2,
    jitter = 0,
    maxRetries = 10,
    maxTimeout = Infinity,
    maxTotalTime,
    minTimeout = 1000,
    onRetry,
    retryOnResult,
    shouldRetry,
    timeout,
  } = options;

  const start = Date.now();
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (signal?.aborted) {
      throw signal.reason;
    }

    const controller = new AbortController();
    const { signal: own } = controller;
    const combined = signal ? anySignal(signal, own) : own;

    try {
      const result =
        timeout !== undefined
          ? await _timeout(timeout, callback, combined)
          : await callback(combined);

      if (!retryOnResult?.(result)) {
        return result;
      }

      lastError = result instanceof Error ? result : new Error(String(result));

      throw lastError;
    } catch (error) {
      controller.abort();
      lastError = error;

      if (
        attempt === maxRetries ||
        (shouldRetry && !shouldRetry(error)) ||
        (maxTotalTime !== undefined && Date.now() - start > maxTotalTime)
      ) {
        throw error;
      }

      const base = Math.min(minTimeout * factor ** attempt, maxTimeout);
      const delay = jitter > 0 ? base * (1 + Math.random() * jitter) : base;

      onRetry?.(attempt + 1, delay, error);

      try {
        await sleep(delay, signal);
      } catch {
        throw signal?.reason ?? error;
      }
    }
  }

  throw lastError;
};
