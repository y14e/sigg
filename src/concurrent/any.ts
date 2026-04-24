import { anySignal } from '../signal/any-signal';
import type { Task } from '../types';

export const any = <T>(
  tasks: readonly Task<T>[],
  signal?: AbortSignal,
): Promise<T> => {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      return reject(signal.reason);
    }

    let isDone = false;
    const controllers: AbortController[] = [];

    const onAbort = () => {
      if (isDone) {
        return;
      }

      isDone = true;
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

    const errors: unknown[] = [];
    let rejected = 0;

    tasks.forEach((task, i) => {
      const controller = new AbortController();
      controllers[i] = controller;
      const { signal: own } = controller;
      const combined = signal ? anySignal(signal, own) : own;

      task(combined)
        .then((value) => {
          if (!isDone) {
            isDone = true;
            cleanup();

            for (const controller of controllers) {
              controller.abort();
            }

            resolve(value);
          }
        })
        .catch((reason) => {
          errors[i] = reason;
          rejected++;

          if (rejected === tasks.length && !isDone) {
            isDone = true;
            cleanup();

            for (const controller of controllers) {
              controller.abort();
            }

            reject(new AggregateError(errors, 'All promises were rejected.'));
          }
        });
    });
  });
};
