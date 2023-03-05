import { io, writeAll } from "../../deps.ts";
import { Transport } from "./types.ts";

export class DenoIO implements Transport {
  lines: AsyncIterableIterator<string>;
  writer: Deno.Writer & Deno.Closer;
  constructor({ reader, writer }: {
    reader: Deno.Reader;
    writer: Deno.Writer & Deno.Closer;
  }) {
    this.lines = io.readLines(reader);
    this.writer = writer;
  }
  async recv(): Promise<string | undefined> {
    const result = await this.lines.next();

    if (!result.done) {
      return result.value;
    }

    return undefined;
  }
  async send(data: string) {
    await writeAll(
      this.writer,
      new TextEncoder().encode(data + "\n"),
    );
  }
  async close() {
    await this.writer.close();
  }
}
