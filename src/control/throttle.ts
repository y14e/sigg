type ThrottleOptions = {
  leading?: boolean;
  trailing?: boolean;
};

export function throttle<T, R>(
  delay: number,
  callback: (value: T, signal: AbortSignal) => Promise<R>,
  options: ThrottleOptions = {},
) {
  let controller: AbortController | null = null;
  let lastTime = 0;
  let lastArgs: T | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const { leading = true, trailing = true } = options;

  const invoke = (value: T) => {
    controller?.abort();
    controller = new AbortController();
    lastTime = Date.now();
    return callback(value, controller.signal);
  };

  return (value: T): Promise<R | undefined> => {
    const now = Date.now();
    const remaining = delay - (now - lastTime);
    lastArgs = value;

    if (remaining <= 0) {
      if (timer !== undefined) {
        clearTimeout(timer);
        timer = undefined;
      }

      if (leading) {
        return invoke(value);
      }
    }

    if (trailing && timer === undefined) {
      return new Promise<R | undefined>((resolve, reject) => {
        timer = setTimeout(() => {
          timer = undefined;

          if (lastArgs !== null) {
            invoke(lastArgs).then(resolve, reject);
            lastArgs = null;
          }
        }, remaining);
      });
    }

    return Promise.resolve(undefined);
  };
}
