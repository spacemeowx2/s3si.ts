import { IPC } from "./ipc/mod.ts";
import { Command } from "./ipc/types.ts";

export async function runDaemon() {
  const ipc = new IPC<Command>({
    reader: Deno.stdin,
    writer: Deno.stdout,
  });

  while (true) {
    const cmd = await ipc.recv();
    switch (cmd.type) {
      case "hello":
        await ipc.send(cmd);
        break;
      default:
        continue;
    }
  }
}
