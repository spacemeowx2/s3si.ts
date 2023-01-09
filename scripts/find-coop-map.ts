import { ExportedGame, FileExporter } from "../src/exporters/file.ts";
import { b64Number } from "../src/utils.ts";

const dirs = Deno.args;
const exporters = dirs.map((d) => new FileExporter(d));

const games: ExportedGame[] = [];

for (const e of exporters) {
  games.push(...await e.exportedGames({ type: "VsInfo" }));
  games.push(...await e.exportedGames({ type: "CoopInfo" }));
}

const events = new Map<number, string>();
const uniforms = new Map<number, string>();
const specials = new Map<string, string>();
const bosses = new Map<number, string>();

for (const game of games) {
  try {
    const data = await game.getContent();
    if (data.type === "CoopInfo") {
      const eventIds = data.detail.waveResults.map((i) => i.eventWave).filter(
        Boolean,
      ).map((i) => i!);
      for (const { id, name } of eventIds) {
        events.set(b64Number(id), name);
      }

      for (
        const { id, name } of [
          data.detail.myResult,
          ...data.detail.memberResults,
        ].map((i) => i.player.uniform)
      ) {
        uniforms.set(b64Number(id), name);
      }

      for (
        const { image: { url }, name } of data.detail.waveResults.flatMap((i) =>
          i.specialWeapons
        )
      ) {
        if (typeof url === "string") {
          const hash = /\/(\w+)_0\.\w+/.exec(url)?.[1];
          if (!hash) continue;
          specials.set(hash, name);
        }
      }

      for (const { id, name } of data.detail.enemyResults.map((i) => i.enemy)) {
        bosses.set(b64Number(id), name);
      }
    }
  } catch (e) {
    console.log("Failed to process file", game.filepath, e);
  }
}

console.log([...events.entries()].sort((a, b) => a[0] - b[0]));
console.log([...uniforms.entries()].sort((a, b) => a[0] - b[0]));
console.log([...specials.entries()]);
console.log([...bosses.entries()].sort((a, b) => a[0] - b[0]));
