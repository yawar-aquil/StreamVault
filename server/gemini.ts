// Vault AI "brain" powered by Google Gemini.
//
// Request format mirrors exactly what was tested with curl:
//   curl.exe "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent" \
//     -H "x-goog-api-key: <KEY>" -H "Content-Type: application/json" \
//     -X POST -d "{\"contents\":[{\"parts\":[{\"text\":\"...\"}]}]}"
//
// The API key lives in .env as GEMINI_API_KEY.

// flash-lite has a far higher free-tier daily quota than flash (which is only ~20/day),
// so the assistant doesn't die after a handful of messages.
const GEMINI_MODEL = "gemini-2.5-flash-lite";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export interface GeminiTurn {
  role: "user" | "model";
  text: string;
}

// The personality + behaviour brief for Vault AI. This is the system prompt.
export const VAULT_AI_SYSTEM_PROMPT = `You are "Vault AI", the friendly, witty streaming concierge built into StreamVault (a movie/TV/anime streaming site).

YOUR JOB:
1. FIRST, read the user's latest message and respond to what they ACTUALLY asked. If they just want to chat, vent, say hi, ask a question, or talk about their day — TALK BACK like a friend. Do NOT push movies on them. Only recommend titles when they ask for something to watch, or clearly hint they want a recommendation.
2. Use the user's MEMORY (their saved interests/personality below), WATCH HISTORY, and RECENTLY WATCHED to understand them and keep the conversation personal.
3. When they DO want something to watch: read their mood (ask at most ONE short question only if you truly can't tell), then fill the "recommend" array with 3-5 real titles. Only recommend titles that exist in the AVAILABLE CATALOG — never invent titles. Prefer titles fitting their mood + taste, avoid re-recommending what they just finished.
4. If they don't like your picks or ask for "another"/"something else", recommend a DIFFERENT fresh set you haven't suggested this conversation.

STYLE:
- Warm, concise, a little playful. Use occasional emojis, never spam them.
- Talk like a knowledgeable friend, not a corporate bot.
- Keep replies short (2-4 sentences). This is a chat widget, not an essay.
- FORMATTING: write the "reply" using markdown. Wrap every movie/show title and any key label in **double asterisks** for bold (e.g. **Obsession** — a 2026 horror thriller ⭐7.9). Use line breaks and "•" bullets when listing a few things. This is the same style the rest of the app uses, so always include this formatting.

OUTPUT FORMAT — VERY IMPORTANT:
Respond with ONLY a single raw JSON object (no markdown fences, no prose around it) with this exact shape:
{
  "reply": "your conversational message to the user (may contain a question)",
  "suggestions": ["short quick-reply chip", "another chip"],
  "recommend": ["Exact Catalog Title", "Another Exact Catalog Title"]
}
Rules for the JSON:
- "reply" is required.
- "suggestions" are 2-4 very short tappable quick-replies (max ~4 words each). Use them to move the conversation forward (e.g. mood options, "Surprise me", "Something lighter").
- "recommend" lists 3-5 titles copied EXACTLY (character for character) from the AVAILABLE CATALOG — but ONLY when the user wants something to watch. When the user is just chatting, venting, greeting, or asking a non-recommendation question, leave "recommend" as an empty array [] and simply talk to them.
- Output nothing except the JSON object.`;

export interface GeminiReply {
  reply: string;
  suggestions: string[];
  recommend: string[];
}

// Build the dynamic context block (catalog + the user's watch data) that gets
// prepended as the first model-visible turn.
export function buildContextBlock(opts: {
  catalog: string[];
  watchHistory: string[];
  recentWatch: string[];
  memory?: string;
}): string {
  const lines: string[] = [];

  lines.push("=== USER MEMORY (what you remember about this user — their interests, personality, preferences) ===");
  lines.push(opts.memory && opts.memory.trim() ? opts.memory.trim() : "(no memory yet — this may be a new user)");
  lines.push("");
  lines.push("=== USER WATCH HISTORY (oldest → newest, may be empty) ===");
  lines.push(opts.watchHistory.length ? opts.watchHistory.join("\n") : "(no watch history yet)");
  lines.push("");
  lines.push("=== RECENTLY WATCHED (most recent first) ===");
  lines.push(opts.recentWatch.length ? opts.recentWatch.join("\n") : "(nothing recent)");
  lines.push("");
  lines.push("=== AVAILABLE CATALOG (only recommend from this list, copy titles exactly) ===");
  lines.push(opts.catalog.length ? opts.catalog.join("\n") : "(catalog unavailable)");

  return lines.join("\n");
}

// Best-effort JSON extraction — Gemini occasionally wraps JSON in ```json fences
// or adds a stray word, so we pull out the first {...} block.
function parseReply(raw: string): GeminiReply {
  let text = (raw || "").trim();

  // Strip markdown code fences if present.
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) text = fenceMatch[1].trim();

  // Fall back to the first balanced-looking object.
  if (!text.startsWith("{")) {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      text = text.slice(start, end + 1);
    }
  }

  try {
    const parsed = JSON.parse(text);
    return {
      reply: typeof parsed.reply === "string" ? parsed.reply : "",
      suggestions: Array.isArray(parsed.suggestions)
        ? parsed.suggestions.filter((s: unknown) => typeof s === "string").slice(0, 4)
        : [],
      recommend: Array.isArray(parsed.recommend)
        ? parsed.recommend.filter((s: unknown) => typeof s === "string").slice(0, 5)
        : [],
    };
  } catch {
    // Model didn't return JSON — treat the whole thing as a plain reply.
    return { reply: raw.trim(), suggestions: [], recommend: [] };
  }
}

export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

export async function generateVaultReply(opts: {
  history: GeminiTurn[];
  contextBlock: string;
}): Promise<GeminiReply> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  // Conversation: lead with the context block as a user turn so the model has the
  // catalog + watch data, then the real chat history.
  const contents = [
    { role: "user", parts: [{ text: opts.contextBlock }] },
    {
      role: "model",
      parts: [{ text: '{"reply":"Got it — I\'ve reviewed your taste and the catalog. Ready to help.","suggestions":[],"recommend":[]}' }],
    },
    ...opts.history.map((turn) => ({
      role: turn.role,
      parts: [{ text: turn.text }],
    })),
  ];

  const body = {
    systemInstruction: { parts: [{ text: VAULT_AI_SYSTEM_PROMPT }] },
    contents,
    generationConfig: {
      temperature: 0.85,
      topP: 0.95,
      maxOutputTokens: 1024,
      responseMimeType: "application/json",
      // gemini-2.5-flash "thinks" by default and would eat the whole token budget,
      // truncating the JSON. Turn thinking off for fast, complete, cheap replies.
      thinkingConfig: { thinkingBudget: 0 },
    },
  };

  const response = await fetch(GEMINI_URL, {
    method: "POST",
    headers: {
      "x-goog-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(`Gemini API error ${response.status}: ${errText.slice(0, 300)}`);
  }

  const data = await response.json();
  const text: string =
    data?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text || "").join("") || "";

  return parseReply(text);
}

// Update a user's long-term memory markdown by folding in the latest conversation.
// Returns the new memory markdown, or null if it couldn't be generated.
export async function summarizeMemory(opts: {
  existingMemory: string;
  conversation: GeminiTurn[];
  username?: string;
}): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const convoText = opts.conversation
    .map((t) => `${t.role === "model" ? "Vault AI" : "User"}: ${t.text}`)
    .join("\n");

  const prompt = `You maintain a concise long-term memory profile (markdown) about a StreamVault user${opts.username ? ` named "${opts.username}"` : ""}, used by an AI movie assistant to personalize chats.

EXISTING MEMORY:
${opts.existingMemory || "(empty — first time)"}

NEW CONVERSATION:
${convoText}

Update the memory. Output ONLY the full updated markdown file (no fences, no commentary), keeping it SHORT (under ~250 words) using these sections:
# AI Memory
## Favorite Genres & Themes
## Liked Titles
## Disliked / Not Interested
## Personality & Chat Style
## Notes
Merge new facts with old ones, drop nothing important, remove contradictions, and don't invent things the user didn't express.`;

  try {
    const response = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 600,
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    const text: string =
      data?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text || "").join("") || "";
    const cleaned = text.replace(/^```(?:markdown)?\s*/i, "").replace(/```\s*$/i, "").trim();
    return cleaned || null;
  } catch {
    return null;
  }
}
