export function keyedSerial() {
  const tails = new Map<string, Promise<unknown>>();

  return async function run<T>(key: string, task: () => Promise<T>): Promise<T> {
    const previous = tails.get(key) ?? Promise.resolve();

    // 同一 key 按顺序执行；前一任务失败也不能阻塞后续任务。
    const current = previous.catch(() => undefined).then(task);

    tails.set(key, current);

    try {
      return await current;
    } finally {
      // 后续任务可能已经接入队列，只能清理仍属于当前任务的尾节点。
      if (tails.get(key) === current) tails.delete(key);
    }
  };
}
