import { BattleExporter, VsBattle } from "../types.ts";
import { base64, path } from "../deps.ts";
import { NSOAPP_VERSION, S3SI_VERSION } from "../constant.ts";

type FileExporterType = {
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
    const fullId = base64.decode(id);
    const ts = new TextDecoder().decode(
      fullId.slice(fullId.length - 52, fullId.length - 37),
    );

    if (!/\d{8}T\d{6}/.test(ts)) {
      throw new Error("Invalid battle ID");
    }

    return `${ts}Z.json`;
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
