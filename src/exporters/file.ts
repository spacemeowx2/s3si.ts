import {
  CoopInfo,
  ExportResult,
  Game,
  GameExporter,
  Summary,
  VsInfo,
} from "../types.ts";
import { path } from "../../deps.ts";
import { NSOAPP_VERSION, S3SI_VERSION } from "../constant.ts";
import { parseHistoryDetailId, urlSimplify } from "../utils.ts";

export type FileExporterTypeCommon = {
  nsoVersion: string;
  s3siVersion: string;
  exportTime: string;
};

export type FileExporterType =
  & ({
    type: "VS";
    data: VsInfo;
  } | {
    type: "COOP";
    data: CoopInfo;
  } | {
    type: "SUMMARY";
    data: Summary;
  })
  & FileExporterTypeCommon;

/**
 * Don't save url in exported file
 */
function replacer(key: string, value: unknown): unknown {
  if (!["url", "maskImageUrl", "overlayImageUrl"].includes(key)) {
    return value;
  }

  return typeof value === "string" ? urlSimplify(value) : undefined;
}

/**
 * Exporter to file.
 *
 * This is useful for debugging. It will write each battle detail to a file.
 * Timestamp is used as filename. Example: 20210101T000000Z.json
 */
export class FileExporter implements GameExporter {
  name = "file";
  constructor(private exportPath: string) {
  }
  getFilenameById(id: string) {
    const { uid, timestamp } = parseHistoryDetailId(id);

    return `${uid}_${timestamp}Z.json`;
  }
  /**
   * Get all exported files
   */
  async exportedGames(
    { uid, type }: { uid: string; type: Game["type"] },
  ): Promise<{ id: string; getContent: () => Promise<Game> }[]> {
    const out: { id: string; filepath: string; timestamp: string }[] = [];

    for await (const entry of Deno.readDir(this.exportPath)) {
      const filename = entry.name;
      const [fileUid, timestamp] = filename.split("_", 2);
      if (!entry.isFile || fileUid !== uid) {
        continue;
      }

      const filepath = path.join(this.exportPath, filename);
      const content = await Deno.readTextFile(filepath);
      const body = JSON.parse(content) as FileExporterType;

      if (body.type === "SUMMARY") {
        continue;
      }
      if (body.type === "VS" && type === "VsInfo") {
        out.push({
          id: body.data.detail.id,
          filepath,
          timestamp,
        });
      } else if (body.type === "COOP" && type === "CoopInfo") {
        out.push({
          id: body.data.detail.id,
          filepath,
          timestamp,
        });
      }
    }

    return out.sort((a, b) => b.timestamp.localeCompare(a.timestamp)).map((
      { id, filepath },
    ) => ({
      id,
      getContent: async () => {
        const content = await Deno.readTextFile(filepath);
        const body = JSON.parse(content) as FileExporterType;

        // summary is excluded
        return body.data as Game;
      },
    }));
  }
  async exportSummary(summary: Summary): Promise<ExportResult> {
    const filename = `${summary.uid}_summary.json`;
    const filepath = path.join(this.exportPath, filename);

    const body: FileExporterType = {
      type: "SUMMARY",
      nsoVersion: NSOAPP_VERSION,
      s3siVersion: S3SI_VERSION,
      exportTime: new Date().toISOString(),
      data: summary,
    };

    await Deno.writeTextFile(
      filepath,
      JSON.stringify({
        body,
      }),
    );

    return {
      status: "success",
      url: filepath,
    };
  }
  async exportGame(info: Game): Promise<ExportResult> {
    await Deno.mkdir(this.exportPath, { recursive: true });

    const filename = this.getFilenameById(info.detail.id);
    const filepath = path.join(this.exportPath, filename);

    const common: FileExporterTypeCommon = {
      nsoVersion: NSOAPP_VERSION,
      s3siVersion: S3SI_VERSION,
      exportTime: new Date().toISOString(),
    };
    const dataType = info.type === "VsInfo"
      ? {
        type: "VS" as const,
        data: info,
      }
      : {
        type: "COOP" as const,
        data: info,
      };
    const body: FileExporterType = {
      ...common,
      ...dataType,
    };

    await Deno.writeTextFile(
      filepath,
      JSON.stringify(body, replacer),
    );

    return {
      status: "success",
      url: filepath,
    };
  }
  async notExported({ list }: { list: string[] }): Promise<string[]> {
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
