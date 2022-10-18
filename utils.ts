import { base64, io } from "./deps.ts";

const stdinLines = io.readLines(Deno.stdin);

export function urlBase64Encode(data: ArrayBuffer) {
  return base64.encode(data)
    .replaceAll("+", "_")
    .replaceAll("/", "-")
    .replaceAll("=", "");
}

export function urlBase64Decode(data: string) {
  return base64.decode(
    data
      .replaceAll("_", "+")
      .replaceAll("-", "/"),
  );
}

export async function readline() {
  for await (const line of stdinLines) {
    if (line !== "") {
      return line;
    }
  }
}
