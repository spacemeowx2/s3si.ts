import * as path from "https://deno.land/std@0.213.0/path/mod.ts";
import { assertEquals } from "../dev_deps.ts";

if (import.meta.main) {
  const __dirname = path.dirname(path.fromFileUrl(import.meta.url));
  const TARGETS = [
    "x86_64-unknown-linux-gnu",
    "x86_64-pc-windows-msvc",
    "x86_64-apple-darwin",
    "aarch64-apple-darwin",
  ];
  const rustInfo = await (new Deno.Command("rustc", {
    args: ["-Vv"],
  })).output();
  const target =
    /host: (\S+)/g.exec(new TextDecoder().decode(rustInfo.stdout))?.[1] ?? "?";

  if (!TARGETS.includes(target)) {
    console.error(`Unsupported target: ${target}`);
    Deno.exit(1);
  }

  const p = new Deno.Command("deno", {
    args: [
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
  const status = await p.output();
  if (!status.success) {
    console.error(
      "Failed to run deno compile for target",
      target,
      "code:",
      status.code,
      "stderr:",
      new TextDecoder().decode(status.stderr),
    );
    Deno.exit(status.code);
  }

  const binPath = `${__dirname}/../gui/binaries/s3si-${target}${
    Deno.build.os === "windows" ? ".exe" : ""
  }`;
  console.log("Test the binary");
  const s3si = new Deno.Command(binPath, {
    stdin: "piped",
    stdout: "piped",
  }).spawn();
  const s3siWriter = s3si.stdin.getWriter();
  await s3siWriter.write(
    new TextEncoder().encode(
      '{"jsonrpc":"2.0","method":"hello","params":[],"id":1}\n',
    ),
  );

  const output = new TextDecoder().decode(
    (await s3si.stdout.getReader().read()).value,
  );
  await s3siWriter.close();

  assertEquals(
    output,
    '{"jsonrpc":"2.0","id":1,"result":{"result":"world"}}\n',
  );
  console.log("Test passed");

  const hashBuffer = await crypto.subtle.digest(
    "SHA-256",
    await Deno.readFile(binPath),
  );
  const hashArray = Array.from(new Uint8Array(hashBuffer));

  // 将 Uint8Array 转换为十六进制字符串形式的散列值
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join(
    "",
  );

  console.log("Hash:", hashHex);
}
