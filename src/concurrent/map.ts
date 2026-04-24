import type { Task } from '../types';
import { all } from './all';

export const map = <T, R>(
  items: readonly T[],
  concurrent: number,
  callback: (item: T, signal: AbortSignal, i: number) => Promise<R>,
  signal?: AbortSignal,
): Promise<R[]> => {
  const tasks: Task<R>[] = items.map((item, i) => {
    return (s) => {
      return callback(item, s, i);
    };
  });
  return all(tasks, concurrent, signal);
};
