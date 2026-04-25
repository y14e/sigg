import { all } from '@/concurrency/all';
import type { Task } from '@/types';

export function map<T, R>(
  items: T[],
  concurrency: number,
  callback: (item: T, signal: AbortSignal, i: number) => Promise<R>,
  signal?: AbortSignal,
): Promise<R[]> {
  const tasks: Task<R>[] = items.map((item, i) => {
    return (s) => {
      return callback(item, s, i);
    };
  });
  return all(tasks, concurrency, signal);
}
