import { readLines } from "../utils.ts";
import { Transport } from "./types.ts";

export class DenoIO implements Transport {
  lines: AsyncIterableIterator<string>;
  writer: WritableStreamDefaultWriter<Uint8Array>;
  constructor({ reader, writer }: {
    reader: ReadableStream<Uint8Array>;
    writer: WritableStream<Uint8Array>;
  }) {
    this.lines = readLines(reader);
    this.writer = writer.getWriter();
  }
  async recv(): Promise<string | undefined> {
    const result = await this.lines.next();

    if (!result.done) {
      return result.value;
    }

    return undefined;
  }
  async send(data: string) {
    await this.writer.ready;
    await this.writer.write(new TextEncoder().encode(data + "\n"));
  }
  async close() {
    await this.writer.close();
  }
}
