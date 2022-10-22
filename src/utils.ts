import { APIError } from "./APIError.ts";
import { S3SI_NAMESPACE } from "./constant.ts";
import { base64, io, uuid } from "../deps.ts";

const stdinLines = io.readLines(Deno.stdin);

export function urlBase64Encode(data: ArrayBuffer) {
  return base64.encode(data)
    .replaceAll("+", "_")
    .replaceAll("/", "-")
    .replaceAll("=", "");
}

export function urlBase64Decode(data: string) {
  return base64.decode(
    data
      .replaceAll("_", "+")
      .replaceAll("-", "/"),
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

export async function showError(p: Promise<void>) {
  try {
    await p;
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
 * @param id id of VeVsHistoryDetail
 * @param namespace uuid namespace
 * @returns
 */
export function battleId(
  id: string,
  namespace = S3SI_NAMESPACE,
): Promise<string> {
  const fullId = base64.decode(id);
  const tsUuid = fullId.slice(fullId.length - 52, fullId.length);
  return uuid.v5.generate(namespace, tsUuid);
}

export function parseVsHistoryDetailId(id: string) {
  const plainText = new TextDecoder().decode(base64.decode(id));

  const re = /VsHistoryDetail-([a-z0-9-]+):(\w+):(\d{8}T\d{6})_([0-9a-f-]{36})/;
  if (!re.test(plainText)) {
    throw new Error(`Invalid battle ID: ${plainText}`);
  }

  const [, uid, listType, timestamp, uuid] = plainText.match(re)!;

  return {
    uid,
    listType,
    timestamp,
    uuid,
  };
}

export const delay = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));
