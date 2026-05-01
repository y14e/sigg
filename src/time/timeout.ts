import {
  _combineSignals,
  _createCleanup,
  _createTimeoutError,
  _withAbort,
} from '@/_internal';

export async function timeout<T>(
  timeout: number,
  fn: (signal: AbortSignal) => Promise<T>,
  signal?: AbortSignal,
): Promise<T> {
  return _withAbort(signal, (controller) => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    const cleanup = _createCleanup(timer);

    timer = setTimeout(
      () => controller.abort(_createTimeoutError(timeout)),
      timeout,
    );

    return {
      promise: fn(
        _combineSignals(signal, controller.signal) as AbortSignal,
      ).finally(() => cleanup()),
      cleanup,
    };
  });
}
