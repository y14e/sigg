export function memo<Args extends unknown[], T>(
  callback: (...args: Args) => Promise<T>,
): (...args: Args) => Promise<T> {
  const cache = new Map<string, Promise<T>>();

  return (...args: Args) => {
    let key: string;

    try {
      key = JSON.stringify(args);
    } catch {
      key = String(args);
    }

    if (!cache.has(key)) {
      cache.set(key, callback(...args));
    }

    return cache.get(key) as Promise<T>;
  };
}
