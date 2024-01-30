import { io } from "../../deps.ts";
import { Transport } from "./types.ts";

export class DenoIO implements Transport {
  lines: AsyncIterableIterator<string>;
  writer: WritableStream<Uint8Array>;
  constructor({ reader, writer }: {
    reader: ReadableStream<Uint8Array>;
    writer: WritableStream<Uint8Array>;
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
