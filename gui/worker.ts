import { loginManually } from "../src/iksm.ts";
import { serve } from "./deps.ts";
import { Command, WorkerChannel } from "./ipc.ts";

const channel = new WorkerChannel<Command>();
const port = 18234;
const handler = (request: Request): Response => {
  const body = `Your user-agent is:\n\n${
    request.headers.get("user-agent") ?? "Unknown"
  }`;

  return new Response(body, { status: 200 });
};

await serve(handler, {
  port,
  onListen: () =>
    channel.send({ type: "loaded", url: `http://127.0.0.1:${port}` }),
});
