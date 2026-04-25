export const createLimiter = (concurrency: number) => {
  let count = 0;
  const queue: (() => void)[] = [];

  const next = () => {
    if (count >= concurrency) {
      return;
    }

    const job = queue.shift();

    if (!job) {
      return;
    }

    count++;
    job();
  };

  return <T>(callback: () => Promise<T>): Promise<T> =>
    new Promise((resolve, reject) => {
      queue[queue.length] = () => {
        callback()
          .then(resolve)
          .catch(reject)
          .finally(() => {
            count--;
            next();
          });
      };
      next();
    });
};
