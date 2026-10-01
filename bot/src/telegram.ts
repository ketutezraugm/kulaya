import { Bot, InputFile, InlineKeyboard } from "grammy";
import type { Content, Part } from "@google/genai";
import QRCode from "qrcode";
import type { Chain } from "./chain.js";
import { getFacts } from "./chain.js";
import { runAgent, type Model } from "./agent.js";
import { store } from "./store.js";
import { rupiah } from "./util.js";

const history = new Map<string, Content[]>(); // ponytail: in-memory chat memory, lost on restart. Fine for a demo.
const MAX_VOICE_BYTES = 1_000_000;

export function makeBot(chain: Chain, model: Model) {
  const { cfg } = chain;
  const bot = new Bot(cfg.TELEGRAM_BOT_TOKEN);

  const linkPrompt = (tgId: string) => {
    const url = `${cfg.APP_URL}/onboard?code=${store.newLinkCode(tgId)}`;
    return { text: "Hubungkan dompet toko Anda dulu (berlaku 15 menit). Tidak perlu BNB untuk gas.", kb: new InlineKeyboard().url("Hubungkan dompet", url) };
  };

  bot.command("start", async (ctx) => {
    const tg = String(ctx.from?.id);
    await ctx.reply("Halo! Saya Warung Agent 👋\nCatat penjualan, terima pembayaran QR, dan dapatkan modal usaha tanpa agunan: cukup ngobrol dengan saya (teks atau voice note).");
    if (!store.linkedAddress(tg)) { const l = linkPrompt(tg); await ctx.reply(l.text, { reply_markup: l.kb }); }
    else await ctx.reply("Dompet Anda sudah terhubung. Coba tanya: \"Gimana penjualan saya minggu ini?\"");
  });

  bot.command("link", async (ctx) => { const l = linkPrompt(String(ctx.from?.id)); await ctx.reply(l.text, { reply_markup: l.kb }); });

  bot.command("status", async (ctx) => {
    const addr = store.linkedAddress(String(ctx.from?.id));
    if (!addr) return ctx.reply("Belum terhubung. Ketik /link");
    const f = await getFacts(chain, addr);
    await ctx.reply(`Pelanggan: ${f.payers}\nOmzet terverifikasi: ${rupiah(f.trailingRevenue)}\nBatas pinjaman: ${rupiah(f.creditLimit)}\nTier: ${f.tier}${f.openLoan ? `\nPinjaman ${f.openLoan.status}: ${rupiah(f.openLoan.repaid)} / ${rupiah(f.openLoan.total)}` : ""}\nDashboard: ${cfg.APP_URL}/m/${addr}`);
  });

  async function handle(ctx: any, parts: Part[]) {
    const tg = String(ctx.from?.id);
    const merchant = store.linkedAddress(tg);
    if (!merchant) { const l = linkPrompt(tg); return ctx.reply(l.text, { reply_markup: l.kb }); }
    await ctx.replyWithChatAction("typing");
    try {
      const r = await runAgent(model, { chain, merchant, sandbox: false }, history.get(tg) ?? [], parts);
      history.set(tg, r.history);
      await ctx.reply(r.text, r.loan ? { reply_markup: new InlineKeyboard().url("Lihat & setujui pinjaman", r.loan.acceptUrl) } : undefined);
      for (const p of r.paymentLinks) {
        const png = await QRCode.toBuffer(p.url, { width: 512, margin: 2 });
        await ctx.replyWithPhoto(new InputFile(png), { caption: `Bayar ${rupiah(BigInt(p.amountRupiah) * 100n)} ke toko Anda\n${p.url}` });
      }
    } catch (e) {
      console.error("agent error:", (e as Error).message);
      await ctx.reply("Maaf, sedang ada gangguan. Coba lagi sebentar ya.");
    }
  }

  bot.on("message:text", (ctx) => handle(ctx, [{ text: ctx.message.text.slice(0, 1000) }]));

  bot.on("message:voice", async (ctx) => {
    const v = ctx.message.voice;
    if (v.duration > 60 || (v.file_size ?? 0) > MAX_VOICE_BYTES) return ctx.reply("Voice note terlalu panjang (maks 60 detik).");
    const file = await ctx.api.getFile(v.file_id);
    const buf = Buffer.from(await (await fetch(`https://api.telegram.org/file/bot${cfg.TELEGRAM_BOT_TOKEN}/${file.file_path}`)).arrayBuffer());
    // the audio is untrusted input just like text: it only ever reaches the model as a user message
    await handle(ctx, [{ inlineData: { mimeType: "audio/ogg", data: buf.toString("base64") } }, { text: "(voice note from the shop owner: transcribe and act on it)" }]);
  });

  bot.catch((e) => console.error("telegram error:", e.message));

  return {
    bot,
    notifyLinked: (tgId: string, address: string) => bot.api.sendMessage(tgId, `✅ Dompet ${address.slice(0, 6)}…${address.slice(-4)} terhubung. Coba ketik: "Gimana penjualan saya?"`).catch(() => {}),
  };
}
