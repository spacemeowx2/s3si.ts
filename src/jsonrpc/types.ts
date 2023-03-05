export type ID = string | number | null;

// deno-lint-ignore no-explicit-any
export type ResponseError<Code extends number = number, Data = any> = {
  code: Code;
  message: string;
  data?: Data;
};

export type Request<Method extends string, Params> = {
  jsonrpc: "2.0";
  method: Method;
  params: Params;
  id: ID;
};

export type Notification<Method extends string, Params> = {
  jsonrpc: "2.0";
  method: Method;
  params: Params;
};

// deno-lint-ignore no-explicit-any
export type Response<Result, Error extends ResponseError<number, any>> = {
  jsonrpc: "2.0";
  id: ID;
} & RPCResult<Result, Error>;

export type Transport = {
  send: (data: string) => Promise<void>;
  recv: () => Promise<string | undefined>;
  close: () => Promise<void>;
};

export type RPCResult<Result, Error extends ResponseError = ResponseError> = {
  result?: Result;
  error?: Error;
};

export type Service = {
  [P in string]: (
    // deno-lint-ignore no-explicit-any
    ...args: any[]
  ) => Promise<RPCResult<unknown, ResponseError>>;
};

export const ERROR_PARSEE_ERROR: ResponseError<-32700> = {
  code: -32700,
  message: "Parse error",
};
export const ERROR_INVALID_REQUEST: ResponseError<-32600> = {
  code: -32600,
  message: "Invalid Request",
};
export const ERROR_METHOD_NOT_FOUND: ResponseError<-32601> = {
  code: -32601,
  message: "Method not found",
};
export const ERROR_INVALID_PARAMS: ResponseError<-32602> = {
  code: -32602,
  message: "Invalid params",
};
export const ERROR_INTERNAL_ERROR: ResponseError<-32603> = {
  code: -32603,
  message: "Internal error",
};
