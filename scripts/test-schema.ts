import { ExportedGame, FileExporter } from "../src/exporters/file.ts";
import { validateVsHistoryDetail } from "../src/schemas/splatnet3.ts";

const dirs = Deno.args;
const exporters = dirs.map((d) => new FileExporter(d));

const games: ExportedGame[] = [];

for (const e of exporters) {
  games.push(...await e.exportedGames({ type: "VsInfo" }));
}

for (const game of games) {
  try {
    const data = await game.getContent();
    if (data.type !== "VsInfo") {
      continue;
    }
    const { detail } = data;
    if (!validateVsHistoryDetail(detail)) {
      console.log(
        `Failed to validate battle detail`,
        game.filepath,
        validateVsHistoryDetail.errors,
      );
    }
  } catch (e) {
    console.log("Failed to process file", game.id, e);
  }
}
