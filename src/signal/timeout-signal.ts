import { _abortReason, _createTimeoutError } from '@/_internal';

export function timeoutSignal(timeout: number, signal?: AbortSignal) {
  const controller = new AbortController();
  const { signal: internal } = controller;

  if (signal?.aborted) {
    controller.abort(_abortReason(signal));
    return internal;
  }

  const timer = setTimeout(
    () => controller.abort(_createTimeoutError(timeout)),
    timeout,
  );

  const onAbort = () => {
    clearTimeout(timer);
    controller.abort(_abortReason(signal));
  };

  signal?.addEventListener('abort', onAbort, { once: true });

  internal.addEventListener(
    'abort',
    () => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
    },
    { once: true },
  );

  return internal;
}
