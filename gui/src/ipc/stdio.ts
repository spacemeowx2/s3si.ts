import { ExtractType } from "./types";
import { Command, Child } from '@tauri-apps/api/shell'

export class IPC<T extends { type: string }> {
  queue: T[] = [];
  waiting: ((value: T) => void)[] = [];
  callback = (data: unknown) => {
    const waiting = this.waiting.shift();
    if (waiting) {
      waiting(data as T);
    } else {
      this.queue.push(data as T);
    }
  };
  child: Promise<Child>;

  constructor() {
    const command = Command.sidecar('../binaries/s3si', ['--daemon']);
    command.stdout.on('data', line => {
      this.callback(JSON.parse(line))
    })
    this.child = command.spawn()
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
    return new Promise<T>((resolve) => {
      const data = this.queue.shift();
      if (data) {
        resolve(data);
      } else {
        this.waiting.push(resolve);
      }
    });
  }
  async send(data: T) {
    const child = await this.child;
    await child.write(JSON.stringify(data) + "\n")
  }
}
