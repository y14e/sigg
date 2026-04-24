import { anySignal } from '../signal/any-signal';
import type { Task } from '../types';

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
      const reason = signal?.reason;

      for (const controller of controllers) {
        controller.abort(reason);
      }

      reject(reason);
    };

    const cleanup = () => {
      signal?.removeEventListener('abort', onAbort);
    };

    signal?.addEventListener('abort', onAbort, { once: true });

    for (const task of tasks) {
      const controller = new AbortController();
      controllers.push(controller);
      const { signal: own } = controller;
      const combined = signal ? anySignal(signal, own) : own;
      task(combined)
        .then((value) => {
          if (isSettled) {
            return;
          }

          isSettled = true;
          cleanup();

          for (const controller of controllers) {
            controller?.abort();
          }

          resolve(value);
        })
        .catch((reason) => {
          if (isSettled) {
            return;
          }

          isSettled = true;
          cleanup();

          for (const controller of controllers) {
            controller?.abort();
          }

          reject(reason);
        });
    }
  });
};
