// deno-lint-ignore-file require-await
import { path } from "../deps.ts";

export type Cache = {
  read: <T>(key: string) => Promise<T | undefined>;
  write: <T>(key: string, value: T) => Promise<void>;
};

export class MemoryCache implements Cache {
  private cache: Record<string, unknown> = {};

  async read<T>(key: string): Promise<T | undefined> {
    return this.cache[key] as T;
  }

  async write<T>(key: string, value: T): Promise<void> {
    this.cache[key] = value;
  }
}

/**
 * File Cache stores data in a folder. Each file is named by the sha256 of its key.
 */
export class FileCache implements Cache {
  constructor(private path: string) {}

  private async getPath(key: string): Promise<string> {
    await Deno.mkdir(this.path, { recursive: true });

    const hash = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(key),
    );
    const hashHex = Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    return path.join(this.path, hashHex);
  }

  async read<T>(key: string): Promise<T | undefined> {
    const path = await this.getPath(key);
    try {
      const data = await Deno.readTextFile(path);
      return JSON.parse(data);
    } catch (e) {
      if (e instanceof Deno.errors.NotFound) {
        return undefined;
      }
      throw e;
    }
  }

  async write<T>(key: string, value: T): Promise<void> {
    const path = await this.getPath(key);
    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify(value));
    const swapPath = `${path}.swap`;
    await Deno.writeFile(swapPath, data);
    await Deno.rename(swapPath, path);
  }
}
