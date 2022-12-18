import SCHEMA from "../src/schemas/splatnet3.jtd.ts";
import { main } from "https://deno.land/x/jtd_codegen_cli@v0.1.3/mod.ts";
import { path } from "../deps.ts";

const PROJECT_DIR = path.resolve(
  path.fromFileUrl(path.dirname(
    import.meta.url,
  )),
  "..",
);

const generated = path.join(PROJECT_DIR, "./src/generated");
const outDir = path.join(generated, "splatnet3");

await Deno.mkdir(generated, { recursive: true });
await Deno.mkdir(outDir, { recursive: true });

const filename = path.join(generated, "splatnet3.jtd.json");
await Deno.writeTextFile(filename, JSON.stringify(SCHEMA, null, 2));
await main({
  args: [filename, "--typescript-out", outDir],
  env: {},
});
