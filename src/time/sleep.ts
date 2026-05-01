import { _createCleanup, _withAbort } from '@/_internal';

export function sleep(timeout: number, signal?: AbortSignal) {
  return _withAbort(signal, () => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    return {
      promise: new Promise<void>((resolve) => {
        timer = setTimeout(resolve, timeout);
      }),
      cleanup: _createCleanup(timer),
    };
  });
}
