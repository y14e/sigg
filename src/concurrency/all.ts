import { runWithConcurrency } from '@/internal';
import type { Task } from '@/types';

export async function all<T>(
  tasks: readonly Task<T>[],
  concurrency: number,
  signal?: AbortSignal,
): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let firstError: unknown | undefined;

  await runWithConcurrency(
    tasks,
    concurrency,
    signal,
    (i, result) => {
      if (result.status === 'fulfilled') {
        results[i] = result.value;
      } else if (firstError === undefined) {
        firstError = result.reason;
      }
    },
    () => {
      return firstError !== undefined;
    },
  );

  if (firstError !== undefined) {
    throw firstError;
  }

  return results;
}
