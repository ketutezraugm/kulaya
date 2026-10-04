import raw from "@/assets/handoff/copy-id.json";

/** Bahasa copy deck (designer's copy-id.json) + the keys the deck lacked (DESIGN_REVIEW 6.4). `{curly}` tokens are filled by code, never by the LLM. */
const GROUPS = {
  global: raw.global, landing: raw["landing /"], tutorial: raw["tutorial /mulai"], setup: raw["setup /mulai"], states: raw["setup states"],
  masuk: raw["masuk /masuk"], beranda: raw["beranda /toko"], terima: raw["terima /toko/terima"], modal: raw["modal /toko/modal"],
  riwayat: raw["riwayat /toko/riwayat"], tanya: raw["tanya /toko/tanya"], bantuan: raw["bantuan /bantuan"], bayar: raw["bayar /bayar/[toko]"],
  profil: raw["profil /t/[toko]"], err: raw["global states"], poster: raw.poster,
  // new keys
  baru: {
    "hist.title": "Riwayat modal", "hist.empty": "Belum ada modal. Kalau sudah ada, riwayatnya muncul di sini.",
    "hist.row": "Modal #{id}", "hist.of": "{paid} dari {total}", "hist.total": "Total {total}",
    "st.Repaid": "Lunas", "st.Active": "Berjalan", "st.Proposed": "Menunggu keputusan", "st.Expired": "Kedaluwarsa", "st.Defaulted": "Dihentikan",
    "expired.title": "Penawaran ini sudah berakhir", "expired.body": "Penawaran ini sudah berakhir. Anda bisa minta penawaran baru.", "expired.btn": "Minta penawaran baru",
    "name.edit": "Ubah nama toko", "name.rule": "2 sampai 40 huruf atau angka. Tanpa tautan atau simbol.", "name.saved": "Tersimpan.",
    "tg.login": "Masuk lewat Telegram", "tg.how": "Buka Telegram dan ketik /masuk",
    "tg.bad": "Tautan sudah dipakai atau kedaluwarsa. Ketik /masuk di Telegram untuk tautan baru.", "tg.checking": "Memeriksa tautan Anda…",
    "live.ok": "Pembayaran diterima!", "live.from": "{rp} dari Pelanggan #{n}.", "live.cut": "{rp} otomatis dipotong untuk cicilan.",
    "wallet.only": "Untuk konfirmasi uang, hubungkan aplikasi dompet. Masuk lewat Telegram hanya untuk melihat dan bertanya.",
    "wallet.connect": "Hubungkan aplikasi dompet", "logout": "Keluar", "notreg": "Toko ini belum terdaftar.",
    "cap.low": "Batas modal Anda baru {rp}. Modal mulai dari Rp 50.000, jadi tambah penjualan dulu.", "tg.hello": "Selamat datang",
    "qr.fixed": "Jumlah tertentu", "qr.general": "Pelanggan isi jumlah", "qr.general.hint": "Satu kode untuk warung: pelanggan mengisi jumlahnya sendiri (minimal Rp 5.000).",
    "link.title": "Hubungkan ke Telegram", "link.body": "Satu konfirmasi lagi supaya chat Telegram Anda terhubung ke toko ini. Gratis.", "link.btn": "Hubungkan Telegram", "link.done": "Telegram terhubung. Kembali ke Telegram dan sapa Kulaya.",
    "back.home": "Ke Beranda", "chip.min": "Minimal {rp}", "demo.paying": "Menyiapkan dompet demo…",
  },
} as const;

type Groups = typeof GROUPS;
export type CopyKey = { [G in keyof Groups]: `${G & string}.${keyof Groups[G] & string}` }[keyof Groups];

/** t("beranda.cap.label", { n: 3 }) */
export function t(key: CopyKey, vars?: Record<string, string | number>): string {
  const i = key.indexOf(".");
  const g = GROUPS[key.slice(0, i) as keyof Groups] as Record<string, string>;
  const s = g[key.slice(i + 1)];
  return vars ? s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`)) : s;
}

/** "a | b | c" rows of the comparison table */
export const cols = (key: CopyKey) => t(key).split(" | ");
