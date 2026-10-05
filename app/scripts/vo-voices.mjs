// Lists the ElevenLabs voices this account can use through the API (name, id, category, description). Key is read from .env.local, never printed.
import { readFileSync } from "node:fs";
const key = readFileSync(".env.local", "utf8").match(/^ELEVENLABS_API_KEY=(.*)$/m)?.[1]?.trim();
const r = await fetch("https://api.elevenlabs.io/v1/voices", { headers: { "xi-api-key": key } });
if (!r.ok) { console.error(r.status, (await r.text()).slice(0, 200)); process.exit(1); }
for (const v of (await r.json()).voices) console.log(`${v.name.padEnd(22)} ${v.voice_id}  ${v.category.padEnd(11)} ${[v.labels?.gender, v.labels?.accent, v.labels?.descriptive ?? v.labels?.use_case].filter(Boolean).join(", ")}`);
