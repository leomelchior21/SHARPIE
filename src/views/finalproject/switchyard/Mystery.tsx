import { useEffect, useState, type CSSProperties } from "react";
import { ArrowRight, Sparkles, Star } from "lucide-react";
import { levelCount, levels, mysteryCount } from "./levels";
import { Fx, playFx } from "./Fx";

/*
 * The Mystery line's two big moments: the sealed crate that bursts open when level 10 ships,
 * and the Super Maker Master crown after the last mystery level.
 */
const reducedMotion = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// Stars drift across the night sky behind both moments.
function Sky() {
  return <div className="sy-sky" aria-hidden="true">{Array.from({ length: 36 }, (_, i) => <i key={i} style={{ "--x": `${(i * 37) % 100}%`, "--y": `${(i * 53) % 100}%`, "--d": `${(i % 7) * .4}s`, "--s": `${2 + (i % 3)}px` } as CSSProperties} />)}</div>;
}

export function MysteryReveal({ onDone }: { onDone: () => void }) {
  // sealed: the crate shakes. open: it bursts and the line appears.
  const [open, setOpen] = useState(() => reducedMotion());
  useEffect(() => {
    if (open) { playFx("win"); return; }
    const timer = window.setTimeout(() => setOpen(true), 1400);
    return () => window.clearTimeout(timer);
  }, [open]);
  return <div className="sy-night" role="dialog" aria-modal="true" aria-label="Mystery line unlocked">
    <Sky />
    {open && <Fx fx={{ id: 1, kind: "win", text: "" }} scope="inline" />}
    <div className={`sy-crate ${open ? "is-open" : ""}`} aria-hidden="true">
      <span className="sy-crate-lid" /><span className="sy-crate-box"><b>?</b></span>
      <span className="sy-crate-rays" />
    </div>
    {open && <div className="sy-night-copy">
      <small><Sparkles size={14} /> LEVEL 10 SHIPPED · SECRET FOUND</small>
      <h2 className="sy-holo">MYSTERY LINE UNLOCKED</h2>
      <p>{mysteryCount} secret levels. No rule in the dispatch, only a <b>clue log</b>: work out the rule from the evidence, then prove it.</p>
      <ol className="sy-night-cards">{levels.slice(levelCount).map((level, i) => <li key={level.id} style={{ "--i": i } as CSSProperties}><b>?</b><small>MYSTERY {i + 1}</small><span>{level.place}</span></li>)}</ol>
      <p className="sy-night-goal">Ship all three to earn the title <b>SUPER MAKER MASTER</b>.</p>
      <button className="sy-go is-cue" autoFocus onClick={onDone}>ENTER THE MYSTERY LINE <ArrowRight size={16} /></button>
    </div>}
  </div>;
}

export function MasterCrown({ stars, onDone }: { stars: number; onDone: () => void }) {
  useEffect(() => { playFx("win"); }, []);
  return <div className="sy-night is-crown" role="dialog" aria-modal="true" aria-label="Super Maker Master">
    <Sky />
    <Fx fx={{ id: 2, kind: "win", text: "" }} scope="inline" />
    <svg className="sy-medal" viewBox="0 0 200 220" aria-hidden="true">
      <path className="sy-medal-ribbon is-a" d="M62 120 L40 210 L70 192 L88 214 L104 130 Z" />
      <path className="sy-medal-ribbon is-b" d="M138 120 L160 210 L130 192 L112 214 L96 130 Z" />
      <g className="sy-medal-spin"><polygon className="sy-medal-rim" points="100,6 176,50 176,138 100,182 24,138 24,50" /></g>
      <polygon className="sy-medal-face" points="100,22 162,58 162,130 100,166 38,130 38,58" />
      <path className="sy-medal-star" d="M100 52 L111 82 L143 83 L118 103 L127 134 L100 116 L73 134 L82 103 L57 83 L89 82 Z" />
      <text x={100} y={156} textAnchor="middle" className="sy-medal-text">C#</text>
    </svg>
    <div className="sy-night-copy">
      <small><Sparkles size={14} /> THE MYSTERY LINE IS SOLVED</small>
      <h2 className="sy-holo">SUPER MAKER MASTER</h2>
      <div className="sy-stars" aria-label={`${stars} of ${mysteryCount * 3} mystery stars`}>{Array.from({ length: mysteryCount * 3 }, (_, n) => <Star key={n} size={22} className={n < stars ? "is-on" : ""} style={{ "--i": n } as CSSProperties} />)}</div>
      <p>You read the evidence, found every edge, wrote C# from nothing and proved it with tests. That is what a maker does.</p>
      <p className="sy-night-goal">…wait. Something chonky is shaking the yard.</p>
      <button className="sy-go is-cue" autoFocus onClick={onDone}>WHAT IS THAT NOISE?! <ArrowRight size={16} /></button>
    </div>
  </div>;
}
