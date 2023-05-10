import { build, emptyDir } from "https://deno.land/x/dnt@0.33.1/mod.ts";

await emptyDir("./npm");

await build({
  entryPoints: ["./src/lib.ts"],
  test: false,
  typeCheck: false,
  outDir: "./npm",
  shims: {
    // see JS docs for overview and more options
    deno: true,
  },
  package: {
    // package.json properties
    name: "s3si-core",
    version: "0.1.0",
    description: "s3si core library",
    license: "MIT",
    repository: {
      type: "git",
      url: "git+https://github.com/spacemeowx2/s3si.ts.git",
    },
    bugs: {
      url: "https://github.com/spacemeowx2/s3si.ts/issues",
    },
  },
  compilerOptions: {
    lib: ["dom"],
  },
  mappings: {
    "./deps.ts": "./deps.node.ts",
    "./src/env/runtime.ts": "./src/env/runtime.node.ts",
  },
  postBuild() {
    // steps to run after building and before running the tests
    Deno.copyFileSync("LICENSE", "npm/LICENSE");
    Deno.copyFileSync("README.md", "npm/README.md");
  },
});
