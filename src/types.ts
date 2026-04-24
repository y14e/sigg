export type Task<T> = (signal: AbortSignal) => Promise<T>;

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
  elapsed: number;
  delay: number;
}
