import { abortReason } from '@/internal';
import { anySignal } from '@/signal/any-signal';
import type { Task } from '@/types';

export const race = <T>(
  tasks: readonly Task<T>[],
  signal?: AbortSignal,
): Promise<T> => {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      return reject(signal.reason);
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
      controllers.push(controller);
      const { signal: own } = controller;
      const combined = signal ? anySignal(signal, own) : own;

      task(combined)
        .then((value) => {
          settle(() => {
            resolve(value);
          });
        })
        .catch((reason) => {
          settle(() => {
            reject(reason);
          });
        });
    }
  });
};
