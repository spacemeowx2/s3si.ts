import { ExportedGame, FileExporter } from "../src/exporters/file.ts";
import {
  validateCoopHistoryDetail,
  validateVsHistoryDetail,
} from "../src/schemas/splatnet3.ts";

const dirs = Deno.args;
const exporters = dirs.map((d) => new FileExporter(d));

const games: ExportedGame[] = [];

for (const e of exporters) {
  games.push(...await e.exportedGames({ type: "VsInfo" }));
  games.push(...await e.exportedGames({ type: "CoopInfo" }));
}

for (const game of games) {
  try {
    const data = await game.getContent();
    if (data.type === "VsInfo") {
      const { detail } = data;
      if (!validateVsHistoryDetail(detail)) {
        console.log(
          `Failed to validate battle detail`,
          game.filepath,
          validateVsHistoryDetail.errors,
        );
      }
    } else if (data.type === "CoopInfo") {
      const { detail } = data;
      if (!validateCoopHistoryDetail(detail)) {
        console.log(
          `Failed to validate coop battle detail`,
          game.filepath,
          validateCoopHistoryDetail.errors,
        );
      }
    }
  } catch (e) {
    console.log("Failed to process file", game.filepath, e);
  }
}
