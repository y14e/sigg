import { _abortReason } from '@/_internal';

export function anySignal(
  ...signals: (AbortSignal | null | undefined)[]
): AbortSignal {
  const sources = signals.filter(
    (signal): signal is AbortSignal =>
      typeof signal === 'object' && signal !== null && 'aborted' in signal,
  );

  const controller = new AbortController();
  const { signal: internal } = controller;

  if (sources.length === 0) {
    controller.abort(new DOMException('Aborted', 'AbortError'));
    return internal;
  }

  if (sources.length === 1) {
    return sources[0] as AbortSignal;
  }

  if (typeof AbortSignal.any === 'function') {
    return AbortSignal.any(sources);
  }

  const cleanup = () => {
    sources.forEach((source) => {
      source.removeEventListener('abort', onAbort);
    });

    internal.removeEventListener('abort', cleanup);
  };

  const onAbort = (event: Event) => {
    cleanup();
    controller.abort(_abortReason(event.currentTarget as AbortSignal));
  };

  internal.addEventListener('abort', cleanup, { once: true });

  for (const source of sources) {
    if (source.aborted) {
      cleanup();
      controller.abort(_abortReason(source));
      return internal;
    }

    source.addEventListener('abort', onAbort, { once: true });
  }

  return internal;
}
