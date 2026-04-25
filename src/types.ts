export interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
}

export interface RetryOptions {
  maxRetries?: number;

  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  jitterFactor?: number;

  shouldStop?: (context: RetryContext) => boolean;

  retryOnResult?: (result: unknown) => boolean;

  onRetry?: (context: RetryContext) => void;
}

export interface RetryContext {
  attempt: number;
  error?: unknown;
  result?: unknown;
  elapsedTime: number;
  delay: number;
}

export type Task<T> = (signal: AbortSignal) => Promise<T>;
