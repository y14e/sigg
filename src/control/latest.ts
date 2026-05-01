export function latest<T extends unknown[], R>(
  fn: (signal: AbortSignal, ...args: T) => Promise<R>,
) {
  let controller: AbortController | null = null;
  return (...args: T): Promise<R> => {
    controller?.abort(new DOMException('Aborted', 'AbortError'));
    controller = new AbortController();
    return fn(controller.signal, ...args);
  };
}
