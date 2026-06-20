// Server-only LLM provider abstraction. Picks OpenRouter or Anthropic based on
// which key is present. Never import this from client components.

const ANTHROPIC_MODEL =
  process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5-20251001";
const OPENROUTER_MODEL =
  process.env.OPENROUTER_MODEL ?? "google/gemini-flash-1.5";

export function hasLLM(): boolean {
  return !!(process.env.OPENROUTER_API_KEY || process.env.ANTHROPIC_API_KEY);
}

async function callOpenRouter(
  system: string,
  user: string,
  maxTokens: number,
  apiKey: string
): Promise<string> {
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
  return data.choices?.[0]?.message?.content ?? "";
}

async function callAnthropic(
  system: string,
  user: string,
  maxTokens: number,
  apiKey: string
): Promise<string> {
  // Dynamic import keeps the SDK out of any client bundle.
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic({ apiKey });
  const msg = await client.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: user }],
  });
  return msg.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("");
}

// Returns raw model text, or null when no provider key is configured.
export async function callLLM(
  system: string,
  user: string,
  maxTokens: number
): Promise<string | null> {
  const orKey = process.env.OPENROUTER_API_KEY;
  const antKey = process.env.ANTHROPIC_API_KEY;
  if (orKey) return callOpenRouter(system, user, maxTokens, orKey);
  if (antKey) return callAnthropic(system, user, maxTokens, antKey);
  return null;
}
