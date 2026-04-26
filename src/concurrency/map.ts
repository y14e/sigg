import { all } from '@/concurrency/all';
import type { Task } from '@/types';

export function map<T, R>(
  items: T[],
  concurrency: number,
  callback: (item: T, index: number, signal: AbortSignal) => Promise<R>,
  signal?: AbortSignal,
): Promise<R[]> {
  const tasks: Task<R>[] = items.map(
    (item, index) => (signal) => callback(item, index, signal),
  );
  return all(tasks, concurrency, signal);
}
