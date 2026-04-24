export function deferred<T>() {
  let resolve: (_: T) => void = () => {};
  let reject: (_: unknown) => void = () => {};
  const promise = new Promise<T>((s, j) => {
    resolve = s;
    reject = j;
  });
  return { promise, resolve, reject };
}
