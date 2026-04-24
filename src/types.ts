export type Task<T> = (signal: AbortSignal) => Promise<T>;

export type RetryOptions<T> = {
  factor?: number;
  jitter?: number;
  maxRetries?: number;
  maxTimeout?: number;
  maxTotalTime?: number;
  minTimeout?: number;
  onRetry?: (attempt: number, delay: number, error: unknown) => void;
  shouldRetry?: (error: unknown) => boolean;
  retryOnResult?: (value: T) => boolean;
  timeout?: number;
};
