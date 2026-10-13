import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { runDialogue, runDetective, extractRounds, extractDetection, speak, stopSpeak } from "./dialogueClient";

const Icon = ({ name, className = "", ...p }) => <span className={"material-symbols-rounded " + className} {...p}>{name}</span>;
const ROUND_TIME = 18;

export default function App() {
  const [screen, setScreen] = useState("menu"); // menu|loading|play|over
  const [rounds, setRounds] = useState([]);
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(+(localStorage.getItem("dhamaka_best") || 0));
  const [picked, setPicked] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [time, setTime] = useState(ROUND_TIME);
  const [speaking, setSpeaking] = useState(false);
  const [agents, setAgents] = useState({});
  const [err, setErr] = useState(null);
  const timer = useRef(null);

  // Detective mode
  const [detInput, setDetInput] = useState("");
  const [detBusy, setDetBusy] = useState(false);
  const [detResult, setDetResult] = useState(null);
  const [detErr, setDetErr] = useState(null);

  async function detect() {
    const q = detInput.trim();
    if (!q || detBusy) return;
    setDetBusy(true); setDetErr(null); setDetResult(null); stopSpeak();
    try {
      let found = null;
      await runDetective(q, { onEvent: (ev) => { const d = extractDetection(ev.text); if (d) found = d; } });
      if (!found) throw new Error("The detective couldn't read that — try another line.");
      setDetResult(found);
      if (found.recognized && found.dialogue_tr) { setSpeaking(true); speak(found.dialogue_tr, { onEnd: () => setSpeaking(false) }); }
    } catch (e) { setDetErr(e.message || "Something broke."); }
    finally { setDetBusy(false); }
  }

  const r = rounds[idx];

  async function start() {
    setScreen("loading"); setErr(null); setRounds([]); setAgents({ Curator: "on" });
    try {
      let roundsData = null;
      await runDialogue("Make me a fresh game: 8 iconic Telugu dialogue rounds, mixed difficulty.", {
        onEvent: (ev) => {
          setAgents((p) => ({ ...p, [ev.author]: "done", ...(ev.author === "Curator" ? { Quizmaster: "on" } : {}) }));
          if (ev.author === "Quizmaster") { const d = extractRounds(ev.text); if (d && d.length) roundsData = d; }
        },
      });
      if (!roundsData || !roundsData.length) throw new Error("Could not build the quiz — try again.");
      setRounds(roundsData); setIdx(0); setScore(0); setStreak(0); setScreen("play");
    } catch (e) { setErr(e.message || "Something broke."); setScreen("menu"); }
  }

  // per-round: speak + timer
  useEffect(() => {
    if (screen !== "play" || !r) return;
    setPicked(null); setAnswered(false); setTime(ROUND_TIME);
    const t = setTimeout(() => { setSpeaking(true); speak(r.dialogue_tr, { onEnd: () => setSpeaking(false) }); }, 350);
    clearInterval(timer.current);
    timer.current = setInterval(() => {
      setTime((x) => {
        if (x <= 0.1) { clearInterval(timer.current); handlePick(null); return 0; }
        return +(x - 0.1).toFixed(1);
      });
    }, 100);
    return () => { clearTimeout(t); clearInterval(timer.current); stopSpeak(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, screen]);

  function handlePick(opt) {
    if (answered) return;
    clearInterval(timer.current); stopSpeak(); setSpeaking(false);
    setPicked(opt); setAnswered(true);
    if (opt && opt === r.movie) {
      const pts = 100 + Math.round(time * 8) + streak * 20;
      setScore((s) => s + pts); setStreak((s) => s + 1);
    } else { setStreak(0); }
  }

  function next() {
    if (idx + 1 < rounds.length) setIdx(idx + 1);
    else {
      const nb = Math.max(best, score); setBest(nb); localStorage.setItem("dhamaka_best", nb);
      setScreen("over"); stopSpeak();
    }
  }

  const correct = answered && picked === r?.movie;

  return (
    <>
      <div className="bg-fx" />
      <header className="topbar"><div className="shell topbar-in">
        <div className="brand"><span className="m"><Icon name="theaters" /></span> Dialogue Dhamaka</div>
        <span className="tagtop">Built with Google Antigravity</span>
      </div></header>

      <main className="shell">
        <AnimatePresence mode="wait">
          {/* MENU */}
          {screen === "menu" && (
            <motion.section key="menu" className="hero" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="eyebrow">🔊 Telugu Cinema · Powered by AI agents</div>
              <h1>Dialogue Dhamaka</h1>
              <p className="sub">Two ways to play. Let the agents quiz you on iconic Telugu dialogues — or hand the AI a dialogue and watch it name the movie.</p>
              {err && <p className="err" style={{ maxWidth: 440, margin: "18px auto 0" }}>⚠ {err}</p>}
              <div className="modes">
                <motion.button className="mode" whileHover={{ y: -4 }} whileTap={{ scale: 0.98 }} onClick={start}>
                  <span className="mi"><Icon name="stadia_controller" /></span>
                  <div className="mt">Guess the Movie</div>
                  <div className="md">Hear a dialogue, pick the film. Beat the clock, build a streak.</div>
                  <div className="mgo">Play <Icon name="arrow_forward" /></div>
                </motion.button>
                <motion.button className="mode alt" whileHover={{ y: -4 }} whileTap={{ scale: 0.98 }} onClick={() => { setScreen("detect"); setDetResult(null); setDetErr(null); }}>
                  <span className="mi"><Icon name="search_insights" /></span>
                  <div className="mt">Dialogue Detective</div>
                  <div className="md">Type any Telugu dialogue — the AI recognizes the movie, character & year.</div>
                  <div className="mgo">Identify <Icon name="arrow_forward" /></div>
                </motion.button>
              </div>
              <p style={{ color: "var(--faint)", fontSize: ".82rem", marginTop: 18 }}>🏆 Best: <b style={{ color: "var(--gold)" }}>{best}</b> · turn your sound on 🔈</p>
            </motion.section>
          )}

          {/* LOADING */}
          {screen === "loading" && (
            <motion.section key="load" className="card pad" style={{ marginTop: 40 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="loader">
                <Icon name="auto_awesome" className="spin" style={{ fontSize: 40, color: "var(--gold)" }} />
                <div style={{ fontFamily: "Baloo 2", fontWeight: 700, fontSize: "1.2rem" }}>Rolling the reels…</div>
                <div className="agentrow">
                  {[["Curator", "movie_filter"], ["Quizmaster", "quiz"]].map(([k, ic]) => (
                    <div key={k} className={"agent " + (agents[k] || "")}>
                      <span className="ic"><Icon name={ic} /></span>
                      <div><div style={{ fontWeight: 600, fontSize: ".9rem" }}>{k}</div><div style={{ fontSize: ".72rem", color: "var(--faint)" }}>{agents[k] === "done" ? "done" : agents[k] === "on" ? "working…" : "waiting"}</div></div>
                    </div>
                  ))}
                </div>
                <p style={{ color: "var(--dim)", fontSize: ".9rem" }}>Curating iconic dialogues & building your rounds…</p>
              </div>
            </motion.section>
          )}

          {/* PLAY */}
          {screen === "play" && r && (
            <motion.section key={"p" + idx} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} style={{ paddingTop: 22 }}>
              <div className="hud">
                <div className="pill"><span className="k">Round</span><span className="v">{idx + 1}<span style={{ color: "var(--faint)", fontSize: "1rem" }}>/{rounds.length}</span></span></div>
                <div className="pill"><span className="k">Score</span><span className="v">{score}</span></div>
                <div className="pill"><span className="k">Streak</span><span className="v">{streak > 0 ? "🔥 " + streak : "—"}</span></div>
              </div>
              <div className="timebar"><i style={{ width: (time / ROUND_TIME * 100) + "%" }} /></div>

              <div className="card pad" style={{ marginTop: 16 }}>
                <div className="stage">
                  <div className="speaker"><div className={"orb" + (speaking ? " on" : "")}><Icon name={speaking ? "graphic_eq" : "record_voice_over"} /></div></div>
                  <div className="dte te">{r.dialogue_te}</div>
                  <div className="dtr">"{r.dialogue_tr}"</div>
                  <div className="row" style={{ marginTop: 14 }}>
                    <button className="chip" onClick={() => { setSpeaking(true); speak(r.dialogue_tr, { onEnd: () => setSpeaking(false) }); }}><Icon name="volume_up" /> Hear it again</button>
                    {!answered && <span className="hintrow"><Icon name="lightbulb" /> {r.hint}</span>}
                  </div>
                </div>

                <div className="opts">
                  {(r.options || []).map((o, i) => {
                    let cls = "opt";
                    if (answered) { if (o === r.movie) cls += " correct"; else if (o === picked) cls += " wrong"; }
                    return <button key={i} className={cls} disabled={answered} onClick={() => handlePick(o)}>{o}</button>;
                  })}
                </div>

                <AnimatePresence>
                  {answered && (
                    <motion.div className="reveal" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                      <div style={{ fontSize: "1.4rem" }}>{correct ? "🎉 Dhamaka!" : picked ? "❌ Arre!" : "⏰ Time up!"}</div>
                      <div className="movie" style={{ color: "var(--gold)", marginTop: 4 }}>{r.movie} <span style={{ color: "var(--faint)", fontWeight: 400, fontSize: "1rem" }}>({r.year})</span></div>
                      <div className="meta">🎭 {r.character}</div>
                      {r.meaning && <div className="mean">"{r.meaning}"</div>}
                      <button className="btn" style={{ marginTop: 16 }} onClick={next}>{idx + 1 < rounds.length ? "Next dialogue" : "See results"} <Icon name="arrow_forward" /></button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.section>
          )}

          {/* OVER */}
          {screen === "over" && (
            <motion.section key="over" className="hero" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="eyebrow">Show's over</div>
              <h1 style={{ fontSize: "clamp(2rem,1.4rem+3vw,3.4rem)" }}>{rankFor(score).t}</h1>
              <div style={{ fontFamily: "Baloo 2", fontWeight: 800, fontSize: "4rem", color: "var(--gold)", marginTop: 8 }}>{score}</div>
              <p className="sub">{rankFor(score).d}</p>
              <p style={{ color: "var(--faint)", margin: "6px 0 0" }}>🏆 Best: <b style={{ color: "var(--gold)" }}>{best}</b>{score >= best && score > 0 ? " · new high!" : ""}</p>
              <div className="row" style={{ marginTop: 24 }}>
                <motion.button className="btn" whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={start}><Icon name="replay" /> Play again</motion.button>
                <button className="btn ghost" onClick={() => setScreen("menu")}><Icon name="home" /> Home</button>
              </div>
            </motion.section>
          )}

          {/* DETECTIVE */}
          {screen === "detect" && (
            <motion.section key="detect" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ paddingTop: 26 }}>
              <div className="center" style={{ marginBottom: 18 }}>
                <div className="eyebrow">🕵️ Dialogue Detective</div>
                <h2 style={{ fontSize: "clamp(1.8rem,1.3rem+2.6vw,2.8rem)", marginTop: 8 }}>Name that movie</h2>
                <p className="sub" style={{ marginTop: 10 }}>Paste or type any Telugu movie dialogue — Telugu, transliteration, even a rough English version. The AI detective figures out the film.</p>
              </div>

              <div className="card pad">
                <textarea className="det-in" rows={3} value={detInput} disabled={detBusy}
                  onChange={(e) => setDetInput(e.target.value)}
                  placeholder="e.g. Naakkonchem tikkundi, kaani daaniko lekkundi…"
                  onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") detect(); }} />
                <div className="row" style={{ justifyContent: "space-between", marginTop: 12 }}>
                  <div className="row" style={{ gap: 8 }}>
                    {["Mahesh Babu Pokiri dialogue", "Pushpa — jhukega nahi", "Baahubali — att-a vinaraa"].map((ex) => (
                      <button key={ex} className="chip" disabled={detBusy} onClick={() => setDetInput(ex)}><Icon name="bolt" /> {ex.split(" ")[0]}</button>
                    ))}
                  </div>
                  <button className="btn" disabled={detBusy || !detInput.trim()} onClick={detect}>
                    {detBusy ? <><Icon name="progress_activity" className="spin" /> Investigating…</> : <><Icon name="search" /> Identify</>}
                  </button>
                </div>

                {detBusy && (
                  <div className="agentrow" style={{ marginTop: 18 }}>
                    <div className="agent on"><span className="ic"><Icon name="search_insights" /></span>
                      <div><div style={{ fontWeight: 600, fontSize: ".9rem" }}>Detective</div><div style={{ fontSize: ".72rem", color: "var(--faint)" }}>watching the reel…</div></div>
                    </div>
                  </div>
                )}
                {detErr && <p className="err" style={{ marginTop: 16 }}>⚠ {detErr}</p>}

                <AnimatePresence>
                  {detResult && (
                    <motion.div className="reveal" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: 20 }}>
                      {detResult.recognized ? (
                        <>
                          <div className={"orb" + (speaking ? " on" : "")} style={{ width: 70, height: 70, margin: "0 auto 10px" }}><Icon name={speaking ? "graphic_eq" : "movie"} /></div>
                          <div className={"conf " + (detResult.confidence || "low")}>{(detResult.confidence || "low")} confidence</div>
                          <div className="movie" style={{ color: "var(--gold)", fontSize: "1.8rem", marginTop: 8 }}>{detResult.movie} <span style={{ color: "var(--faint)", fontWeight: 400, fontSize: "1.1rem" }}>({detResult.year})</span></div>
                          <div className="meta">🎭 {detResult.character}{detResult.actor ? ` · ${detResult.actor}` : ""}</div>
                          {detResult.dialogue_te && <div className="dte te" style={{ fontSize: "1.3rem", margin: "14px 0 2px" }}>{detResult.dialogue_te}</div>}
                          {detResult.dialogue_tr && <div className="dtr">"{detResult.dialogue_tr}"</div>}
                          {detResult.meaning && <div className="mean">{detResult.meaning}</div>}
                          {detResult.note && <div style={{ color: "var(--dim)", fontSize: ".9rem", marginTop: 10 }}>💡 {detResult.note}</div>}
                          {detResult.dialogue_tr && <div className="row" style={{ marginTop: 14 }}><button className="chip" onClick={() => { setSpeaking(true); speak(detResult.dialogue_tr, { onEnd: () => setSpeaking(false) }); }}><Icon name="volume_up" /> Hear it</button></div>}
                        </>
                      ) : (
                        <>
                          <div style={{ fontSize: "1.3rem" }}>🤔 Couldn't place that one</div>
                          {detResult.note && <div style={{ color: "var(--dim)", fontSize: ".95rem", marginTop: 8 }}>{detResult.note}</div>}
                        </>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="row" style={{ marginTop: 18 }}>
                <button className="btn ghost" onClick={() => { setScreen("menu"); stopSpeak(); }}><Icon name="arrow_back" /> Back</button>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </main>

      <footer className="shell">Dialogue Dhamaka · Curator + Quizmaster agents on Google ADK · Gemini via Vertex AI · Cloud Run · Built with Google Antigravity</footer>
    </>
  );
}

function rankFor(s) {
  if (s >= 1200) return { t: "Cinema Legend 👑", d: "You know your Tollywood inside out. Mass!" };
  if (s >= 700) return { t: "Super Hit 🔥", d: "Blockbuster performance — the galli is cheering." };
  if (s >= 350) return { t: "Decent Hit 🎬", d: "Solid. A few more shows and you're a star." };
  return { t: "Flop… for now 🎞️", d: "Warm-up round. Phir se aao — watch a few classics!" };
}
