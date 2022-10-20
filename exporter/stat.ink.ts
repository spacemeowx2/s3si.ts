import { BattleExporter, VsHistoryDetail } from "../types.ts";

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
  async exportBattle(detail: VsHistoryDetail) {
    throw new Error("Function not implemented.");
  }
  async getLatestBattleTime() {
    return new Date();
  }
}
