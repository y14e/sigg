export function latest<T, R>(
  fn: (value: T, signal: AbortSignal) => Promise<R>,
): (value: T) => Promise<R> {
  let controller: AbortController | null = null;

  return (value: T) => {
    controller?.abort();
    controller = new AbortController();
    return fn(value, controller.signal);
  };
}
