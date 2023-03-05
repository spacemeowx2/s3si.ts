import { Command, Child } from '@tauri-apps/api/shell'

export class StdioTransport {
  queue: string[] = [];
  waiting: ((value: string | undefined) => void)[] = [];
  callback = (data: string) => {
    const waiting = this.waiting.shift();
    if (waiting) {
      waiting(data);
    } else {
      this.queue.push(data);
    }
  };
  child: Promise<Child>;

  constructor() {
    const command = import.meta.env.DEV
      ? new Command("deno", ["run", "-A", "../../src/daemon.ts"])
      : Command.sidecar('../binaries/s3si');
    command.stdout.on('data', line => {
      this.callback(line)
    })
    command.stderr.on('data', line => {
      console.error('daemon stderr', line)
    })
    this.child = command.spawn()
  }

  async recv(): Promise<string | undefined> {
    return new Promise((resolve) => {
      const data = this.queue.shift();
      if (data) {
        resolve(data);
      } else {
        this.waiting.push(resolve);
      }
    });
  }
  async send(data: string) {
    const child = await this.child;
    await child.write(data + "\n")
  }
  async close() {
    const child = await this.child;
    await child.kill()
  }
}
