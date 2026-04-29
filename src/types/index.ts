export interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
}

export type RetryContext<T = unknown> =
  | {
      attempt: number;
      delay: number;
      elapsedTime: number;
      result: T;
      status: 'fulfilled';
    }
  | {
      attempt: number;
      delay: number;
      elapsedTime: number;
      error: unknown;
      status: 'rejected';
    };

export interface RetryOptions<T = unknown> {
  backoffMultiplier?: number;
  initialDelay?: number;
  jitterFactor?: number;
  maxDelay?: number;
  maxRetries?: number;
  onRetry?: (context: RetryContext<T>) => void;
  shouldRetryResult?: (result: T) => boolean;
  shouldStop?: (context: RetryContext<T>) => boolean;
}

export type Task<T> = (signal: AbortSignal) => Promise<T>;
