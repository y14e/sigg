export function debounce<T, R>(
  delay: number,
  fn: (value: T, signal: AbortSignal) => Promise<R>,
): (value: T) => Promise<R> {
  let controller: AbortController | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;

  return (value: T) => {
    controller?.abort();

    if (timer !== undefined) {
      clearTimeout(timer);
      timer = undefined;
    }

    controller = new AbortController();

    return new Promise<R>((resolve, reject) => {
      timer = setTimeout(() => {
        fn(value, controller?.signal as AbortSignal).then(
          resolve,
          reject,
        );
      }, delay);
    });
  };
};
