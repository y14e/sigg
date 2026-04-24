import { anySignal } from '../signal/any-signal';
import { sleep } from './sleep.js';

export function withTimeout<T>(
  promise: Promise<T>,
  timeout: number,
  signal?: AbortSignal,
): Promise<T> {
  const controller = new AbortController();
  const { signal: own } = controller;
  return Promise.race([
    promise,
    sleep(timeout, signal ? anySignal(signal, own) : own).then(() => {
      controller.abort();
      throw new DOMException(`Timeout ${timeout}ms.`, 'TimeoutError');
    }),
  ]);
}
