import { GoogleGenAI, type Content, type Part } from "@google/genai";

/**
 * Provider-agnostic chat + tool-calling layer with ordered failover.
 * Safety never depends on which model answers: every number is code-computed, loans go through policy.ts and the
 * contract, and replies pass the figure guard. So models are interchangeable, and a free tier that sheds load just
 * means we try the next provider.
 */

export type ToolDecl = { name: string; description: string; parameters: Record<string, unknown> };
export type Call = { id: string; name: string; args: Record<string, unknown> };
export type Msg =
  | { role: "user"; text?: string; audio?: { mime: string; data: string }; internal?: boolean }
  | { role: "assistant"; text?: string; calls?: Call[]; raw?: Content }
  | { role: "tool"; results: { id: string; name: string; output: unknown }[] };
export type Completion = { text: string; calls: Call[]; raw?: Content; provider: string };

export class BusyError extends Error {}

type Provider = { id: string; supportsAudio: boolean; complete(msgs: Msg[], system: string, tools: ToolDecl[], signal: AbortSignal): Promise<Completion> };

// ───────────── OpenAI-compatible (Groq, Cerebras, Mistral, OpenRouter, ...) ─────────────

const OPENAI_BASES: Record<string, string> = {
  groq: "https://api.groq.com/openai/v1",
  cerebras: "https://api.cerebras.ai/v1",
  mistral: "https://api.mistral.ai/v1",
  openrouter: "https://openrouter.ai/api/v1",
};

function openaiMessages(msgs: Msg[], system: string) {
  const out: unknown[] = [{ role: "system", content: system }];
  for (const m of msgs) {
    if (m.role === "user") out.push({ role: "user", content: m.text ?? "" });
    else if (m.role === "assistant") {
      out.push({
        role: "assistant", content: m.text || null,
        ...(m.calls?.length ? { tool_calls: m.calls.map((c) => ({ id: c.id, type: "function", function: { name: c.name, arguments: JSON.stringify(c.args) } })) } : {}),
      });
    } else for (const r of m.results) out.push({ role: "tool", tool_call_id: r.id, content: JSON.stringify(r.output) });
  }
  return out;
}

function openaiProvider(name: string, key: string, model: string): Provider {
  return {
    id: `${name}:${model}`, supportsAudio: false,
    async complete(msgs, system, tools, signal) {
      const res = await fetch(`${OPENAI_BASES[name]}/chat/completions`, {
        method: "POST", signal,
        headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model, messages: openaiMessages(msgs, system), temperature: 0.3, max_tokens: 900,
          tools: tools.map((t) => ({ type: "function", function: { name: t.name, description: t.description, parameters: t.parameters } })),
          tool_choice: "auto",
        }),
      });
      if (!res.ok) throw new Error(`${name} ${res.status}: ${(await res.text()).slice(0, 160)}`);
      const j: any = await res.json();
      const m = j.choices?.[0]?.message;
      if (!m) throw new Error(`${name}: empty response`);
      const calls: Call[] = (m.tool_calls ?? []).map((c: any, i: number) => {
        let args: Record<string, unknown> = {};
        try { args = JSON.parse(c.function?.arguments || "{}"); } catch { throw new Error(`${name}: malformed tool arguments`); }
        return { id: c.id ?? `call_${i}`, name: c.function?.name, args };
      });
      return { text: String(m.content ?? "").trim(), calls, provider: `${name}:${model}` };
    },
  };
}

// ───────────── Gemini ─────────────

function geminiContents(msgs: Msg[]): Content[] {
  const out: Content[] = [];
  for (const m of msgs) {
    if (m.role === "user") {
      const parts: Part[] = [];
      if (m.audio) parts.push({ inlineData: { mimeType: m.audio.mime, data: m.audio.data } });
      if (m.text) parts.push({ text: m.text });
      out.push({ role: "user", parts: parts.length ? parts : [{ text: "" }] });
    } else if (m.role === "assistant") {
      if (m.raw) { out.push(m.raw); continue; } // keep Gemini's own content intact (thought signatures)
      const parts: Part[] = [];
      if (m.text) parts.push({ text: m.text });
      // calls made by another provider carry no thought signature: Gemini 3 accepts this documented dummy value
      for (const c of m.calls ?? []) parts.push({ functionCall: { name: c.name, args: c.args }, thoughtSignature: "skip_thought_signature_validator" } as Part);
      out.push({ role: "model", parts: parts.length ? parts : [{ text: "" }] });
    } else out.push({ role: "user", parts: m.results.map((r) => ({ functionResponse: { name: r.name, response: { output: r.output } } })) });
  }
  return out;
}

function geminiProvider(key: string, model: string): Provider {
  const ai = new GoogleGenAI({ apiKey: key });
  return {
    id: `gemini:${model}`, supportsAudio: true,
    async complete(msgs, system, tools, signal) {
      const res = await ai.models.generateContent({
        model, contents: geminiContents(msgs),
        config: { systemInstruction: system, temperature: 0.3, abortSignal: signal, tools: [{ functionDeclarations: tools.map((t) => ({ name: t.name, description: t.description, parametersJsonSchema: t.parameters })) }] },
      });
      const calls: Call[] = (res.functionCalls ?? []).map((c, i) => ({ id: c.id ?? `call_${i}`, name: c.name ?? "", args: (c.args ?? {}) as Record<string, unknown> }));
      return { text: (res.text ?? "").trim(), calls, raw: res.candidates?.[0]?.content, provider: `gemini:${model}` };
    },
  };
}

// ───────────── chain ─────────────

export type LlmKeys = Partial<Record<"GROQ_API_KEY" | "CEREBRAS_API_KEY" | "MISTRAL_API_KEY" | "OPENROUTER_API_KEY" | "GEMINI_API_KEY", string>>;

/** Default order: fast free tiers first, Gemini last (it also takes voice notes). Override with LLM_CHAIN="groq:model,gemini:model". */
const DEFAULT_CHAIN = [
  "groq:openai/gpt-oss-120b", "cerebras:gpt-oss-120b", "groq:qwen/qwen3.8-27b", "cerebras:qwen-3.8-27b", "mistral:mistral-small-latest",
  "openrouter:meta-llama/llama-3.3-70b-instruct:free", "gemini:gemini-3.5-flash", "gemini:gemini-3.8-flash",
];
const KEY_OF: Record<string, keyof LlmKeys> = { groq: "GROQ_API_KEY", cerebras: "CEREBRAS_API_KEY", mistral: "MISTRAL_API_KEY", openrouter: "OPENROUTER_API_KEY", gemini: "GEMINI_API_KEY" };

export function makeLLM(keys: LlmKeys, chain?: string) {
  const providers: Provider[] = [];
  for (const entry of (chain ? chain.split(",") : DEFAULT_CHAIN).map((s) => s.trim()).filter(Boolean)) {
    const i = entry.indexOf(":");
    const name = entry.slice(0, i), model = entry.slice(i + 1);
    const key = keys[KEY_OF[name]];
    if (!key) continue; // provider not configured
    providers.push(name === "gemini" ? geminiProvider(key, model) : openaiProvider(name, key, model));
  }
  if (!providers.length) throw new Error("No LLM provider configured: set at least one of GROQ_API_KEY, CEREBRAS_API_KEY, MISTRAL_API_KEY, OPENROUTER_API_KEY, GEMINI_API_KEY");

  return {
    providers: providers.map((p) => p.id),
    /** Try providers in order until one answers, within an absolute deadline. A slow or failing provider never eats the whole budget. */
    async complete(msgs: Msg[], system: string, tools: ToolDecl[], deadline: number): Promise<Completion> {
      const hasAudio = msgs.some((m) => m.role === "user" && m.audio);
      const errors: string[] = [];
      for (const p of providers) {
        if (hasAudio && !p.supportsAudio) continue;
        const left = deadline - Date.now();
        if (left < 3_000) break;
        const ctl = new AbortController();
        const timer = setTimeout(() => ctl.abort(), Math.min(18_000, left - 1_000));
        try {
          return await p.complete(msgs, system, tools, ctl.signal);
        } catch (e) {
          errors.push(`${p.id}: ${String((e as Error).message ?? e).split("\n")[0].slice(0, 140)}`);
        } finally { clearTimeout(timer); }
      }
      console.error("all LLM providers failed:", errors.join(" | "));
      throw new BusyError("AI models are busy");
    },
  };
}
export type LLM = ReturnType<typeof makeLLM>;

/** Speech-to-text for voice notes (Groq Whisper, free tier). Returns null when unavailable so the caller can fall back. */
export async function transcribe(groqKey: string | undefined, audio: Uint8Array, mime: string): Promise<string | null> {
  if (!groqKey) return null;
  try {
    const form = new FormData();
    form.append("file", new Blob([audio as BlobPart], { type: mime }), "voice.ogg");
    form.append("model", "whisper-large-v3-turbo");
    form.append("temperature", "0");
    const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", { method: "POST", headers: { authorization: `Bearer ${groqKey}` }, body: form, signal: AbortSignal.timeout(15_000) });
    if (!res.ok) return null;
    const t = String(((await res.json()) as { text?: string }).text ?? "").trim();
    return t || null;
  } catch { return null; }
}
