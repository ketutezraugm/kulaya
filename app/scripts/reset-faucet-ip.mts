// Dev helper: clear the per-IP faucet counter for THIS machine's public IP after heavy end-to-end testing.
// Usage: npm run reset-faucet   (only touches faucetip:<this ip>; never prints secrets)
import { Redis } from "@upstash/redis";

const redis = new Redis({ url: process.env.KV_REST_API_URL!, token: process.env.KV_REST_API_TOKEN! });
const ip = (await (await fetch("https://api.ipify.org")).text()).trim();
const keys = await redis.keys(`*faucetip:${ip}*`);
for (const k of keys) await redis.del(k);
console.log(`cleared ${keys.length} key(s) for ${ip}`);
