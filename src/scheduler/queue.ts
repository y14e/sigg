import { createLimiter } from './limiter';

export const createQueue = ({ concurrent = 1 } = {}) => {
  const limit = createLimiter(concurrent);
  let pending = 0;
  let resolveIdle: (() => void) | undefined;

  const checkIdle = () => {
    if (pending !== 0 || !resolveIdle) {
      return;
    }

    const r = resolveIdle;
    resolveIdle = undefined;
    r();
  };

  return {
    add<T>(task: () => Promise<T>) {
      pending += 1;
      return limit(task).finally(() => {
        pending -= 1;
        checkIdle();
      });
    },
    onIdle() {
      if (pending === 0) {
        return Promise.resolve();
      }

      return new Promise<void>((resolve) => {
        resolveIdle = resolve;
      });
    },
  };
};
