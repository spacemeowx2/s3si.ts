import * as path from "https://deno.land/std@0.178.0/path/mod.ts";
import { assertEquals } from "../dev_deps.ts";

if (import.meta.main) {
  const __dirname = path.dirname(path.fromFileUrl(import.meta.url));
  const TARGETS = [
    "x86_64-unknown-linux-gnu",
    "x86_64-pc-windows-msvc",
    "x86_64-apple-darwin",
    "aarch64-apple-darwin",
  ];
  const rustInfo = new TextDecoder().decode(
    await Deno.run({
      cmd: ["rustc", "-Vv"],
      stdout: "piped",
    }).output(),
  );
  const target = /host: (\S+)/g.exec(rustInfo)?.[1] ?? "?";

  if (!TARGETS.includes(target)) {
    console.error(`Unsupported target: ${target}`);
    Deno.exit(1);
  }

  const p = Deno.run({
    cmd: [
      "deno",
      "compile",
      "--target",
      target,
      "-o",
      `../gui/binaries/s3si-${target}`,
      "-A",
      "../src/daemon.ts",
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

  console.log("Test the binary");
  const s3si = Deno.run({
    cmd: [
      `${__dirname}/../gui/binaries/s3si-${target}${
        Deno.build.os === "windows" ? ".exe" : ""
      }`,
    ],
    stdin: "piped",
    stdout: "piped",
  });
  await s3si.stdin?.write(
    new TextEncoder().encode(
      '{"jsonrpc":"2.0","method":"hello","params":[],"id":1}\n',
    ),
  );
  s3si.stdin?.close();
  const output = new TextDecoder().decode(await s3si.output());

  assertEquals(
    output,
    '{"jsonrpc":"2.0","id":1,"result":{"result":"world"}}\n',
  );
  console.log("Test passed");
}
