import { anySignal } from './any-signal';

export function withSignal<T extends unknown[], R>(
  callback: (signal: AbortSignal, ...args: T) => Promise<R>,
) {
  return (...args: T) =>
    (signal?: AbortSignal) =>
    (own: AbortSignal) =>
      callback(signal ? anySignal(signal, own) : own, ...args);
}
