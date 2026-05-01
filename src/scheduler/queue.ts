import { createLimiter } from './limiter';

export function createQueue({ concurrency = 1 } = {}): {
  add<T>(task: () => Promise<T>): Promise<T>;
  onIdle(): Promise<void>;
} {
  let pending = 0;
  const limiter = createLimiter(concurrency);
  let resolvers: (() => void)[] = [];

  return {
    async add<T>(task: () => Promise<T>): Promise<T> {
      pending++;

      return limiter(task).finally(() => {
        pending--;

        if (pending > 0 || resolvers.length === 0) {
          return;
        }

        resolvers.forEach((resolver) => {
          resolver();
        });

        resolvers = [];
      }) as Promise<T>;
    },
    onIdle() {
      if (pending === 0) {
        return Promise.resolve();
      }

      return new Promise((resolve) => resolvers.push(resolve));
    },
  };
}
