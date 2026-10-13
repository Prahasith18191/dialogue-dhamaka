"""
Dialogue Dhamaka — guess the iconic Telugu movie from its dialogue.

Two agents build each game:
  1. Curator (Flash) — picks widely-known Telugu movie dialogues across eras & stars.
  2. Quizmaster (Pro) — turns them into clean quiz rounds (transliteration, meaning,
     4 plausible movie options, hint, year) as strict JSON.

The UI then plays the rounds: the browser Narrator speaks the dialogue aloud and the
player guesses the film. Built with Google Antigravity + ADK, on Gemini via Vertex AI.
"""

from google.adk.agents import LlmAgent, SequentialAgent

FLASH = "gemini-2.5-flash"
PRO = "gemini-2.5-pro"

curator = LlmAgent(
    name="Curator", model=FLASH, output_key="picks",
    instruction=(
        "You are a Telugu cinema buff. List 8 ICONIC, instantly-recognisable Telugu movie "
        "dialogues — the kind fans quote. Spread them across eras and stars (e.g. Baahubali, "
        "Pushpa, Pokiri, Magadheera, Arjun Reddy, Athadu, Gabbar Singh, Rangasthalam, RRR, "
        "Businessman, Khaleja, Jalsa, Sarrainodu, Ala Vaikunthapurramuloo, Eega, Srimanthudu, "
        "Temper, Race Gurram, Vikramarkudu). For EACH give: the dialogue in Telugu script, its "
        "Roman transliteration, the movie, the character/actor, and the year. Only famous, "
        "verifiable ones — no obscure or made-up lines. Vary difficulty. Plain numbered list."
    ),
)

quizmaster = LlmAgent(
    name="Quizmaster", model=PRO, output_key="quiz",
    instruction=(
        "Turn these curated dialogues into a quiz:\n\n{picks}\n\n"
        "Output ONLY a json code block (no prose), exactly this shape:\n"
        "```json\n"
        "{\n"
        '  "rounds": [\n'
        "    {\n"
        '      "dialogue_te": "<the line in Telugu script>",\n'
        '      "dialogue_tr": "<Roman transliteration, spoken aloud>",\n'
        '      "meaning": "<short English meaning>",\n'
        '      "movie": "<correct movie>",\n'
        '      "character": "<character / actor>",\n'
        '      "year": 2015,\n'
        '      "options": ["<correct movie>", "<wrong1>", "<wrong2>", "<wrong3>"],\n'
        '      "hint": "<a non-spoiler hint: star, era or genre>",\n'
        '      "difficulty": "easy"\n'
        "    }\n"
        "  ]\n"
        "}\n"
        "```\n"
        "Rules: 8 rounds. options = 4 REAL Telugu movies including the correct one, plausible "
        "distractors (similar era/star), order shuffled so the answer is not always first. "
        "difficulty is easy|med|hard with a mix. year is an integer. Keep transliteration natural "
        "to read aloud. Only well-known, accurate dialogue↔movie pairs. Valid JSON only."
    ),
)

root_agent = SequentialAgent(
    name="DialogueDhamaka",
    description="Builds a Telugu-movie dialogue guessing quiz: a Curator picks iconic lines, a Quizmaster builds the rounds.",
    sub_agents=[curator, quizmaster],
)
