export function timeoutSignal(
  timeout: number,
  signal?: AbortSignal,
): AbortSignal {
  const controller = new AbortController();
  const { signal: own } = controller;

  if (signal?.aborted) {
    controller.abort(signal.reason);
    return own;
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
    cleanup();
    controller.abort(signal?.reason);
  };

  signal?.addEventListener('abort', onAbort, { once: true });
  own.addEventListener('abort', cleanup, { once: true });

  timer = setTimeout(() => {
    controller.abort(new DOMException(`Timeout ${timeout}ms.`, 'TimeoutError'));
  }, timeout);

  return own;
}
