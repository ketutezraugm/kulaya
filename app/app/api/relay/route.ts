import { getRuntime, json, errorResponse, clientIp } from "@/server/runtime";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  try {
    const { relayer } = getRuntime();
    return json({ enabled: relayer.enabled, relayer: relayer.address }, 200, { "cache-control": "public, s-maxage=60" });
  } catch (e) { return errorResponse(e); }
}

export async function POST(req: Request) {
  try {
    const raw = await req.text();
    if (raw.length > 20_000) return json({ error: "body too large" }, 413);
    const r = await getRuntime().relayer.handle(JSON.parse(raw || "{}"), clientIp(req));
    return json(r.body, r.status);
  } catch (e) { return errorResponse(e); }
}
