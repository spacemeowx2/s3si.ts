/// <reference no-default-lib="true" />
/// <reference lib="ESNext" />
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
/// <reference lib="dom.asynciterable" />

import type { ExtractType } from "./types.ts";

export class WorkerChannel<T extends { type: string }> {
  queue: T[] = [];
  waiting: ((value: T) => void)[] = [];

  constructor(private worker?: Worker) {
    const callback = ({ data }: { data: unknown }) => {
      const waiting = this.waiting.shift();
      if (waiting) {
        waiting(data as T);
      } else {
        this.queue.push(data as T);
      }
    };
    if (worker) {
      worker.addEventListener("message", callback);
    } else {
      self.addEventListener("message", callback);
    }
  }
  async recvType<K extends T["type"]>(
    type: K,
  ): Promise<ExtractType<T, K>> {
    const data = await this.recv();
    if (data.type !== type) {
      throw new Error(`Unexpected type: ${data.type}`);
    }
    return data as ExtractType<T, K>;
  }
  recv(): Promise<T> {
    return new Promise<T>((resolve) => {
      const data = this.queue.shift();
      if (data) {
        resolve(data);
      } else {
        this.waiting.push(resolve);
      }
    });
  }
  send(data: T) {
    if (this.worker) {
      this.worker.postMessage(data);
    } else {
      self.postMessage(data);
    }
  }
}
