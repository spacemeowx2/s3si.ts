import { channel } from "./channel.ts";
import { JSONRPCClient } from "./client.ts";
import { JSONRPCServer } from "./server.ts";
import { RPCResult, Service } from "./types.ts";
import { assertEquals } from "../../dev_deps.ts";

export interface SimpleService {
  add(a: number, b: number): Promise<
    RPCResult<number>
  >;
  // deno-lint-ignore no-explicit-any
  [key: string]: any;
}

class SimpleServiceImplement implements SimpleService, Service {
  // deno-lint-ignore require-await
  async add(a: number, b: number): Promise<RPCResult<number>> {
    return {
      result: a + b,
    };
  }
  // deno-lint-ignore no-explicit-any
  [key: string]: any;
}

Deno.test("jsonrpc", async () => {
  const [c1, c2] = channel<string>();

  const service = new SimpleServiceImplement();
  const server = new JSONRPCServer({
    transport: c1,
    service,
  });
  const serverTask = server.serve().catch((e) => console.error(e));
  const client = new JSONRPCClient<SimpleService>({
    transport: c2,
  });
  const p = client.getProxy();
  assertEquals((await p.add(1, 2)).result, 3);

  await client.close();
  await server.close();
  await serverTask;
});
