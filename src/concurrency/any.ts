import { abortReason } from '@/internal';
import { anySignal } from '@/signal/any-signal';
import type { Task } from '@/types';

export const any = <T>(
  tasks: readonly Task<T>[],
  signal?: AbortSignal,
): Promise<T> => {
  return new Promise((resolve, reject) => {
    if (tasks.length === 0) {
      return reject(new AggregateError([], 'All promises were rejected'));
    }

    if (signal?.aborted) {
      return reject(abortReason(signal));
    }

    let isSettled = false;
    const controllers: AbortController[] = [];

    const onAbort = () => {
      if (isSettled) {
        return;
      }

      isSettled = true;
      cleanup();
      const reason = abortReason(signal);

      for (const controller of controllers) {
        controller.abort(reason);
      }

      reject(reason);
    };

    const cleanup = () => {
      signal?.removeEventListener('abort', onAbort);
    };

    signal?.addEventListener('abort', onAbort, { once: true });
    const errors: unknown[] = [];
    let rejected = 0;

    const settle = (callback: () => void) => {
      if (isSettled) {
        return;
      }

      isSettled = true;
      cleanup();

      for (const controller of controllers) {
        controller.abort();
      }

      callback();
    };

    for (const task of tasks) {
      const controller = new AbortController();
      controllers[controllers.length] = controller;
      const { signal: own } = controller;
      const combined = signal ? anySignal(signal, own) : own;

      task(combined)
        .then((value) => {
          settle(() => {
            resolve(value);
          });
        })
        .catch((reason) => {
          errors[errors.length] = reason;
          rejected++;

          if (rejected === tasks.length) {
            settle(() => {
              reject(new AggregateError(errors, 'All promises were rejected'));
            });
          }
        });
    }
  });
};
