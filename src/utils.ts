import { APIError } from "./APIError.ts";
import { S3S_NAMESPACE } from "./constant.ts";
import { base64, io, uuid } from "../deps.ts";

const stdinLines = io.readLines(Deno.stdin);

export function urlBase64Encode(data: ArrayBuffer) {
  return base64.encode(data)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

export function urlBase64Decode(data: string) {
  return base64.decode(
    data
      .replaceAll("_", "/")
      .replaceAll("-", "+"),
  );
}

export async function readline() {
  for await (const line of stdinLines) {
    if (line !== "") {
      return line;
    }
  }
  throw new Error("EOF");
}

type PromiseReturnType<T> = T extends () => Promise<infer R> ? R : never;
export async function retry<F extends () => Promise<unknown>>(
  f: F,
  times = 2,
): Promise<PromiseReturnType<F>> {
  let lastError;
  for (let i = 0; i < times; i++) {
    try {
      return await f() as PromiseReturnType<F>;
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError;
}

const GLOBAL_CACHE: Record<string, { ts: number; value: unknown }> = {};
export function cache<F extends () => Promise<unknown>>(
  f: F,
  { key = f.name, expireIn = 3600 }: { key?: string; expireIn?: number } = {},
): () => Promise<PromiseReturnType<F>> {
  return async () => {
    const cached = GLOBAL_CACHE[key];
    if (cached && cached.ts + expireIn * 1000 > Date.now()) {
      return cached.value as PromiseReturnType<F>;
    }
    const value = await f();
    GLOBAL_CACHE[key] = {
      ts: Date.now(),
      value,
    };
    return value as PromiseReturnType<F>;
  };
}

export async function showError<T>(p: Promise<T>): Promise<T> {
  try {
    return await p;
  } catch (e) {
    if (e instanceof APIError) {
      console.error(
        `\n\nAPIError: ${e.message}`,
        "\nResponse: ",
        e.response,
        "\nBody: ",
        e.json,
      );
    } else {
      console.error(e);
    }
    throw e;
  }
}

/**
 * @param id id of VsHistoryDetail or CoopHistoryDetail
 * @param namespace uuid namespace
 * @returns
 */
export function gameId(
  id: string,
  namespace = S3S_NAMESPACE,
): Promise<string> {
  const fullId = base64.decode(id);
  const tsUuid = fullId.slice(fullId.length - 52, fullId.length);
  return uuid.v5.generate(namespace, tsUuid);
}

/**
 * @param id VsHistoryDetail id or CoopHistoryDetail id
 */
export function parseHistoryDetailId(id: string) {
  const plainText = new TextDecoder().decode(base64.decode(id));

  const vsRE =
    /VsHistoryDetail-([a-z0-9-]+):(\w+):(\d{8}T\d{6})_([0-9a-f-]{36})/;
  const coopRE = /CoopHistoryDetail-([a-z0-9-]+):(\d{8}T\d{6})_([0-9a-f-]{36})/;
  if (vsRE.test(plainText)) {
    const [, uid, listType, timestamp, uuid] = plainText.match(vsRE)!;

    return {
      type: "VsHistoryDetail",
      uid,
      listType,
      timestamp,
      uuid,
    };
  } else if (coopRE.test(plainText)) {
    const [, uid, timestamp, uuid] = plainText.match(coopRE)!;

    return {
      type: "CoopHistoryDetail",
      uid,
      timestamp,
      uuid,
    };
  } else {
    throw new Error(`Invalid ID: ${plainText}`);
  }
}

export const delay = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

export type RecoverableError = {
  name: string;
  is: (err: unknown) => boolean;
  recovery: () => Promise<void>;
  retryTimes?: number;
  delayTime?: number;
};
export async function retryRecoverableError<F extends () => Promise<unknown>>(
  f: F,
  ...errors: RecoverableError[]
): Promise<PromiseReturnType<F>> {
  const retryTimes: Record<string, number> = Object.fromEntries(
    errors.map(({ name, retryTimes }) => [name, retryTimes ?? 1]),
  );
  while (true) {
    try {
      return await f() as PromiseReturnType<F>;
    } catch (e) {
      const error = errors.find((error) => error.is(e));
      if (error) {
        if (retryTimes[error.name] > 0) {
          retryTimes[error.name]--;
          await error.recovery();
          await delay(error.delayTime ?? 1000);
          continue;
        }
      }
      throw e;
    }
  }
}
