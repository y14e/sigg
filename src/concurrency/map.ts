import { all } from '@/concurrency/all';

export function map<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number, signal: AbortSignal) => Promise<R>,
  signal?: AbortSignal,
): Promise<R[]> {
  return all(
    items.map((item, index) => (signal) => fn(item, index, signal)),
    concurrency,
    signal,
  );
}
