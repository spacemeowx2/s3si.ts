import { BattleExporter, VsBattle } from "../types.ts";
import { path } from "../../deps.ts";
import { NSOAPP_VERSION, S3SI_VERSION } from "../constant.ts";
import { parseVsHistoryDetailId } from "../utils.ts";

export type FileExporterType = {
  type: "VS" | "COOP";
  nsoVersion: string;
  s3siVersion: string;
  exportTime: string;
  data: VsBattle;
};

/**
 * Don't save url in exported file
 */
function replacer(key: string, value: unknown): unknown {
  return ["url", "maskImageUrl", "overlayImageUrl"].includes(key)
    ? undefined
    : value;
}

/**
 * Exporter to file.
 *
 * This is useful for debugging. It will write each battle detail to a file.
 * Timestamp is used as filename. Example: 20210101T000000Z.json
 */
export class FileExporter implements BattleExporter<VsBattle> {
  name = "file";
  constructor(private exportPath: string) {
  }
  getFilenameById(id: string) {
    const { uid, timestamp } = parseVsHistoryDetailId(id);

    return `${uid}_${timestamp}Z.json`;
  }
  async exportBattle(battle: VsBattle) {
    await Deno.mkdir(this.exportPath, { recursive: true });

    const filename = this.getFilenameById(battle.detail.id);
    const filepath = path.join(this.exportPath, filename);

    const body: FileExporterType = {
      type: "VS",
      nsoVersion: NSOAPP_VERSION,
      s3siVersion: S3SI_VERSION,
      exportTime: new Date().toISOString(),
      data: battle,
    };

    await Deno.writeTextFile(
      filepath,
      JSON.stringify(body, replacer),
    );
  }
  async notExported(list: string[]): Promise<string[]> {
    const out: string[] = [];

    for (const id of list) {
      const filename = this.getFilenameById(id);
      const filepath = path.join(this.exportPath, filename);
      const isFile = await Deno.stat(filepath).then((f) => f.isFile).catch(() =>
        false
      );
      if (!isFile) {
        out.push(id);
      }
    }

    return out;
  }
}
