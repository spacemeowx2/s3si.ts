// deno-lint-ignore-file no-explicit-any
import {
  ID,
  Request,
  Response,
  ResponseError,
  RPCResult,
  Service,
  Transport,
} from "./types.ts";

export class JSONRPCClient<S extends Service> {
  protected nextId = 1;
  protected transport: Transport;
  protected requestMap: Map<
    ID,
    (result: RPCResult<any, ResponseError>) => void
  > = new Map();
  protected fatal: unknown = undefined;
  protected task: Promise<void>;

  constructor(
    { transport }: { transport: Transport },
  ) {
    this.transport = transport;
    this.task = this.run();
  }

  protected setFatal(e: unknown) {
    if (!this.fatal) {
      this.fatal = e;
    }
  }

  protected handleResponse(
    resp: Response<unknown, ResponseError>,
  ) {
    const { id } = resp;
    const callback = this.requestMap.get(id);
    if (callback) {
      this.requestMap.delete(id);
      callback(resp);
    } else {
      this.setFatal(new Error("invalid response id: " + String(id)));
    }
  }

  // receive response from server
  protected async run() {
    try {
      while (true) {
        const data = await this.transport.recv();
        if (data === undefined) {
          this.setFatal(new Error("transport closed"));
          break;
        }
        const result = JSON.parse(data);
        if (Array.isArray(result)) {
          for (const resp of result) {
            this.handleResponse(resp);
          }
        } else {
          this.handleResponse(result);
        }
      }
    } catch (e) {
      this.setFatal(e);
    }
  }

  makeRequest<
    K extends keyof S & string,
    P extends Parameters<S[K]>,
  >(
    method: K,
    params: P,
  ): Request<K, P> {
    const req = {
      jsonrpc: "2.0",
      id: this.nextId,
      method,
      params,
    } as const;
    this.nextId += 1;
    return req;
  }

  async call<
    K extends keyof S & string,
    P extends Parameters<S[K]>,
    R extends ReturnType<S[K]>,
  >(
    method: K,
    ...params: P
  ): Promise<R> {
    if (this.fatal) {
      throw this.fatal;
    }
    const req = this.makeRequest(method, params);
    await this.transport.send(JSON.stringify(req));

    return new Promise<R>((res, rej) => {
      this.requestMap.set(req.id, (result) => {
        if (result.error) {
          rej(result.error);
        } else {
          res(result.result);
        }
      });
    });
  }

  getProxy(): S {
    const proxy = new Proxy({}, {
      get: (_, method: string) => {
        return (...params: unknown[]) => {
          return this.call(method, ...params as any);
        };
      },
    });
    return proxy as S;
  }

  async close() {
    await this.transport.close();
    await this.task;
  }
}
