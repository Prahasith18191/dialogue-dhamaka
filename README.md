# 🎬 Dialogue Dhamaka — Guess the Telugu Movie

An addictive mini-game where you **hear an iconic Telugu movie dialogue and guess the film**. Every game is freshly curated by a team of AI agents, narrated out loud, and scored on speed + streak. Mass!

**▶️ Play live:** https://dialogue-ui-517389172995.us-central1.run.app

![Telugu Cinema](https://img.shields.io/badge/Telugu-Cinema-f6c45a) ![Google_ADK](https://img.shields.io/badge/Google-ADK-4285F4) ![Cloud_Run](https://img.shields.io/badge/Cloud-Run-34A853)

---

## How it plays

1. Hit **Start the show** — an agent team builds 8 fresh rounds on the spot.
2. A pulsing audio orb **speaks the dialogue** (Telugu voice when available; replay any time).
3. Read the Telugu script + transliteration, then pick the right movie from 4 options.
4. The faster you answer, the bigger the **dhamaka** — build a streak, climb from *Flop* to *Cinema Legend 👑*.

## The agent team (Google Agent Development Kit)

A two-stage `SequentialAgent` running on Gemini via Vertex AI:

| Agent | Model | Job |
|---|---|---|
| **Curator** | Gemini 2.5 Flash | Picks 8 genuinely iconic dialogues across eras — Baahubali, Pushpa, Pokiri, Magadheera, Arjun Reddy, RRR… with movie, character & year. |
| **Quizmaster** | Gemini 2.5 Pro | Turns each into a round: meaning, 4 shuffled real-movie options, a hint and a difficulty — emitted as strict JSON the UI renders. |

The browser narrates each dialogue with the Web Speech API (Telugu voice preferred), so the "audio agent" speaks every round.

## Stack

- **Agents:** Python · Google ADK · Gemini 2.5 Flash + Pro (Vertex AI) · deployed with `adk deploy cloud_run --with_ui`
- **Frontend:** Vite · React 18 · Framer Motion · cinematic maroon-&-gold theme, glassmorphism, Material Symbols · nginx on Cloud Run
- **Audio:** Browser Web Speech (`speechSynthesis`, `te-IN`)

## Run locally

```bash
# agents
pip install -r requirements.txt
adk web            # opens the ADK dev UI with the `dialogue` agent

# frontend
cd ui && npm install && npm run dev
```

Set `VITE_DLG_API` to your deployed agent URL for the UI to reach the agents.

---

Built with **Google Antigravity**.
