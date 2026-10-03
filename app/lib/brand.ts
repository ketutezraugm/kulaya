/** One place for the product name, so a rename never means hunting through the codebase. */
export const BRAND = "Kulaya";
export const TAGLINE_ID = "Modal usaha, langsung dari hasil jualanmu.";
export const TAGLINE_EN = "Fair credit for small shops, repaid from your sales.";
/** Telegram bot username (without @). Telegram usernames can't be renamed: create the new bot in BotFather, then set NEXT_PUBLIC_TELEGRAM_BOT. */
export const TG_BOT = process.env.NEXT_PUBLIC_TELEGRAM_BOT || "KulayaBot";
export const TG_URL = `https://t.me/${TG_BOT}`;
