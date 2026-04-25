export function memo<T extends unknown[], R>(
  callback: (...args: T) => Promise<R>,
): (...args: T) => Promise<R> {
  const cache = new Map<string, Promise<R>>();
  return (...args: T) => {
    let key: string;

    try {
      key = JSON.stringify(args);
    } catch {
      key = String(args);
    }

    if (!cache.has(key)) {
      const promise = callback(...args);
      cache.set(key, promise);

      promise.catch(() => {
        cache.delete(key);
      });
    }

    return cache.get(key) as Promise<R>;
  };
}
