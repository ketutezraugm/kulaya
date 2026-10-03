import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname } from "node:path";

export const fs = {
  readJson<T>(path: string): T | null {
    return existsSync(path) ? (JSON.parse(readFileSync(path, "utf8")) as T) : null;
  },
  writeJson(path: string, data: unknown) {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, JSON.stringify(data, null, 2));
  },
};

/** Rupiah from IDRX units (2 decimals): 100_000_000n -> "Rp 1.000.000" */
export function rupiah(units: bigint): string {
  return "Rp " + (units / 100n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
