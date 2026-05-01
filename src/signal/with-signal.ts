import { _combineSignals } from '@/_internal';

export function withSignal<T extends unknown[], R>(
  fn: (signal: AbortSignal, ...args: T) => Promise<R>,
) {
  return (...args: T) =>
    (parent?: AbortSignal) =>
    (child: AbortSignal) =>
      fn(_combineSignals(parent, child) as AbortSignal, ...args);
}
