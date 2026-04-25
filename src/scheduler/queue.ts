import { createLimiter } from './limiter';

export const createQueue = ({ concurrency = 1 } = {}) => {
  let pending = 0;
  let idleResolvers: (() => void)[] = [];

  const checkIdle = () => {
    if (pending !== 0 || idleResolvers.length === 0) {
      return;
    }

    const resolvers = idleResolvers;
    idleResolvers = [];

    for (const resolver of resolvers) {
      resolver();
    }
  };

  const limiter = createLimiter(concurrency);

  return {
    async add<T>(task: () => Promise<T>) {
      pending++;
      return limiter(() => Promise.resolve().then(task)).finally(() => {
        pending--;
        checkIdle();
      });
    },
    onIdle() {
      if (pending === 0) {
        return Promise.resolve();
      }

      return new Promise<void>((resolve) => {
        idleResolvers[idleResolvers.length] = resolve;
      });
    },
  };
};
