import * as path from "https://deno.land/std@0.178.0/path/mod.ts";

if (import.meta.main) {
  const __dirname = path.dirname(path.fromFileUrl(import.meta.url));
  const TARGETS = [
    "x86_64-unknown-linux-gnu",
    "x86_64-pc-windows-msvc",
    "x86_64-apple-darwin",
    "aarch64-apple-darwin",
  ];

  for (const target of TARGETS) {
    //deno compile --target=$target -o ./binaries/s3si-$target -A ../s3si.ts
    const p = Deno.run({
      cmd: [
        "deno",
        "compile",
        "--target",
        target,
        "-o",
        `../gui/binaries/s3si-${target}`,
        "-A",
        "../s3si.ts",
      ],
      cwd: __dirname,
    });
    const status = await p.status();
    if (!status.success) {
      console.error(
        "Failed to run deno compile for target",
        target,
        "code:",
        status.code,
      );
      Deno.exit(status.code);
    }
  }
}
