import { useEffect, useState, type CSSProperties } from "react";
import { ArrowRight, Rocket, Star } from "lucide-react";
import { BADGE_NAME, blasterCount, levels, mysteryEnd } from "./levels";
import { Fx, playFx, playHiss, playMeow, playSiren } from "./Fx";

/*
 * Super Mega Blaster Plus Advanced: the hidden line after the Mystery line, starring MEGA CAT BRIAN.
 * Brian, his moods, the boss fight, the keyboard walk, the reveal and the badge ceremony all live here.
 */
const reducedMotion = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export type Mood = "idle" | "happy" | "angry" | "hurt" | "laugh" | "ko";

/** MEGA CAT BRIAN: a chonky orange cat in sunglasses and a cape. */
export function Brian({ mood = "idle", className = "" }: { mood?: Mood; className?: string }) {
  const ko = mood === "ko";
  return <svg className={`sy-brian is-${mood} ${className}`} viewBox="0 0 200 200" aria-hidden="true">
    <path className="sy-brian-cape" d="M38 128 Q20 182 46 196 L154 196 Q180 182 162 128 Z" />
    <ellipse className="sy-brian-body" cx={100} cy={170} rx={58} ry={30} />
    <g className="sy-brian-head">
      <polygon className="sy-brian-fur" points="36,86 42,18 92,56" />
      <polygon className="sy-brian-fur" points="164,86 158,18 108,56" />
      <polygon className="sy-brian-ear" points="48,70 51,36 78,56" />
      <polygon className="sy-brian-ear" points="152,70 149,36 122,56" />
      <ellipse className="sy-brian-fur" cx={100} cy={102} rx={72} ry={58} />
      <path className="sy-brian-stripe" d="M86 50 Q90 64 88 74 M100 46 L100 72 M114 50 Q110 64 112 74" />
      <path className="sy-brian-stripe" d="M30 104 L48 108 M32 120 L50 118 M170 104 L152 108 M168 120 L150 118" />
      <ellipse className="sy-brian-blush" cx={56} cy={128} rx={11} ry={6} />
      <ellipse className="sy-brian-blush" cx={144} cy={128} rx={11} ry={6} />
      {ko ? <g className="sy-brian-x">
        <path d="M60 86 L84 108 M84 86 L60 108 M116 86 L140 108 M140 86 L116 108" />
      </g> : <g className="sy-brian-shades">
        <rect x={50} y={82} width={44} height={28} rx={9} />
        <rect x={106} y={82} width={44} height={28} rx={9} />
        <path d="M94 92 L106 92" />
        <path className="sy-brian-shine" d="M58 88 L66 88 M114 88 L122 88" />
      </g>}
      {ko && <g className="sy-brian-shades is-fallen"><rect x={118} y={136} width={34} height={20} rx={7} /><rect x={154} y={140} width={30} height={20} rx={7} /></g>}
      <path className="sy-brian-nose" d="M93 118 L107 118 L100 126 Z" />
      {mood === "happy" ? <path className="sy-brian-mouth" d="M80 130 Q90 144 100 130 Q110 144 120 130" />
        : mood === "angry" ? <><path className="sy-brian-mouth" d="M78 142 Q100 126 122 142" /><path className="sy-brian-fang" d="M86 137 L90 148 L94 135 M106 135 L110 148 L114 137" /></>
          : mood === "laugh" ? <path className="sy-brian-open" d="M78 130 Q100 168 122 130 Z" />
            : mood === "hurt" ? <path className="sy-brian-mouth" d="M80 140 L88 134 L96 140 L104 134 L112 140 L120 134" />
              : ko ? <path className="sy-brian-mouth" d="M84 140 Q100 132 116 140" />
                : <path className="sy-brian-mouth" d="M86 130 Q93 138 100 130 Q107 138 114 130" />}
      <path className="sy-brian-whisker" d="M60 124 L18 116 M60 132 L16 136 M140 124 L182 116 M140 132 L184 136" />
    </g>
    <g className="sy-brian-crown"><polygon points="72,40 80,16 92,34 100,10 108,34 120,16 128,40" /></g>
  </svg>;
}

const quips = ["Feed me a train.", "I knock code off tables for fun.", "Your semicolons look weak.", "Purr… run the tests, human."];

/** The client's picture on a Blaster level: Brian reacting to what the yard printed. */
export function BrianArt({ printed, ok, value }: { printed: string | null; ok: boolean | null; value: unknown }) {
  const [quip, setQuip] = useState(0);
  useEffect(() => { const timer = window.setInterval(() => setQuip((n) => (n + 1) % quips.length), 3600); return () => window.clearInterval(timer); }, []);
  const mood: Mood = printed === null ? "idle" : ok ? "happy" : "angry";
  return <div className={`sy-brian-art is-${mood}`}>
    <Brian mood={mood} key={`${String(value)}-${printed}`} />
    <p className="sy-bubble" key={`b-${String(value)}-${printed}`}>{printed === null ? quips[quip] : ok ? <><b>{printed || "…"}</b> Purrfect.</> : <><b>{printed || "(nothing)"}</b> HISSSS! Wrong!</>}</p>
    {printed !== null && ok && <span className="sy-hearts" aria-hidden="true">{[0, 1, 2].map((n) => <i key={n} style={{ "--i": n } as CSSProperties}>♥</i>)}</span>}
  </div>;
}

const hitWords = ["POW!", "BAM!", "KAPOW!"];
const taunts = ["You cannot defeat MAXIMUM CHONK.", "Is that a > or a >=? Even I can't tell.", "I have nine lives. You have three trains.", "Over 9000? You can't even count to 9000."];

/** The boss fight: Brian's HP bar drops one bar per passing test. A miss makes him laugh. */
export function BossHud({ hits, misses, running }: { hits: number; misses: number; running: boolean }) {
  const [taunt, setTaunt] = useState(0);
  useEffect(() => { const timer = window.setInterval(() => setTaunt((n) => (n + 1) % taunts.length), 3800); return () => window.clearInterval(timer); }, []);
  const ko = hits >= 3;
  // The latest event decides his face: a hit hurts, a miss makes him laugh.
  const [last, setLast] = useState<"hit" | "miss" | null>(null);
  useEffect(() => { if (hits) { setLast("hit"); if (hits >= 3) playMeow(.2, .6); } }, [hits]);
  useEffect(() => { if (misses) { setLast("miss"); playHiss(); } }, [misses]);
  useEffect(() => { if (!hits && !misses) setLast(null); }, [hits, misses]);
  const mood: Mood = ko ? "ko" : last === "hit" ? "hurt" : last === "miss" ? "laugh" : running ? "angry" : "idle";
  return <div className={`sy-boss is-${mood}`} aria-label={`Boss HP: ${3 - Math.min(3, hits)} of 3`}>
    <div className="sy-boss-bar"><b>MEGA CAT BRIAN</b><span>{[0, 1, 2].map((n) => <i key={n} className={n < 3 - hits ? "is-on" : ""} />)}</span><small>HP</small></div>
    <div className="sy-boss-fighter">
      <Brian mood={mood} key={`${hits}-${misses}`} />
      {last === "hit" && !ko && <em className="sy-boss-word" key={`h${hits}`}>{hitWords[(hits - 1) % hitWords.length]}</em>}
      {last === "miss" && !ko && <em className="sy-boss-word is-laugh" key={`m${misses}`}>MWAHAHA!</em>}
      {ko && <em className="sy-boss-ko">K.O.!!!</em>}
    </div>
    <p className="sy-bubble" key={`${taunt}-${mood}`}>{ko ? "Nooo… my nine lives… you win, coder." : last === "miss" ? "Missed me! My HP is back to full next run." : last === "hit" ? "Ouch! Lucky shot!" : taunts[taunt]}</p>
  </div>;
}

/** Brian walks across the editor, leaving paw prints and a MEOW in the code. */
export function PawWalk() {
  return <div className="sy-paws" aria-hidden="true">
    {Array.from({ length: 8 }, (_, i) => <i key={i} style={{ "--i": i, "--y": `${i % 2 ? 58 : 38}%` } as CSSProperties}>🐾</i>)}
    <span className="sy-paws-cat"><Brian mood="happy" /></span>
    <b className="sy-paws-shout">MEOW!</b>
  </div>;
}

const icons = ["⌨️", "🙃", "👑"];

/** Solving the Mystery line sets off an alarm, and Brian crashes through the screen. */
export function BlasterReveal({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<"alarm" | "boom">(() => reducedMotion() ? "boom" : "alarm");
  useEffect(() => {
    if (phase === "boom") { playFx("win"); playMeow(.3); playMeow(.75, 1.35); return; }
    playSiren();
    const timer = window.setTimeout(() => setPhase("boom"), 1700);
    return () => window.clearTimeout(timer);
  }, [phase]);
  const words = ["SUPER", "MEGA", "BLASTER", "PLUS", "ADVANCED"];
  return <div className={`sy-blast is-${phase}`} role="dialog" aria-modal="true" aria-label="Super Mega Blaster Plus Advanced unlocked">
    {phase === "alarm" ? <div className="sy-blast-alarm"><b>⚠ SYSTEM OVERLOAD ⚠</b><small>SOMETHING CHONKY IS COMING</small></div> : <>
      <span className="sy-blast-rays" aria-hidden="true" />
      <span className="sy-blast-shards" aria-hidden="true">{Array.from({ length: 14 }, (_, i) => <i key={i} style={{ "--a": `${i * 26}deg`, "--d": `${(i % 4) * 40}ms` } as CSSProperties} />)}</span>
      <Fx fx={{ id: 3, kind: "win", text: "" }} scope="inline" mega />
      <Brian mood="laugh" className="sy-blast-cat" />
      <div className="sy-blast-copy">
        <small>THE MYSTERY LINE WAS ONLY THE BEGINNING</small>
        <h2 className="sy-blast-title">{words.map((word, i) => <span key={word} style={{ "--i": i } as CSSProperties}>{word}</span>)}</h2>
        <p>{blasterCount} hidden levels. You type <b>every line</b> yourself, and <b>MEGA CAT BRIAN</b> will do everything he can to stop you.</p>
        <ol className="sy-blast-cards">{levels.slice(mysteryEnd).map((level, i) => <li key={level.id} style={{ "--i": i } as CSSProperties}><b>{icons[i]}</b><small>BLASTER {i + 1}</small><span>{level.title}</span></li>)}</ol>
        <p className="sy-blast-goal">Beat all three to earn the <b>{BADGE_NAME}</b> badge.</p>
        <button className="sy-go is-cue" autoFocus onClick={onDone}><Rocket size={16} /> BLAST OFF <ArrowRight size={16} /></button>
      </div>
    </>}
  </div>;
}

/** The badge itself: Brian on a spinning gold disc with a ribbon. */
export function MegaCatEmblem({ small = false }: { small?: boolean }) {
  return <span className={`sy-megacat ${small ? "is-small" : ""}`} aria-hidden="true">
    <span className="sy-megacat-rays" />
    <span className="sy-megacat-disc"><Brian mood="happy" /></span>
    <b className="sy-megacat-ribbon">{BADGE_NAME}</b>
  </span>;
}

/** Shipping the last Blaster level: the MEGA CAT BRIAN badge, with fireworks that keep going. */
export function MegaCatBadge({ stars, onDone }: { stars: number; onDone: () => void }) {
  const [boom, setBoom] = useState(1);
  useEffect(() => {
    playFx("win"); playMeow(.4); playMeow(.8, 1.25); playMeow(1.2, 1.5);
    if (reducedMotion()) return;
    const timer = window.setInterval(() => setBoom((n) => n < 5 ? n + 1 : n), 1300);
    return () => window.clearInterval(timer);
  }, []);
  return <div className="sy-blast is-badge" role="dialog" aria-modal="true" aria-label={`${BADGE_NAME} badge`}>
    <span className="sy-blast-rays" aria-hidden="true" />
    <Fx fx={{ id: 10 + boom, kind: "win", text: "" }} scope="inline" mega />
    <MegaCatEmblem />
    <div className="sy-blast-copy">
      <small>BADGE EARNED · SUPER MEGA BLASTER PLUS ADVANCED</small>
      <h2 className="sy-blast-title is-badge">{BADGE_NAME.split(" ").map((word, i) => <span key={word} style={{ "--i": i } as CSSProperties}>{word}</span>)}</h2>
      <div className="sy-stars" aria-label={`${stars} of ${blasterCount * 3} Blaster stars`}>{Array.from({ length: blasterCount * 3 }, (_, n) => <Star key={n} size={24} className={n < stars ? "is-on" : ""} style={{ "--i": n } as CSSProperties} />)}</div>
      <p>You cleaned up after a cat, read a rule through a mirror and knocked out a boss with three trains. Brian bows to you. Only the chonkiest coders hold this badge.</p>
      <button className="sy-go is-cue" autoFocus onClick={onDone}>BACK TO THE SWITCHYARD <ArrowRight size={16} /></button>
    </div>
  </div>;
}
