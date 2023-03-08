export class Queue<T> {
  private queue: T[] = [];
  private waiting: ((value: T | undefined) => void)[] = [];

  pop = (): Promise<T | undefined> => {
    return new Promise<T | undefined>((resolve) => {
      const data = this.queue.shift();
      if (data) {
        resolve(data);
      } else {
        this.waiting.push(resolve);
      }
    });
  };
  // TODO: wait until the data is queued if queue has limit
  push = (data: T): Promise<void> => {
    const waiting = this.waiting.shift();
    if (waiting) {
      waiting(data);
    } else {
      this.queue.push(data);
    }
    return Promise.resolve();
  };
  close = (): Promise<void> => {
    for (const resolve of this.waiting) {
      resolve(undefined);
    }
    return Promise.resolve();
  };
}

export function channel<T>() {
  const q1 = new Queue<T>();
  const q2 = new Queue<T>();
  const close = async () => {
    await q1.close();
    await q2.close();
  };

  return [{
    send: q1.push,
    recv: q2.pop,
    close,
  }, {
    send: q2.push,
    recv: q1.pop,
    close,
  }] as const;
}
