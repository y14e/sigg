export interface MemoOptions {
  ttl?: number;
  maxSize?: number;
}

type Entry<T extends unknown[], R> = {
  node: MemoNode<R>;
  args: T;
};

type MemoNode<R> = {
  weak?: WeakMap<object, MemoNode<R>>;
  strong?: Map<unknown, MemoNode<R>>;

  value?: R | undefined;
  promise?: Promise<R> | undefined;

  expireAt?: number | undefined;
  gen?: number | undefined;

  entry?: Entry<any, R> | undefined;
};

export function memo<T extends unknown[], R>(
  fn: (...args: T) => Promise<R>,
  options: MemoOptions = {},
) {
  const root: MemoNode<R> = {};
  const lru = new Map<Entry<T, R>, true>();

  let generation = 0;

  const { ttl, maxSize = Infinity } = options;

  const isObject = (v: unknown): v is object =>
    v !== null && (typeof v === 'object' || typeof v === 'function');

  const getNode = (args: T): MemoNode<R> => {
    let node = root;

    for (const arg of args) {
      let next: MemoNode<R> | undefined;

      if (isObject(arg)) {
        const map = (node.weak ??= new WeakMap());
        next = map.get(arg);
        if (!next) {
          next = {};
          map.set(arg, next);
        }
      } else {
        const map = (node.strong ??= new Map());
        next = map.get(arg);
        if (!next) {
          next = {};
          map.set(arg, next);
        }
      }

      node = next;
    }

    return node;
  };

  const touch = (entry: Entry<T, R>) => {
    if (lru.has(entry)) {
      lru.delete(entry);
    }
    lru.set(entry, true);
  };

  const evict = () => {
    if (lru.size <= maxSize) {
      return;
    }

    const oldest = lru.keys().next().value as Entry<T, R>;
    lru.delete(oldest);

    const node = oldest.node;
    node.value = undefined;
    node.promise = undefined;
    node.expireAt = undefined;
    node.entry = undefined;
  };

  const memoized = (...args: T): Promise<R> => {
    const node = getNode(args);
    const now = Date.now();

    // 世代
    if (node.gen !== generation) {
      node.value = undefined;
      node.promise = undefined;
      node.expireAt = undefined;
      node.entry = undefined;
      node.gen = generation;
    }

    // TTL
    if (node.value !== undefined) {
      if (
        ttl === undefined ||
        node.expireAt === undefined ||
        now < node.expireAt
      ) {
        if (node.entry) {
          touch(node.entry);
        }
        return Promise.resolve(node.value);
      }

      node.value = undefined;
      node.expireAt = undefined;
    }

    // Promise共有
    if (node.promise) {
      if (node.entry) {
        touch(node.entry);
      }
      return node.promise;
    }

    // 新規Entry
    let entry = node.entry as Entry<T, R> | undefined;

    if (!entry) {
      entry = { node, args };
      node.entry = entry;
    }

    touch(entry);

    evict();

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

  // ===== API =====

  memoized.clear = () => {
    generation++;
    lru.clear();
  };

  memoized.delete = (...args: T) => {
    const node = getNode(args);

    if (node.entry) {
      lru.delete(node.entry);
    }

    node.value = undefined;
    node.promise = undefined;
    node.expireAt = undefined;
    node.entry = undefined;
    node.gen = generation;
  };

  memoized.invalidate = (predicate: (args: T) => boolean) => {
    for (const entry of lru.keys()) {
      if (predicate(entry.args)) {
        const node = entry.node;

        lru.delete(entry);

        node.value = undefined;
        node.promise = undefined;
        node.expireAt = undefined;
        node.entry = undefined;
        node.gen = generation;
      }
    }
  };

  memoized.size = () => lru.size;

  return memoized as typeof memoized & {
    clear: () => void;
    delete: (...args: T) => void;
    invalidate: (predicate: (args: T) => boolean) => void;
    size: () => number;
  };
}
