import { Api, Bot, InputFile, InlineKeyboard } from "grammy";
import type { Update } from "grammy/types";
import QRCode from "qrcode";
import { getFacts } from "./chain";
import { runAgent, type UserInput } from "./agent";
import { transcribe } from "./llm";
import { store } from "./store";
import { kv } from "./kv";
import { rupiah } from "./util";
import { getRuntime } from "./runtime";

const MAX_VOICE_BYTES = 1_000_000;
let bot: Bot | null = null;

function build(): Bot {
  const { cfg, chain, llm } = getRuntime();
  const b = new Bot(cfg.TELEGRAM_BOT_TOKEN);

  const linkPrompt = async (tgId: string) => {
    const url = `${cfg.APP_URL}/onboard?code=${await store.newLinkCode(tgId)}`;
    return { text: "Hubungkan dompet toko Anda dulu (berlaku 15 menit). Tidak perlu BNB untuk gas.", kb: new InlineKeyboard().url("Hubungkan dompet", url) };
  };

  b.command("start", async (ctx) => {
    const tg = String(ctx.from?.id);
    await ctx.reply("Halo! Saya Kulaya 👋\nCatat penjualan, terima pembayaran QR, dan dapatkan modal usaha tanpa agunan: cukup ngobrol dengan saya (teks atau voice note).");
    if (!(await store.linkedAddress(tg))) { const l = await linkPrompt(tg); await ctx.reply(l.text, { reply_markup: l.kb }); }
    else await ctx.reply("Dompet Anda sudah terhubung. Coba tanya: \"Gimana penjualan saya minggu ini?\"");
  });

  b.command("link", async (ctx) => { const l = await linkPrompt(String(ctx.from?.id)); await ctx.reply(l.text, { reply_markup: l.kb }); });

  b.command("status", async (ctx) => {
    const addr = await store.linkedAddress(String(ctx.from?.id));
    if (!addr) return ctx.reply("Belum terhubung. Ketik /link");
    const f = await getFacts(chain, addr);
    await ctx.reply(`Pelanggan: ${f.payers}\nOmzet terverifikasi: ${rupiah(f.trailingRevenue)}\nBatas pinjaman: ${rupiah(f.creditLimit)}\nTier: ${f.tier}${f.openLoan ? `\nPinjaman ${f.openLoan.status}: ${rupiah(f.openLoan.repaid)} / ${rupiah(f.openLoan.total)}` : ""}\nDashboard: ${cfg.APP_URL}/m/${addr}`);
  });

  async function handle(ctx: any, input: UserInput) {
    const tg = String(ctx.from?.id);
    const merchant = await store.linkedAddress(tg);
    if (!merchant) { const l = await linkPrompt(tg); return ctx.reply(l.text, { reply_markup: l.kb }); }
    await ctx.replyWithChatAction("typing");
    try {
      const r = await runAgent(llm, { chain, merchant, sandbox: false }, await store.history(tg), input);
      await store.saveHistory(tg, r.history);
      await ctx.reply(r.text, r.loan ? { reply_markup: new InlineKeyboard().url("Lihat & setujui pinjaman", r.loan.acceptUrl) } : undefined);
      for (const p of r.paymentLinks) {
        const png = await QRCode.toBuffer(p.url, { width: 512, margin: 2 });
        await ctx.replyWithPhoto(new InputFile(png), { caption: `Bayar ${rupiah(BigInt(p.amountRupiah) * 100n)} ke toko Anda.\nScan dengan kamera HP, lalu bayar dengan dompet kripto atau pilih "demo wallet". Ini bukan QRIS, jadi OVO/GoPay belum bisa.\n${p.url}` });
      }
    } catch (e) {
      console.error("agent error:", (e as Error).message.split("\n")[0]);
      await ctx.reply("Maaf, sedang ada gangguan. Coba lagi sebentar ya.");
    }
  }

  b.on("message:text", (ctx) => handle(ctx, { text: ctx.message.text.slice(0, 1000) }));

  b.on("message:voice", async (ctx) => {
    const v = ctx.message.voice;
    if (v.duration > 60 || (v.file_size ?? 0) > MAX_VOICE_BYTES) return ctx.reply("Voice note terlalu panjang (maks 60 detik).");
    const file = await ctx.api.getFile(v.file_id);
    const buf = Buffer.from(await (await fetch(`https://api.telegram.org/file/bot${cfg.TELEGRAM_BOT_TOKEN}/${file.file_path}`)).arrayBuffer());
    // Speech-to-text first when we can (cheap, works with any LLM); otherwise hand the audio to a model that accepts it.
    // Either way it is untrusted input, exactly like typed text: it only ever reaches the model as a user message.
    const text = await transcribe(cfg.GROQ_API_KEY, buf, "audio/ogg");
    await handle(ctx, text ? { text: `(voice note) ${text.slice(0, 1000)}` } : { audio: { mime: "audio/ogg", data: buf.toString("base64") }, text: "(voice note from the shop owner: transcribe and act on it)" });
  });

  b.catch((e) => console.error("telegram error:", String(e.message).split("\n")[0]));
  return b;
}

/** Process one Telegram update. Telegram redelivers on slow replies, so each update id is handled at most once. */
export async function handleTelegramUpdate(update: Update): Promise<void> {
  if (!(await kv.setNX(`tgupd:${update.update_id}`, 1, 3600))) return;
  bot ??= build();
  await bot.init();
  await bot.handleUpdate(update);
}

export function notifyLinked(tgId: string, address: string) {
  const { cfg } = getRuntime();
  return new Api(cfg.TELEGRAM_BOT_TOKEN).sendMessage(tgId, `✅ Dompet ${address.slice(0, 6)}…${address.slice(-4)} terhubung. Coba ketik: "Gimana penjualan saya?"`).catch(() => {});
}
