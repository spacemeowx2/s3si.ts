import { loginManually } from "../src/iksm.ts";
import { Command, WorkerChannel } from "./ipc.ts";

const channel = new WorkerChannel<Command>();
const port = 18234;

channel.send({ type: "workerLoaded" });

const { isDev } = await channel.recvType("startWorker");

if (isDev) {
  import("./dev.ts");
} else {
  import("./server.ts");
}
channel.send({ type: "serverReady", url: `http://127.0.0.1:${port}` });
