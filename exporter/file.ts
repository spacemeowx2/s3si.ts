import { BattleExporter, VsHistoryDetail } from "../types.ts";
import { datetime, path } from "../deps.ts";
import { NSOAPP_VERSION, S3SI_VERSION } from "../constant.ts";
const FILENAME_FORMAT = "yyyyMMddHHmmss";

type FileExporterType = {
  type: "VS" | "COOP";
  nsoVersion: string;
  s3siVersion: string;
  exportTime: string;
  data: VsHistoryDetail;
};

/**
 * Exporter to file.
 *
 * This is useful for debugging. It will write each battle detail to a file.
 * Timestamp is used as filename. Example: 2021-01-01T00:00:00.000Z.json
 */
export class FileExporter implements BattleExporter<VsHistoryDetail> {
  name = "file";
  constructor(private exportPath: string) {
  }
  async exportBattle(detail: VsHistoryDetail) {
    await Deno.mkdir(this.exportPath, { recursive: true });

    const playedTime = new Date(detail.playedTime);
    const filename = `${datetime.format(playedTime, FILENAME_FORMAT)}.json`;
    const filepath = path.join(this.exportPath, filename);

    const body: FileExporterType = {
      type: "VS",
      nsoVersion: NSOAPP_VERSION,
      s3siVersion: S3SI_VERSION,
      exportTime: new Date().toISOString(),
      data: detail,
    };

    await Deno.writeTextFile(filepath, JSON.stringify(body));
  }
  async notExported(list: string[]): Promise<string[]> {
    const out: string[] = [];

    for (const id of list) {
      const filename = `${id}.json`;
      const filepath = path.join(this.exportPath, filename);
      const isFile = await Deno.stat(filepath).then((f) => f.isFile).catch(() =>
        false
      );
      if (isFile) {
        out.push(id);
      }
    }

    return out;
  }
}
