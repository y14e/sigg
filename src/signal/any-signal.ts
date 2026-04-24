export function anySignal(
  ...signals: (AbortSignal | null | undefined)[]
): AbortSignal {
  const sources = signals.filter((signal): signal is AbortSignal => {
    return signal instanceof AbortSignal;
  });

  const controller = new AbortController();

  if (sources.length === 0) {
    controller.abort();
    return controller.signal;
  }

  if (sources.length === 1) {
    return sources[0] as AbortSignal;
  }

  if (typeof AbortSignal.any === 'function') {
    return AbortSignal.any(sources);
  }

  const { signal: result } = controller;

  const cleanup = () => {
    for (const source of sources) {
      source.removeEventListener('abort', onAbort);
    }

    result.removeEventListener('abort', cleanup);
  };

  const onAbort = (event: Event) => {
    cleanup();
    controller.abort((event.currentTarget as AbortSignal).reason);
  };

  result.addEventListener('abort', cleanup, { once: true });

  for (const source of sources) {
    if (source.aborted) {
      cleanup();
      controller.abort(source.reason);
      return result;
    }

    source.addEventListener('abort', onAbort, { once: true });
  }

  return result;
}
