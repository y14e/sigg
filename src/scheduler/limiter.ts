export function createLimiter<T>(
  concurrency: number,
): (callback: () => Promise<T>) => Promise<T> {
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

  return (callback) =>
    new Promise((resolve, reject) => {
      queue[queue.length] = () =>
        callback()
          .then(resolve)
          .catch(reject)
          .finally(() => {
            attempt--;
            next();
          });
      next();
    });
}
