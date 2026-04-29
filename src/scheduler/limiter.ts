export function createLimiter<T>(
  concurrency: number,
): (fn: () => Promise<T>) => Promise<T> {
  let attempt = 0;
  const queue: (() => void)[] = [];

  const next = () => {
    if (attempt >= concurrency) {
      return;
    }

    const job = queue.shift();

    if (!job) {
      return;
    }

    attempt++;
    job();
  };

  return (fn) =>
    new Promise((resolve, reject) => {
      queue[queue.length] = () =>
        fn()
          .then(resolve)
          .catch(reject)
          .finally(() => {
            attempt--;
            next();
          });
      next();
    });
}
