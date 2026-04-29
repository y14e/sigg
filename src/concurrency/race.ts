import { abortReason } from '@/internal';
import { anySignal } from '@/signal/any-signal';
import type { Task } from '@/types';

export function race<T>(
  tasks: readonly Task<T>[],
  signal?: AbortSignal,
): Promise<T> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      return reject(abortReason(signal));
    }

    const cleanup = () => {
      signal?.removeEventListener('abort', onAbort);
    };

    let isSettled = false;
    const controllers: AbortController[] = [];

    const settle = (callback: () => void, reason?: unknown) => {
      if (isSettled) {
        return;
      }

      isSettled = true;
      cleanup();

      controllers.forEach((controller) => {
        controller.abort(reason);
      });

      callback();
    };

    const onAbort = () => {
      const reason = abortReason(signal);
      settle(() => reject(reason), reason);
    };

    signal?.addEventListener('abort', onAbort, { once: true });

    tasks.forEach((task) => {
      const controller = new AbortController();
      controllers.push(controller);
      const { signal: own } = controller;

      task(signal ? anySignal(signal, own) : own)
        .then((value) => settle(() => resolve(value)))
        .catch((reason) => settle(() => reject(reason)));
    });
  });
}
