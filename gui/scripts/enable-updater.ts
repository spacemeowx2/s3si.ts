import * as path from "https://deno.land/std@0.178.0/path/mod.ts";

if (import.meta.main) {
  const __dirname = path.dirname(path.fromFileUrl(import.meta.url));
  const tauriConf = path.join(__dirname, '../src-tauri/tauri.conf.json');
  const tauriConfContent = await Deno.readTextFile(tauriConf);
  const tauriConfJson = JSON.parse(tauriConfContent);
  tauriConfJson.tauri.updater.active = true;
  await Deno.writeTextFile(tauriConf, JSON.stringify(tauriConfJson, null, 2));
}
