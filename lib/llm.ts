// Server-only LLM provider abstraction. Picks OpenRouter or Anthropic based on
// which key is present. Never import this from client components.

const ANTHROPIC_MODEL =
  process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5-20251001";
const OPENROUTER_MODEL =
  process.env.OPENROUTER_MODEL ?? "google/gemini-flash-1.5";

export function hasLLM(): boolean {
  return !!(process.env.OPENROUTER_API_KEY || process.env.ANTHROPIC_API_KEY);
}

export interface LLMResult {
  text: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
}

async function callOpenRouter(
  system: string,
  user: string,
  maxTokens: number,
  apiKey: string
): Promise<LLMResult> {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://grindos.local",
      "X-Title": "GrindOS",
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return {
    text: data.choices?.[0]?.message?.content ?? "",
    model: data.model ?? OPENROUTER_MODEL,
    promptTokens: data.usage?.prompt_tokens ?? 0,
    completionTokens: data.usage?.completion_tokens ?? 0,
  };
}

async function callAnthropic(
  system: string,
  user: string,
  maxTokens: number,
  apiKey: string
): Promise<LLMResult> {
  // Dynamic import keeps the SDK out of any client bundle.
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic({ apiKey });
  const msg = await client.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: user }],
  });
  const text = msg.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("");
  return {
    text,
    model: ANTHROPIC_MODEL,
    promptTokens: msg.usage?.input_tokens ?? 0,
    completionTokens: msg.usage?.output_tokens ?? 0,
  };
}

// Returns model text + token usage, or null when no provider key is configured.
export async function callLLM(
  system: string,
  user: string,
  maxTokens: number
): Promise<LLMResult | null> {
  const orKey = process.env.OPENROUTER_API_KEY;
  const antKey = process.env.ANTHROPIC_API_KEY;
  if (orKey) return callOpenRouter(system, user, maxTokens, orKey);
  if (antKey) return callAnthropic(system, user, maxTokens, antKey);
  return null;
}
