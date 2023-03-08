// deno-lint-ignore-file no-explicit-any
import {
  ERROR_INVALID_REQUEST,
  ERROR_METHOD_NOT_FOUND,
  ERROR_PARSEE_ERROR,
  ID,
  Request,
  Response,
  ResponseError,
  Service,
  Transport,
} from "./types.ts";

export class JSONRPCServer {
  protected transport: Transport;
  protected service: Service;
  protected fatal = false;
  protected task: Promise<void> = Promise.resolve();

  constructor(
    { transport, service }: { transport: Transport; service: Service },
  ) {
    this.transport = transport;
    this.service = service;
  }
  async handleRequest(
    req: Request<string, any>,
  ): Promise<Response<any, ResponseError>> {
    const { jsonrpc, id, method, params } = req;
    const res = {
      jsonrpc: "2.0",
      id,
    } as const;
    if (jsonrpc !== "2.0") {
      this.fatal = true;
      return {
        ...res,
        error: ERROR_INVALID_REQUEST,
      };
    }

    const func = this.service[method];
    if (!func) {
      return {
        ...res,
        error: ERROR_METHOD_NOT_FOUND,
      };
    }

    const result = await func.apply(this.service, params);

    return {
      ...res,
      result,
    };
  }
  // `handle` will never throw error
  async handle(
    data: string,
  ): Promise<Response<any, ResponseError> | Response<any, ResponseError>[]> {
    let req: Request<string, any>;
    try {
      req = JSON.parse(data);
    } catch (_) {
      this.fatal = true;
      return {
        jsonrpc: "2.0",
        id: null,
        error: ERROR_PARSEE_ERROR,
      };
    }

    const internalError: (id: ID) => (
      e: unknown,
    ) => Response<any, ResponseError<32000, unknown>> = (id) =>
    (
      e,
    ) => {
      if (e instanceof Error) {
        return {
          jsonrpc: "2.0",
          id: id,
          error: {
            code: 32000,
            message: e.message,
            data: {
              name: e.name,
              stack: e.stack,
              cause: e.cause,
            },
          },
        };
      }
      return {
        jsonrpc: "2.0",
        id: id,
        error: {
          code: 32000,
          message: "Internal error",
          data: String(e),
        },
      };
    };

    // batch request
    if (Array.isArray(req)) {
      return await Promise.all(
        req.map((req) => this.handleRequest(req).catch(internalError(req.id))),
      );
    } else {
      return await this.handleRequest(req).catch(internalError(req.id));
    }
  }
  async serve() {
    while (!this.fatal) {
      const data = await this.transport.recv();
      if (data === undefined) {
        break;
      }
      this.handle(data).then((result) =>
        this.transport.send(JSON.stringify(result))
      ).catch((e) => {
        console.error("Failed to handle request", e);
      });
    }
  }
  async close() {
    await this.transport.close();
  }
}
