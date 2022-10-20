import { S3SI_NAMESPACE, USERAGENT } from "../constant.ts";
import { BattleExporter, VsHistoryDetail } from "../types.ts";
import { base64, msgpack, uuid } from "../deps.ts";
import { APIError } from "../APIError.ts";

const S3S_NAMESPACE = "b3a2dbf5-2c09-4792-b78c-00b548b70aeb";

/**
 * generate s3s uuid
 *
 * @param id ID from SplatNet3
 * @returns id generated from s3s
 */
function s3sUuid(id: string): Promise<string> {
  const fullId = base64.decode(id);
  const tsUuid = fullId.slice(fullId.length - 52, fullId.length);
  return uuid.v5.generate(S3S_NAMESPACE, tsUuid);
}

function battleId(id: string): Promise<string> {
  return uuid.v5.generate(S3SI_NAMESPACE, new TextEncoder().encode(id));
}

/**
 * Exporter to stat.ink.
 *
 * This is the default exporter. It will upload each battle detail to stat.ink.
 */
export class StatInkExporter implements BattleExporter<VsHistoryDetail> {
  name = "stat.ink";
  constructor(private statInkApiKey: string) {
    if (statInkApiKey.length !== 43) {
      throw new Error("Invalid stat.ink API key");
    }
  }
  requestHeaders() {
    return {
      "User-Agent": USERAGENT,
      "Authorization": `Bearer ${this.statInkApiKey}`,
    };
  }
  async exportBattle(detail: VsHistoryDetail) {
    const body = {
      test: "yes",
    };

    const resp = await fetch("https://stat.ink/api/v3/battle", {
      method: "POST",
      headers: {
        ...this.requestHeaders(),
        "Content-Type": "application/x-msgpack",
      },
      body: msgpack.encode(body),
    });

    if (resp.status !== 200 && resp.status !== 201) {
      throw new APIError({
        response: resp,
        message: "Failed to export battle",
      });
    }

    const json: {
      error?: unknown;
    } = await resp.json();

    if (json.error) {
      throw new APIError({
        response: resp,
        message: "Failed to export battle",
        json,
      });
    }

    throw new Error("abort");
  }
  async notExported(list: string[]): Promise<string[]> {
    const uuid = await (await fetch("https://stat.ink/api/v3/s3s/uuid-list", {
      headers: this.requestHeaders(),
    })).json();

    const out: string[] = [];

    for (const id of list) {
      const s3sId = await s3sUuid(id);
      const s3siId = await battleId(id);

      if (!uuid.includes(s3sId) && !uuid.includes(s3siId)) {
        out.push(id);
      }
    }

    return out;
  }
}
