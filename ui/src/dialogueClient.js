// Calls the Dialogue Dhamaka agent team on Cloud Run (ADK /run_sse) and speaks dialogues.
const BASE = (import.meta.env.VITE_DLG_API || "https://dialogue-puxir3jrda-uc.a.run.app").replace(/\/+$/, "");
const APP = "dialogue";

function parse(raw) {
  const author = raw.author || "agent";
  const text = (raw.content?.parts || []).map((p) => p?.text || "").join("").trim();
  return { author, text };
}

export async function runDialogue(message, { onEvent } = {}) {
  const uid = "web", sid = "s-" + Date.now().toString(36);
  await fetch(`${BASE}/apps/${APP}/users/${uid}/sessions/${sid}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: "{}",
  });
  const res = await fetch(`${BASE}/run_sse`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ app_name: APP, user_id: uid, session_id: sid, new_message: { role: "user", parts: [{ text: message }] }, streaming: false }),
  });
  if (!res.ok || !res.body) throw new Error(`Dialogue API error ${res.status}`);
  const reader = res.body.getReader(); const dec = new TextDecoder(); let buf = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const chunks = buf.split("\n\n"); buf = chunks.pop() || "";
    for (const c of chunks) {
      const line = c.split("\n").find((l) => l.startsWith("data:"));
      if (!line) continue;
      const j = line.slice(5).trim(); if (!j || j === "[DONE]") continue;
      try { onEvent?.(parse(JSON.parse(j))); } catch { /* partial */ }
    }
  }
}

export function extractRounds(text) {
  if (!text) return null;
  let s = text;
  const m = text.match(/```json\s*([\s\S]*?)```/i) || text.match(/```\s*([\s\S]*?)```/);
  if (m) s = m[1];
  else { const a = text.indexOf("{"), b = text.lastIndexOf("}"); if (a >= 0 && b > a) s = text.slice(a, b + 1); }
  try { const d = JSON.parse(s); return Array.isArray(d?.rounds) ? d.rounds : null; } catch { return null; }
}

// ── Narrator (Web Speech) ────────────────────────────────────────────────
let VOICE = null;
function pickVoice() {
  const vs = window.speechSynthesis ? window.speechSynthesis.getVoices() : [];
  VOICE = vs.find((v) => /te(-|_)IN/i.test(v.lang)) || vs.find((v) => /hi(-|_)IN/i.test(v.lang)) ||
    vs.find((v) => /en(-|_)IN/i.test(v.lang)) || vs.find((v) => /en/i.test(v.lang)) || vs[0] || null;
}
if (typeof window !== "undefined" && window.speechSynthesis) {
  pickVoice(); window.speechSynthesis.onvoiceschanged = pickVoice;
}
export function speak(text, { onEnd } = {}) {
  try {
    const synth = window.speechSynthesis; if (!synth) { onEnd?.(); return; }
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    if (!VOICE) pickVoice();
    if (VOICE) u.voice = VOICE;
    u.lang = (VOICE && VOICE.lang) || "te-IN";
    u.rate = 0.9; u.pitch = 1.02;
    if (onEnd) u.onend = onEnd;
    synth.speak(u);
  } catch { onEnd?.(); }
}
export function stopSpeak() { try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch {} }
