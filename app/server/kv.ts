import { randomBytes } from "node:crypto";
import { Redis } from "@upstash/redis";

/**
 * Tiny key-value layer. Production: Upstash Redis (Vercel marketplace; env is injected as KV_REST_API_* or UPSTASH_*).
 * Without those variables (local scripts, `next dev`) it falls back to in-process memory, which is fine for one process
 * and silently wrong across serverless instances, so production must have Redis configured.
 */
const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = url && token ? new Redis({ url, token }) : null;

export const kvConfigured = redis !== null;
const mem = new Map<string, { v: unknown; exp: number }>();
const live = (k: string) => { const e = mem.get(k); if (!e) return undefined; if (e.exp && e.exp < Date.now()) { mem.delete(k); return undefined; } return e; };

export const kv = {
  async get<T>(key: string): Promise<T | null> {
    if (redis) return (await redis.get<T>(key)) ?? null;
    return (live(key)?.v as T) ?? null;
  },
  async set(key: string, value: unknown, ttlSec?: number): Promise<void> {
    if (redis) { await (ttlSec ? redis.set(key, value, { ex: ttlSec }) : redis.set(key, value)); return; }
    mem.set(key, { v: value, exp: ttlSec ? Date.now() + ttlSec * 1000 : 0 });
  },
  async del(key: string): Promise<void> {
    if (redis) { await redis.del(key); return; }
    mem.delete(key);
  },
  /** Set only if absent. Returns true if this call created the key. */
  async setNX(key: string, value: unknown, ttlSec: number): Promise<boolean> {
    if (redis) return (await redis.set(key, value, { nx: true, ex: ttlSec })) === "OK";
    if (live(key)) return false;
    mem.set(key, { v: value, exp: Date.now() + ttlSec * 1000 });
    return true;
  },
  /** Atomic counter; the TTL is applied when the key is first created (fixed window). */
  async incr(key: string, ttlSec?: number, by = 1): Promise<number> {
    if (redis) {
      const n = await redis.incrby(key, by);
      if (ttlSec && n === by) await redis.expire(key, ttlSec);
      return n;
    }
    const e = live(key);
    const n = ((e?.v as number) ?? 0) + by;
    mem.set(key, { v: n, exp: e?.exp ?? (ttlSec ? Date.now() + ttlSec * 1000 : 0) });
    return n;
  },
};

/** Fixed-window rate limit. Returns true when the caller is OVER the limit. */
export async function limited(key: string, max: number, windowSec: number): Promise<boolean> {
  return (await kv.incr(`rl:${key}`, windowSec)) > max;
}

/** Cross-instance mutex, so two serverless invocations never send from the same key at once (nonce races). */
export async function withLock<T>(name: string, fn: () => Promise<T>, waitMs = 40_000): Promise<T> {
  const id = randomBytes(8).toString("hex");
  const key = `lock:${name}`;
  const until = Date.now() + waitMs;
  while (!(await kv.setNX(key, id, 45))) {
    if (Date.now() > until) throw new Error(`busy: ${name}`);
    await new Promise((r) => setTimeout(r, 400));
  }
  try { return await fn(); }
  finally { if ((await kv.get<string>(key)) === id) await kv.del(key); }
}
