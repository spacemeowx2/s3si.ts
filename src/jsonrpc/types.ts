export type LoginState = {
  sessionToken?: string;
  gToken?: string;
  bulletToken?: string;
};
export type RankState = {
  // generated by gameId(battle.id)
  gameId: string;
  // extract from battle.id
  timestamp?: number;
  // C-, B, A+, S, S+0, S+12
  rank: string;
  rankPoint: number;
};
export type State = {
  loginState?: LoginState;
  fGen: string;
  appUserAgent?: string;
  userLang?: string;
  userCountry?: string;

  rankState?: RankState;

  cacheDir: string;

  // Exporter config
  statInkApiKey?: string;
  fileExportPath: string;
  monitorInterval: number;
};

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
  result: Result;
  error?: undefined;
} | {
  result?: undefined;
  error: Error;
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

export type LoggerLevel = "debug" | "log" | "warn" | "error";

export type Log = {
  level: LoggerLevel;
  msg: unknown[];
};

export type ExportOpts = {
  exporter: string;
  monitor: boolean;
  withSummary: boolean;
  skipMode?: string;
};

export interface S3SIService {
  loginSteps(): Promise<
    RPCResult<
      {
        authCodeVerifier: string;
        url: string;
      }
    >
  >;
  loginSteps(step2: {
    authCodeVerifier: string;
    login: string;
  }): Promise<
    RPCResult<
      {
        sessionToken: string;
      }
    >
  >;
  getLogs(): Promise<RPCResult<Log[]>>;
  run(state: State, opts: ExportOpts): Promise<RPCResult<State>>;
  // deno-lint-ignore no-explicit-any
  [key: string]: any;
}
