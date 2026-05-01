export function once<T extends unknown[], R>(
  fn: (...args: T) => R | Promise<R>,
): (...args: T) => Promise<R> {
  let promise: Promise<R> | undefined;

  return (...args: T): Promise<R> => {
    if (promise === undefined) {
      const p = Promise.resolve().then(() => fn(...args));
      promise = p;

      p.catch(() => {
        if (promise === p) {
          promise = undefined;
        }
      });
    }

    return promise;
  };
}
