import { anySignal } from './any-signal';

export function withSignal<T extends unknown[], R>(
  fn: (signal: AbortSignal, ...args: T) => Promise<R>,
) {
  return (...args: T) =>
    (parent?: AbortSignal) =>
    (internal: AbortSignal) =>
      fn(parent ? anySignal(parent, internal) : internal, ...args);
}
