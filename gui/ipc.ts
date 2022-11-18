/**
 * main process communicates with worker process via stdin/stdout
 */

import { io } from "../deps.ts";
import { writeAll } from "./deps.ts";

type ExtractType<T extends { type: string }, K extends T["type"]> = Extract<
  T,
  { type: K }
>;

export class IPC<T extends { type: string }> {
  lines: AsyncIterableIterator<string>;
  writer: Deno.Writer;
  constructor({ reader, writer }: {
    reader: Deno.Reader;
    writer: Deno.Writer;
  }) {
    this.lines = io.readLines(reader);
    this.writer = writer;
  }
  async recvType<K extends T["type"]>(
    type: K,
  ): Promise<ExtractType<T, K>> {
    const data = await this.recv();
    if (data.type !== type) {
      throw new Error(`Unexpected type: ${data.type}`);
    }
    return data as ExtractType<T, K>;
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
      new TextEncoder().encode(JSON.stringify(data) + "\n"),
    );
  }
}
