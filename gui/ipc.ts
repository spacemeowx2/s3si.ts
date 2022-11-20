import { io } from "../deps.ts";
import { writeAll } from "./deps.ts";

export type Command = {
  type: "loaded";
  url: string;
} | {
  type: "test";
};

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
      // @ts-ignore this is right
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
      // @ts-ignore this is right
      self.postMessage(data);
    }
  }
}

type ExtractType<T extends { type: string }, K extends T["type"]> = Extract<
  T,
  { type: K }
>;

export class IPC<T extends { type: string }> {
  lines: AsyncIterableIterator<string>;
  writer: Deno.Writer;
  constructor({ reader, writer }: {
    reader: Deno.Reader;
    writer: Deno.Writer;
  }) {
    this.lines = io.readLines(reader);
    this.writer = writer;
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
  async recv(): Promise<T> {
    for await (const line of this.lines) {
      return JSON.parse(line);
    }
    throw new Error("EOF");
  }
  async send(data: T) {
    await writeAll(
      this.writer,
      new TextEncoder().encode(JSON.stringify(data) + "\n"),
    );
  }
}
