export function keyedSerial() {
  const tails = new Map<string, Promise<unknown>>();

  return async function run<T>(key: string, task: () => Promise<T>): Promise<T> {
    const previous = tails.get(key) ?? Promise.resolve();
    const current = previous.catch(() => undefined).then(task);
    tails.set(key, current);
    try {
      return await current;
    } finally {
      if (tails.get(key) === current) tails.delete(key);
    }
  };
}
