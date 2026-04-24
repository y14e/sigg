import { anySignal } from '../signal/any-signal';

export function timeout<T>(
  timeout: number,
  callback: (signal: AbortSignal) => Promise<T>,
  signal?: AbortSignal,
): Promise<T> {
  if (signal?.aborted) {
    return Promise.reject(signal.reason);
  }

  let timer: ReturnType<typeof setTimeout> | undefined;

  const cleanup = () => {
    if (timer !== undefined) {
      clearTimeout(timer);
      timer = undefined;
    }

    signal?.removeEventListener('abort', onAbort);
  };

  const onAbort = () => {
    controller.abort(signal?.reason);
  };

  signal?.addEventListener('abort', onAbort, { once: true });

  const controller = new AbortController();
  const { signal: own } = controller;

  timer = setTimeout(() => {
    controller.abort(new DOMException(`Timeout ${timeout}ms.`, 'TimeoutError'));
  }, timeout);

  const combined = signal ? anySignal(signal, own) : own;

  return callback(combined).finally(cleanup);
}
