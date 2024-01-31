import { base64 } from "../deps.ts";
import { FileExporterType } from "../src/exporters/file.ts";

const dirs = Deno.args;

const files: string[] = [];

for (const dir of dirs) {
  for await (const entry of Deno.readDir(dir)) {
    if (entry.isFile) {
      files.push(`${dir}/${entry.name}`);
    }
  }
}

const ids = new Map<string, string>();

for (const file of files) {
  try {
    const content: FileExporterType = JSON.parse(await Deno.readTextFile(file));
    if (content.type === "SUMMARY") continue;
    const id = content.data.detail.id;
    const rawId = base64.decodeBase64(id);
    const uuid = new TextDecoder().decode(rawId.slice(rawId.length - 36));
    if (ids.has(uuid)) {
      console.log(
        `Duplicate: ${uuid}:${id} in ${file} and ${uuid}:${ids.get(uuid)}`,
      );
    }
    ids.set(uuid, id);
  } catch (e) {
    console.log("Failed to process file", file, e);
  }
}
