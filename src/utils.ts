import { APIError } from "./APIError.ts";
import {
  BATTLE_NAMESPACE,
  COOP_NAMESPACE,
  S3SI_NAMESPACE,
} from "./constant.ts";
import { base64, uuid } from "../deps.ts";
import { Env } from "./env.ts";
import { io } from "../deps.ts";

const stdinLines = io.readLines(Deno.stdin);
export async function readline(
  { skipEmpty = true }: { skipEmpty?: boolean } = {},
) {
  for await (const line of stdinLines) {
    if (!skipEmpty || line !== "") {
      return line;
    }
  }
  throw new Error("EOF");
}

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

export async function showError<T>(env: Env, p: Promise<T>): Promise<T> {
  try {
    return await p;
  } catch (e) {
    if (e instanceof APIError) {
      env.logger.error(
        `\n\nAPIError: ${e.message}`,
        "\nResponse: ",
        e.response,
        "\nBody: ",
        e.json,
      );
    } else {
      env.logger.error(e);
    }
    throw e;
  }
}

/**
 * @param id id of VsHistoryDetail or CoopHistoryDetail
 * @returns
 */
export function gameId(
  id: string,
): Promise<string> {
  const parsed = parseHistoryDetailId(id);
  if (parsed.type === "VsHistoryDetail") {
    const content = new TextEncoder().encode(
      `${parsed.timestamp}_${parsed.uuid}`,
    );
    return uuid.v5.generate(BATTLE_NAMESPACE, content);
  } else if (parsed.type === "CoopHistoryDetail") {
    return uuid.v5.generate(COOP_NAMESPACE, base64.decode(id));
  } else {
    throw new Error("Unknown type");
  }
}

export function s3siGameId(id: string) {
  const fullId = base64.decode(id);
  const tsUuid = fullId.slice(fullId.length - 52, fullId.length);
  return uuid.v5.generate(S3SI_NAMESPACE, tsUuid);
}

/**
 * https://github.com/spacemeowx2/s3si.ts/issues/45
 *
 * @param id id of CoopHistoryDetail
 * @returns uuid used in stat.ink
 */
export function s3sCoopGameId(id: string) {
  const fullId = base64.decode(id);
  const tsUuid = fullId.slice(fullId.length - 52, fullId.length);
  return uuid.v5.generate(COOP_NAMESPACE, tsUuid);
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
    } as const;
  } else if (coopRE.test(plainText)) {
    const [, uid, timestamp, uuid] = plainText.match(coopRE)!;

    return {
      type: "CoopHistoryDetail",
      uid,
      timestamp,
      uuid,
    } as const;
  } else {
    throw new Error(`Invalid ID: ${plainText}`);
  }
}

export const delay = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Decode ID and get number after '-'
 */
export function b64Number(id: string): number {
  const text = new TextDecoder().decode(base64.decode(id));
  const [_, num] = text.split("-");
  return parseInt(num);
}

export function nonNullable<T>(v: T | null | undefined): v is T {
  return v !== null && v !== undefined;
}

/**
 * Only preserve the pathname of the URL
 * @param url A url
 */
export function urlSimplify(url: string): { pathname: string } | string {
  try {
    const { pathname } = new URL(url);
    return { pathname };
  } catch (_e) {
    return url;
  }
}

export const battleTime = (id: string) => {
  const { timestamp } = parseHistoryDetailId(id);

  const dateStr = timestamp.replace(
    /(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/,
    "$1-$2-$3T$4:$5:$6Z",
  );

  return new Date(dateStr);
};
