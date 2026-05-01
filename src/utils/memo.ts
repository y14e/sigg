type MemoNode<T> = {
  objectBranch?: WeakMap<object, MemoNode<T>> | undefined;
  primitiveBranch?: Map<unknown, MemoNode<T>> | undefined;
  promise?: Promise<T> | undefined;
  value?: T | undefined;
  expireAt?: number | undefined;
};

export function memo<T extends unknown[], R>(
  fn: (...args: T) => Promise<R>,
  options: { ttl?: number } = {},
) {
  const root: MemoNode<R> = {};

  const getNode = (args: T): MemoNode<R> => {
    let node = root;

    for (const arg of args) {
      let map: WeakMap<object, MemoNode<R>> | Map<unknown, MemoNode<R>>;

      if (
        arg !== null &&
        (typeof arg === 'object' || typeof arg === 'function')
      ) {
        map = node.objectBranch ??= new WeakMap();
      } else {
        map = node.primitiveBranch ??= new Map();
      }

      let next = map.get(arg as object);

      if (!next) {
        next = {};
        map.set(arg as object, next);
      }

      node = next;
    }

    return node;
  };

  const { ttl } = options;

  const memoized = (...args: T): Promise<R> => {
    const node = getNode(args);
    const now = Date.now();

    if (node.value !== undefined) {
      if (
        ttl === undefined ||
        node.expireAt === undefined ||
        now < node.expireAt
      ) {
        return Promise.resolve(node.value);
      }

      node.value = undefined;
      node.expireAt = undefined;
    }

    if (node.promise) {
      return node.promise;
    }

    const p = Promise.resolve().then(() => fn(...args));
    node.promise = p;

    p.then((value) => {
      node.value = value;

      if (ttl !== undefined) {
        node.expireAt = Date.now() + ttl;
      }
    }).finally(() => {
      if (node.promise === p) {
        delete node.promise;
      }
    });

    return p;
  };

  memoized.clear = () => {
    root.objectBranch = undefined;
    root.primitiveBranch = undefined;
    root.promise = undefined;
    root.value = undefined;
    root.expireAt = undefined;
  };

  memoized.delete = (...args: T) => {
    const node = getNode(args);
    node.promise = undefined;
    node.value = undefined;
    node.expireAt = undefined;
  };

  memoized.invalidate = (predicate: (args: T) => boolean) => {
    const walk = (node: MemoNode<R>, path: unknown[]) => {
      if (node.promise !== undefined || node.value !== undefined) {
        if (predicate(path as T)) {
          node.promise = undefined;
          node.value = undefined;
          node.expireAt = undefined;
        }
      }

      node.primitiveBranch?.forEach((child, key) => {
        walk(child, [...path, key]);
      });
    };

    walk(root, []);
  };

  return memoized as typeof memoized & {
    clear: () => void;
    delete: (...args: T) => void;
    invalidate: (predicate: (args: T) => boolean) => void;
  };
}
