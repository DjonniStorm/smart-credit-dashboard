import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, normalize } from "node:path";
import type { Env } from "../config/env.schema.ts";

/** Local filesystem adapter for development; production maps the same API to S3/MinIO. */
@Injectable()
export class StorageService {
  private readonly root: string;

  constructor(config: ConfigService<Env, true>) {
    this.root = config.getOrThrow("STORAGE_ROOT", { infer: true });
  }

  async put(key: string, data: Buffer): Promise<{ key: string; size: number }> {
    const path = this.safePath(key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, data, { flag: "wx" }).catch(async (error: unknown) => {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      await writeFile(path, data);
    });
    return { key, size: data.byteLength };
  }

  async get(key: string): Promise<Buffer> {
    return readFile(this.safePath(key));
  }

  private safePath(key: string): string {
    const clean = normalize(key).replace(/^([.][.][/\\])+/, "");
    if (!clean || clean.startsWith("..") || clean.includes("\0")) throw new BadRequestException("Некорректный ключ файла");
    return join(this.root, clean);
  }
}
