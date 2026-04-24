// ---------------------
// Signal
// ---------------------
export const anySignal = (...signals) => {
  const valid = signals.filter((s) => s instanceof AbortSignal);
  if (valid.length === 0) {
    const c = new AbortController();
    c.abort();
    return c.signal;
  }
  if (valid.length === 1)
    return valid[0]; // 追加: 1個ならそのまま返す
  if (typeof AbortSignal.any === 'function') {
    return AbortSignal.any(valid);
  }
  const controller = new AbortController();
  const onAbort = (e) => {
    cleanup();
    controller.abort(e.target.reason);
  };
  const cleanup = () => {
    for (const s of valid) {
      s.removeEventListener('abort', onAbort);
    }
    controller.signal.removeEventListener('abort', cleanup);
  };
  controller.signal.addEventListener('abort', cleanup, { once: true });
  for (const s of valid) {
    if (s.aborted) {
      cleanup();
      controller.abort(s.reason);
      return controller.signal;
    }
    s.addEventListener('abort', onAbort, { once: true });
  }
  return controller.signal;
};
export const timeoutSignal = (ms, parent) => {
  const c = new AbortController();
  if (parent?.aborted) {
    c.abort(parent.reason);
    return c.signal;
  }
  const t = setTimeout(() => {
    c.abort(new DOMException(`Timeout ${ms}ms`, 'TimeoutError'));
  }, ms);
  const onAbort = () => {
    cleanup();
    c.abort(parent?.reason);
  };
  const cleanup = () => {
    clearTimeout(t);
    parent?.removeEventListener('abort', onAbort);
  };
  parent?.addEventListener('abort', onAbort, { once: true });
  c.signal.addEventListener('abort', cleanup, { once: true });
  return c.signal;
};
// ---------------------
// Core
// ---------------------
export const delay = (ms, signal) => new Promise((resolve, reject) => {
  if (signal?.aborted) {
    reject(signal.reason); // 修正:!付けてundefined排除
    return;
  }
  const onAbort = () => {
    clearTimeout(timer);
    reject(signal.reason);
  };
  const timer = setTimeout(() => {
    signal?.removeEventListener('abort', onAbort);
    resolve();
  }, ms);
  signal?.addEventListener('abort', onAbort, { once: true });
});
export const withTimeout = (promise, ms, signal) => {
  const ctrl = new AbortController();
  const combined = signal ? anySignal(signal, ctrl.signal) : ctrl.signal;
  const timeout = delay(ms, combined).then(() => {
    ctrl.abort();
    throw new DOMException(`Timeout ${ms}ms`, 'TimeoutError');
  });
  return Promise.race([promise, timeout]);
};
export const retry = async (fn, options = {}) => {
  const { retries = 3, baseDelay = 100, maxDelay = Infinity, factor = 2, jitter = 0, signal, shouldRetry, retryOnResult, onRetry, maxRetryTime, } = options;
  const start = Date.now();
  for (let i = 0; i <= retries; i++) {
    const ctrl = new AbortController();
    const combined = signal ? anySignal(signal, ctrl.signal) : ctrl.signal;
    try {
      const result = await fn(combined);
      if (!retryOnResult?.(result)) {
        return result;
      }
      throw result instanceof Error ? result : new Error(String(result));
    }
    catch (e) {
      ctrl.abort();
      if (signal?.aborted ||
        i === retries ||
        (shouldRetry && !shouldRetry(e)) ||
        (maxRetryTime !== undefined && Date.now() - start > maxRetryTime)) {
        throw e;
      }
      onRetry?.(i, e);
      const base = Math.min(baseDelay * factor ** i, maxDelay);
      const wait = base + Math.random() * jitter * base;
      await delay(wait, signal);
    }
  }
  throw new Error('unreachable');
};
// ---------------------
// Scheduler
// ---------------------
const runWithConcurrency = async (tasks, concurrency, signal, onSettled, shouldStop) => {
  let index = 0;
  let active = 0;
  let finished = false;
  return new Promise((resolve, reject) => {
    const next = () => {
      if (finished || shouldStop?.()) {
        return;
      }
      if (index >= tasks.length && active === 0) {
        finished = true;
        resolve();
        return;
      }
      while (active < concurrency && index < tasks.length) {
        const current = index;
        index += 1;
        active += 1;
        const ctrl = new AbortController();
        const combined = signal ? anySignal(signal, ctrl.signal) : ctrl.signal;
        tasks[current](combined)
          .then((value) => {
            onSettled?.(current, { status: 'fulfilled', value });
          })
          .catch((reason) => {
            onSettled?.(current, { status: 'rejected', reason });
          })
          .finally(() => {
            active -= 1;
            next();
          });
      }
    };
    signal?.addEventListener('abort', () => {
      finished = true;
      reject(signal.reason);
    }, { once: true });
    next();
  });
};
// ---------------------
// Concurrency
// ---------------------
export const allLimit = async (tasks, concurrency, signal) => {
  const results = new Array(tasks.length);
  let error;
  await runWithConcurrency(tasks, concurrency, signal, (i, r) => {
    if (r.status === 'fulfilled') {
      results[i] = r.value;
    }
    else if (error === undefined) {
      error = r.reason;
    }
  }, () => error !== undefined);
  if (error !== undefined) {
    throw error;
  }
  return results;
};
export const mapLimit = (items, concurrency, fn, signal) => {
  const tasks = items.map((item, i) => {
    return (s) => fn(item, s, i);
  });
  return allLimit(tasks, concurrency, signal);
};
// ---------------------
// Race / Any 修正版
// ---------------------
export const race = (tasks, signal) => new Promise((resolve, reject) => {
  if (signal?.aborted)
    return reject(signal.reason); // 追加
  let settled = false;
  const controllers = [];
  const onAbort = () => {
    // 追加
    if (!settled) {
      settled = true;
      controllers.forEach((c) => c.abort(signal.reason));
      reject(signal.reason);
    }
  };
  signal?.addEventListener('abort', onAbort, { once: true });
  const cleanup = () => signal?.removeEventListener('abort', onAbort); // 追加
  tasks.forEach((task, i) => {
    const ctrl = new AbortController();
    controllers[i] = ctrl;
    const combined = signal ? anySignal(signal, ctrl.signal) : ctrl.signal;
    task(combined)
      .then((value) => {
        if (!settled) {
          settled = true;
          cleanup(); // 追加
          controllers.forEach((c) => c.abort());
          resolve(value);
        }
      })
      .catch((reason) => {
        if (!settled) {
          settled = true;
          cleanup(); // 追加
          controllers.forEach((c) => c.abort());
          reject(reason);
        }
      });
  });
});
export const any = (tasks, signal) => new Promise((resolve, reject) => {
  if (signal?.aborted)
    return reject(signal.reason); // 追加
  const errors = [];
  let rejected = 0;
  let done = false;
  const controllers = [];
  const onAbort = () => {
    // 追加
    if (!done) {
      done = true;
      controllers.forEach((c) => c.abort(signal.reason));
      reject(signal.reason);
    }
  };
  signal?.addEventListener('abort', onAbort, { once: true });
  const cleanup = () => signal?.removeEventListener('abort', onAbort); // 追加
  tasks.forEach((task, i) => {
    const ctrl = new AbortController();
    controllers[i] = ctrl;
    const combined = signal ? anySignal(signal, ctrl.signal) : ctrl.signal;
    task(combined)
      .then((value) => {
        if (!done) {
          done = true;
          cleanup(); // 追加
          controllers.forEach((c) => c.abort());
          resolve(value);
        }
      })
      .catch((reason) => {
        errors[i] = reason;
        rejected += 1;
        if (rejected === tasks.length && !done) {
          done = true;
          cleanup(); // 追加
          controllers.forEach((c) => c.abort());
          reject(new AggregateError(errors, 'All promises were rejected'));
        }
      });
  });
});
// ---------------------
// Limit
// ---------------------
export const createLimit = (concurrency) => {
  let active = 0;
  const queue = [];
  const next = () => {
    if (active >= concurrency)
      return;
    const job = queue.shift();
    if (!job)
      return;
    active += 1;
    job();
  };
  return (fn) => new Promise((resolve, reject) => {
    queue.push(() => {
      fn()
        .then(resolve)
        .catch(reject)
        .finally(() => {
          active -= 1;
          next();
        });
    });
    next();
  });
};
// ---------------------
// Queue
// ---------------------
export const createQueue = ({ concurrency = 1 } = {}) => {
  const limit = createLimit(concurrency);
  let pending = 0;
  let resolveIdle;
  const checkIdle = () => {
    if (pending === 0 && resolveIdle) {
      const r = resolveIdle;
      resolveIdle = undefined;
      r();
    }
  };
  return {
    add(task) {
      pending += 1;
      return limit(task).finally(() => {
        pending -= 1;
        checkIdle();
      });
    },
    onIdle() {
      if (pending === 0) {
        return Promise.resolve();
      }
      return new Promise((resolve) => {
        resolveIdle = resolve;
      });
    },
  };
};
// ---------------------
// Utils 型修正版
// ---------------------
export const deferred = () => {
  let resolve = () => { };
  let reject = () => { };
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};
export const once = (fn) => {
  let called = false;
  let result;
  return async (...args) => {
    if (!called) {
      called = true;
      result = await fn(...args);
    }
    return result;
  };
};
export const memoizeAsync = (fn) => {
  const cache = new Map();
  return (...args) => {
    let key;
    try {
      key = JSON.stringify(args);
    }
    catch {
      key = String(args);
    }
    if (!cache.has(key)) {
      cache.set(key, fn(...args));
    }
    return cache.get(key);
  };
};
function createTask(chain) {
  const wrap = (next) => createTask(next);
  return {
    run(signal) {
      return chain(signal ?? new AbortController().signal);
    },
    map(fn) {
      return wrap(async (signal) => {
        const v = await chain(signal);
        return fn(v, signal);
      });
    },
    tap(fn) {
      return wrap(async (signal) => {
        const v = await chain(signal);
        await fn(v, signal);
        return v;
      });
    },
    retry(options) {
      return wrap((signal) => retry(chain, typeof options === 'number'
        ? { retries: options, signal }
        : { ...options, signal }));
    },
    timeout(ms) {
      return wrap((signal) => withTimeout(chain(signal), ms, signal));
    },
    catch(fn) {
      return wrap(async (signal) => {
        try {
          return await chain(signal);
        }
        catch (e) {
          return fn(e);
        }
      });
    },
    finally(fn) {
      return wrap(async (signal) => {
        try {
          return await chain(signal);
        }
        finally {
          fn();
        }
      });
    },
  };
}
export const task = Object.assign((fn) => createTask(fn), {
  all: (tasks) => createTask(async (signal) => Promise.all(tasks.map((t) => t.run(signal)))),
  race: (tasks) => createTask((signal) => Promise.race(tasks.map((t) => t.run(signal)))),
  from: (items) => ({
    map(fn) {
      let _concurrency = Infinity;
      return {
        concurrency(n) {
          _concurrency = n;
          return this;
        },
        run(signal) {
          return mapLimit(items, _concurrency, fn, signal);
        },
      };
    },
  }),
});
