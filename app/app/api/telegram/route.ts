import { after } from "next/server";
import { timingSafeEqual } from "node:crypto";
import type { Update } from "grammy/types";
import { getRuntime, json } from "@/server/runtime";
import { handleTelegramUpdate } from "@/server/telegram";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

/** Telegram webhook. Acknowledge immediately (Telegram retries slow replies) and do the AI work after the response. */
export async function POST(req: Request) {
  const secret = getRuntime().cfg.TELEGRAM_WEBHOOK_SECRET;
  if (!secret || !same(req.headers.get("x-telegram-bot-api-secret-token") ?? "", secret)) return json({ error: "forbidden" }, 403);
  const update = (await req.json()) as Update;
  after(() => handleTelegramUpdate(update).catch((e) => console.error("update failed:", String(e.message).split("\n")[0])));
  return json({ ok: true });
}
