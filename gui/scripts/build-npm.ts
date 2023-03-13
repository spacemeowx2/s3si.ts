import { build, emptyDir } from "https://deno.land/x/dnt@0.33.1/mod.ts";
import * as path from "https://deno.land/std@0.178.0/path/mod.ts";

const __dirname = path.resolve(path.dirname(path.fromFileUrl(import.meta.url)), '..');
const OUT_DIR = path.join(__dirname, "./packages/s3si-ts");

await emptyDir(OUT_DIR);

await build({
  entryPoints: [path.join(__dirname, "../src/app.ts")],
  outDir: OUT_DIR,
  shims: {
    // see JS docs for overview and more options
    deno: true,
  },
  package: {
    // package.json properties
    name: "s3si-ts",
    version: "0.1.0",
  },
  typeCheck: false,
  test: false,
  scriptModule: false,
});
