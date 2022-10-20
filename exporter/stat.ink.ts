// deno-lint-ignore-file no-unused-vars require-await
import { USERAGENT } from "../constant.ts";
import { BattleExporter, VsHistoryDetail } from "../types.ts";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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
    await sleep(1000);
  }
  async getLatestBattleTime(): Promise<Date> {
    const uuids = await (await fetch("https://stat.ink/api/v3/s3s/uuid-list", {
      headers: this.requestHeaders(),
    })).json();
    console.log("\n\n uuid:", uuids);
    throw new Error("Not implemented");
  }
}
