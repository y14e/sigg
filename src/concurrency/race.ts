import { _combineSignals, _createSettler } from '@/_internal';
import type { Task } from '@/types';

export function race<T>(tasks: readonly Task<T>[], signal?: AbortSignal) {
  return new Promise<T>((resolve, reject) => {
    const { controllers, settle, throwIfAborted } = _createSettler(
      signal,
      reject,
    );

    if (throwIfAborted()) {
      return;
    }

    tasks.forEach((task) => {
      const controller = new AbortController();
      controllers.push(controller);

      task(_combineSignals(signal, controller.signal) as AbortSignal)
        .then((value) => settle(() => resolve(value)))
        .catch((reason) => settle(() => reject(reason)));
    });
  });
}
