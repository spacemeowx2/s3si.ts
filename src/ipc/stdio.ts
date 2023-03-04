/// <reference lib="deno.ns" />

import { io, writeAll } from "../../deps.ts";
import type { ExtractType } from "./types.ts";

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
    const result = await this.lines.next();

    if (!result.done) {
      return JSON.parse(result.value);
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
