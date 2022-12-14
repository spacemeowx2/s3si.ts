import { FileExporterType } from "../src/exporters/file.ts";
import { b64Number } from "../src/utils.ts";

const dirs = Deno.args;

const files: string[] = [];

for (const dir of dirs) {
  for await (const entry of Deno.readDir(dir)) {
    if (entry.isFile) {
      files.push(`${dir}/${entry.name}`);
    }
  }
}

const events = new Map<number, string>();
const uniforms = new Map<number, string>();
const specials = new Map<string, string>();
const bosses = new Map<number, string>();

for (const file of files) {
  try {
    const content: FileExporterType = JSON.parse(await Deno.readTextFile(file));
    if (content.type === "SUMMARY") continue;

    const { data } = content;
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
        if (typeof url === "object") {
          const hash = /\/(\w+)_0\.\w+/.exec(url.pathname)?.[1];
          if (!hash) continue;
          specials.set(hash, name);
        }
      }

      for (const { id, name } of data.detail.enemyResults.map((i) => i.enemy)) {
        bosses.set(b64Number(id), name);
      }
    }
  } catch (e) {
    console.log("Failed to process file", file, e);
  }
}

console.log([...events.entries()].sort((a, b) => a[0] - b[0]));
console.log([...uniforms.entries()].sort((a, b) => a[0] - b[0]));
console.log([...specials.entries()]);
console.log([...bosses.entries()].sort((a, b) => a[0] - b[0]));
