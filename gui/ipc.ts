/**
 * main process communicates with worker process via stdin/stdout
 */

import { io } from "../deps.ts";
import { writeAll } from "./deps.ts";

export class IPC<T> {
  lines: AsyncIterableIterator<string>;
  writer: Deno.Writer;
  constructor({ reader, writer }: {
    reader: Deno.Reader;
    writer: Deno.Writer;
  }) {
    this.lines = io.readLines(reader);
    this.writer = writer;
  }
  async recv(): Promise<T> {
    for await (const line of this.lines) {
      return JSON.parse(line);
    }
    throw new Error("EOF");
  }
  async send(data: T) {
    await writeAll(
      this.writer,
      new TextEncoder().encode(JSON.stringify(data)),
    );
  }
}
