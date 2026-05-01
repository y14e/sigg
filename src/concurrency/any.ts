import { _combineSignals, _createSettler } from '@/_internal';
import type { Task } from '@/types';

export function any<T>(tasks: readonly Task<T>[], signal?: AbortSignal) {
  return new Promise<T>((resolve, reject) => {
    if (tasks.length === 0) {
      return reject(new AggregateError([], 'All promises were rejected'));
    }

    const { controllers, settle, throwIfAborted } = _createSettler(
      signal,
      reject,
    );
    if (throwIfAborted()) {
      return;
    }

    const errors: unknown[] = [];
    let rejected = 0;

    tasks.forEach((task) => {
      const controller = new AbortController();
      controllers.push(controller);

      task(_combineSignals(signal, controller.signal) as AbortSignal)
        .then((value) => settle(() => resolve(value)))
        .catch((reason) => {
          errors.push(reason);
          if (++rejected === tasks.length) {
            settle(() =>
              reject(new AggregateError(errors, 'All promises were rejected')),
            );
          }
        });
    });
  });
}
