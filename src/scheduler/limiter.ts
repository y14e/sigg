export const createLimiter = (concurrent: number) => {
  let count = 0;
  const queue: (() => void)[] = [];

  const next = () => {
    if (count >= concurrent) {
      return;
    }

    const job = queue.shift();

    if (!job) {
      return;
    }

    count += 1;
    job();
  };

  return <T>(callback: () => Promise<T>): Promise<T> =>
    new Promise((resolve, reject) => {
      queue.push(() => {
        callback()
          .then(resolve)
          .catch(reject)
          .finally(() => {
            count -= 1;
            next();
          });
      });
      next();
    });
};
