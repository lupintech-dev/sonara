// backend/services/aiPlaylist.js
// Uses Groq (OpenAI-compatible) to interpret a free-text vibe into
// a playlist concept: { name, description, queries[] }.

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_KEY = process.env.GROQ_API_KEY || '';
const MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';

const SYSTEM_PROMPT = `You are a music curator working with independent and Creative Commons music catalogs (Audius + Jamendo).
Given a user's vibe in plain English, you return a playlist concept.

Respond ONLY with valid JSON matching this exact schema:
{
  "name": "short catchy playlist name (max 40 chars)",
  "description": "one short sentence describing the vibe (max 120 chars)",
  "queries": ["query1", "query2", "query3", "query4", "query5"]
}

Rules:
- Provide exactly 5 search queries.
- Each query is 1–3 lowercase words focused on genre, mood, era, or theme.
- Do NOT include artist names unless the user explicitly names one.
- Queries should be distinct but feel harmonious (e.g. "lofi", "chill jazz", "rainy piano", "warm acoustic", "dreamy synth").
- Avoid generic words like "music" or "song".
- Never wrap the JSON in markdown fences.`;

export async function interpretPrompt(prompt) {
  if (!GROQ_KEY) throw new Error('GROQ_API_KEY is not set');
  if (!prompt || !prompt.trim()) throw new Error('Prompt is required');
  if (prompt.length > 400) throw new Error('Prompt too long (max 400 chars)');

  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.75,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt.trim() },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Groq ${res.status} — ${text.slice(0, 200)}`);
  }

  const json = await res.json();
  const content = json?.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty response from Groq');

  let parsed;
  try { parsed = JSON.parse(content); }
  catch { throw new Error('Groq returned non-JSON content'); }

  const name = String(parsed.name || 'AI Playlist').trim().slice(0, 60);
  const description = String(parsed.description || '').trim().slice(0, 200);

  const queries = Array.isArray(parsed.queries)
    ? parsed.queries
        .map(q => String(q || '').trim().toLowerCase())
        .filter(q => q.length > 0 && q.length < 40)
        .slice(0, 6)
    : [];

  if (queries.length === 0) throw new Error('Groq did not return usable queries');

  return { name, description, queries };
}