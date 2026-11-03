import type { ReactNode } from "react";
import type { Input } from "../content";
import type { YardLevel } from "./levels";

/*
 * Each level's client, drawn as a flat cartoon in the explainer video's style: thick dark outlines,
 * flat colours, simple faces. The picture reacts to what the program printed, so a wrong rule shows
 * the wrong thing happening (a 140 cm kid sent away, a thank-you for a late book).
 */
const INK = "#1d1d1f";
const CREAM = "#fffdf6";
const YELLOW = "#ffd23f";
const GREEN = "#22b07d";
const GREEN_L = "#bfe8d3";
const ORANGE = "#ff7a45";
const ORANGE_L = "#ffd2bd";
const SKY = "#dcefff";
const SKIN = "#ffd9a8";
const GREY = "#d9d2c3";
const BLUE = "#5b8def";
const o = { stroke: INK, strokeWidth: 3, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };

/** yes: the TRUE message printed. no: the ELSE message. nothing: no message. idle: not run yet. */
export type Mood = "yes" | "no" | "nothing" | "idle";
export const moodOf = (level: YardLevel, printed: string | null): Mood => printed === null ? "idle" : printed === level.yes ? "yes" : printed === level.no ? "no" : "nothing";

function Face({ x, y, r = 16, mood }: { x: number; y: number; r?: number; mood: "happy" | "sad" | "flat" }) {
  const mouth = mood === "happy" ? `M${x - r * .4} ${y + r * .25}Q${x} ${y + r * .65} ${x + r * .4} ${y + r * .25}` : mood === "sad" ? `M${x - r * .38} ${y + r * .5}Q${x} ${y + r * .15} ${x + r * .38} ${y + r * .5}` : `M${x - r * .35} ${y + r * .38}H${x + r * .35}`;
  return <g>
    <circle cx={x} cy={y} r={r} fill={SKIN} {...o} />
    <circle cx={x - r * .35} cy={y - r * .15} r={2.2} fill={INK} /><circle cx={x + r * .35} cy={y - r * .15} r={2.2} fill={INK} />
    <path d={mouth} fill="none" {...o} strokeWidth={2.5} />
  </g>;
}

function Tag({ x, y, text, tone, angle = -4 }: { x: number; y: number; text: string; tone: "yes" | "no" | "ghost"; angle?: number }) {
  const w = Math.max(60, text.length * 8.5 + 22);
  const fill = tone === "yes" ? GREEN_L : tone === "no" ? ORANGE_L : CREAM;
  // The pop animation sits on an inner group so it never replaces the position.
  return <g transform={`translate(${x} ${y}) rotate(${angle})`}><g className="sy-art-pop">
    <rect x={-w / 2 + 3} y={-13 + 3} width={w} height={26} rx={7} fill={INK} />
    <rect x={-w / 2} y={-13} width={w} height={26} rx={7} fill={fill} {...o} strokeDasharray={tone === "ghost" ? "5 4" : undefined} />
    <text y={5.5} textAnchor="middle" className="sy-art-text">{text}</text>
  </g></g>;
}

const pill = (x: number, y: number, text: string) => <g transform={`translate(${x} ${y})`}>
  <rect x={-Math.max(26, text.length * 4.6 + 12)} y={-12} width={Math.max(52, text.length * 9.2 + 24)} height={24} rx={12} fill={YELLOW} {...o} />
  <text y={5} textAnchor="middle" className="sy-art-mono">{text}</text>
</g>;

const scenes: Record<string, (value: Input, mood: Mood) => ReactNode> = {
  cinema: (value, mood) => <>
    <rect x={18} y={44} width={112} height={98} rx={8} fill={CREAM} {...o} />
    <path d="M14 46 L24 22 H124 L134 46 Z" fill={ORANGE} {...o} />
    <path d="M38 22 L34 46 M58 22 L56 46 M78 22 V46 M98 22 L100 46 M116 22 L120 46" {...o} strokeWidth={2.5} />
    <rect x={34} y={58} width={80} height={56} rx={6} fill={SKY} {...o} />
    <Face x={74} y={88} mood={mood === "yes" ? "happy" : mood === "no" ? "flat" : "flat"} />
    {pill(74, 128, `age ${value}`)}
    {mood === "idle" ? <Tag x={182} y={86} text="TICKET?" tone="ghost" angle={-6} /> : mood === "nothing" ? <Tag x={182} y={86} text="no ticket" tone="ghost" angle={-6} />
      : <g transform="translate(182 86) rotate(-7)"><g className="sy-art-pop">
        <rect x={-46 + 3} y={-30 + 3} width={92} height={60} rx={8} fill={INK} />
        <rect x={-46} y={-30} width={92} height={60} rx={8} fill={mood === "yes" ? GREEN_L : SKY} {...o} />
        <line x1={-46} y1={-6} x2={46} y2={-6} {...o} strokeDasharray="4 4" strokeWidth={2} />
        <text y={-12} textAnchor="middle" className="sy-art-small">ADMIT ONE</text>
        <text y={18} textAnchor="middle" className="sy-art-text">{mood === "yes" ? "CHILD −50%" : "REGULAR"}</text>
      </g></g>}
  </>,
  delivery: (value, mood) => <>
    <rect x={20} y={16} width={84} height={130} rx={14} fill={CREAM} {...o} />
    <rect x={46} y={24} width={32} height={6} rx={3} fill={INK} />
    <text x={62} y={58} textAnchor="middle" className="sy-art-small">TOTAL</text>
    <text x={62} y={84} textAnchor="middle" className="sy-art-big">${value}</text>
    <rect x={32} y={100} width={60} height={22} rx={11} fill={YELLOW} {...o} /><text x={62} y={115} textAnchor="middle" className="sy-art-small">PAY</text>
    <g className={mood === "yes" ? "sy-art-drive" : ""}>
      <rect x={120} y={70} width={70} height={46} rx={6} fill={mood === "no" ? ORANGE_L : GREEN_L} {...o} />
      <path d="M190 84 H214 L226 100 V116 H190 Z" fill={CREAM} {...o} />
      <rect x={196} y={88} width={14} height={11} rx={2} fill={SKY} {...o} strokeWidth={2.5} />
      <circle cx={142} cy={120} r={9} fill={INK} /><circle cx={142} cy={120} r={3.5} fill={GREY} />
      <circle cx={206} cy={120} r={9} fill={INK} /><circle cx={206} cy={120} r={3.5} fill={GREY} />
    </g>
    {mood === "yes" ? <Tag x={172} y={46} text="FREE" tone="yes" /> : mood === "no" ? <Tag x={172} y={46} text="+ $5 fee" tone="no" /> : <Tag x={172} y={46} text={mood === "idle" ? "shipping?" : "no label"} tone="ghost" />}
  </>,
  fan: (value, mood) => {
    const level = Math.max(0, Math.min(1, Number(value) / 45));
    return <>
      <rect x={30} y={18} width={22} height={108} rx={11} fill={CREAM} {...o} />
      <rect x={36} y={24 + (1 - level) * 96} width={10} height={Math.max(4, level * 96)} rx={5} fill={ORANGE} />
      <circle cx={41} cy={132} r={14} fill={ORANGE} {...o} />
      <line x1={52} y1={66} x2={60} y2={66} {...o} strokeWidth={2} /><text x={64} y={70} className="sy-art-small">30°</text>
      {pill(41, 154, `${value}°C`)}
      <line x1={160} y1={110} x2={160} y2={142} {...o} strokeWidth={5} />
      <rect x={128} y={140} width={64} height={10} rx={5} fill={GREY} {...o} />
      <circle cx={160} cy={70} r={44} fill={SKY} {...o} />
      <g className={mood === "yes" ? "sy-art-spin" : ""} style={{ transformOrigin: "160px 70px" }}>
        {[0, 120, 240].map((a) => <ellipse key={a} cx={160} cy={46} rx={11} ry={22} fill={mood === "yes" ? GREEN_L : CREAM} {...o} transform={`rotate(${a} 160 70)`} />)}
      </g>
      <circle cx={160} cy={70} r={7} fill={YELLOW} {...o} />
      {mood === "yes" ? <Tag x={208} y={22} text="ON" tone="yes" angle={6} /> : mood === "no" ? <Tag x={208} y={22} text="OFF" tone="no" angle={6} /> : null}
    </>;
  },
  battery: (value, mood) => {
    const pct = Math.max(0, Math.min(100, Number(value)));
    return <>
      <rect x={72} y={10} width={96} height={146} rx={16} fill={mood === "yes" ? ORANGE_L : mood === "no" ? GREEN_L : CREAM} {...o} />
      <rect x={104} y={18} width={32} height={6} rx={3} fill={INK} />
      <rect x={96} y={42} width={44} height={22} rx={4} fill={CREAM} {...o} /><rect x={140} y={48} width={5} height={10} rx={1.5} fill={INK} />
      <rect x={99} y={45} width={Math.max(2, pct / 100 * 38)} height={16} rx={2} fill={pct < 20 ? ORANGE : GREEN} />
      <text x={120} y={104} textAnchor="middle" className="sy-art-big">{pct}%</text>
      {mood === "yes" ? <Tag x={120} y={132} text="Low battery" tone="no" angle={0} /> : mood === "no" ? <Tag x={120} y={132} text="Battery OK" tone="yes" angle={0} /> : null}
    </>;
  },
  vault: (value, mood) => <>
    {pill(120, 16, `code ${value}`)}
    <rect x={44} y={34} width={152} height={118} rx={10} fill={GREY} {...o} />
    {mood === "yes" ? <>
      <rect x={60} y={46} width={120} height={94} rx={6} fill={INK} />
      {[0, 1, 2].map((i) => <rect key={i} x={72 + i * 34} y={112} width={30} height={16} rx={3} fill={YELLOW} {...o} strokeWidth={2.5} />)}
      <rect x={84} y={94} width={30} height={16} rx={3} fill={YELLOW} {...o} strokeWidth={2.5} />
      <ellipse cx={196} cy={93} rx={18} ry={52} fill={GREY} {...o} className="sy-art-pop" />
    </> : <>
      <circle cx={120} cy={93} r={46} fill={CREAM} {...o} />
      {[0, 60, 120].map((a) => <line key={a} x1={120} y1={66} x2={120} y2={120} {...o} strokeWidth={5} transform={`rotate(${a} 120 93)`} />)}
      <circle cx={120} cy={93} r={9} fill={YELLOW} {...o} />
    </>}
    <circle cx={180} cy={48} r={6} fill={mood === "yes" ? GREEN : mood === "no" ? ORANGE : CREAM} {...o} strokeWidth={2.5} />
    {mood === "no" ? <Tag x={120} y={150} text="DENIED" tone="no" angle={0} /> : mood === "yes" ? <Tag x={120} y={150} text="OPEN" tone="yes" angle={0} /> : null}
  </>,
  arcade: (value, mood) => {
    const hp = Math.max(0, Math.min(100, Number(value)));
    return <>
      <rect x={14} y={14} width={212} height={136} rx={10} fill={SKY} {...o} />
      <rect x={16} y={116} width={208} height={32} fill={GREY} /><line x1={14} y1={116} x2={226} y2={116} {...o} />
      <circle cx={190} cy={52} r={14} fill={YELLOW} />
      <rect x={60} y={44} width={34} height={10} rx={5} fill={CREAM} /><rect x={118} y={38} width={40} height={10} rx={5} fill={CREAM} />
      <path d="M30 32 a6 6 0 0 1 10 -5 a6 6 0 0 1 10 5 q0 7 -10 13 q-10 -6 -10 -13Z" fill={ORANGE} {...o} strokeWidth={2.5} />
      <rect x={58} y={27} width={90} height={12} rx={6} fill={CREAM} {...o} strokeWidth={2.5} />
      <rect x={60} y={29} width={Math.max(0, hp / 100 * 86)} height={8} rx={4} fill={ORANGE} />
      <text x={160} y={38} className="sy-art-small">{hp}</text>
      <g className={mood === "no" ? "sy-art-jump" : ""}><rect x={62} y={88} width={28} height={28} rx={6} fill={GREEN_L} {...o} /><circle cx={71} cy={100} r={2} fill={INK} /><circle cx={81} cy={100} r={2} fill={INK} /></g>
      <path d="M150 116 l5 -14 l-12 -2 l12 -6 l-5 -12 l12 7 l5 -12 l4 13 l12 -5 l-7 12 l12 5 l-13 3 l4 13 l-12 -7Z" fill={ORANGE} {...o} strokeWidth={2.5} />
      {mood === "yes" && <g className="sy-art-pop"><rect x={14} y={14} width={212} height={136} rx={10} fill="rgba(29,29,31,.78)" /><text x={120} y={86} textAnchor="middle" className="sy-art-gameover">GAME OVER</text><text x={120} y={108} textAnchor="middle" className="sy-art-small sy-art-light">health {String(value)}</text></g>}
      {mood === "no" && <Tag x={120} y={70} text="KEEP PLAYING" tone="yes" angle={0} />}
    </>;
  },
  rain: (value, mood) => <>
    <rect x={14} y={14} width={212} height={136} rx={10} fill={value === true ? "#cfd9e6" : SKY} {...o} />
    {value === true ? <g>
      <path d="M60 52 a16 16 0 0 1 30 -10 a20 20 0 0 1 36 6 a14 14 0 0 1 2 28 H62 a12 12 0 0 1 -2 -24Z" fill={CREAM} {...o} />
      {[70, 90, 110, 130, 150, 170].map((x, i) => <line key={x} x1={x} y1={88 + (i % 2) * 6} x2={x - 6} y2={102 + (i % 2) * 6} {...o} strokeWidth={2.5} stroke={BLUE} className="sy-art-rain" style={{ animationDelay: `${i * .12}s` }} />)}
    </g> : <circle cx={178} cy={48} r={20} fill={YELLOW} {...o} />}
    <rect x={16} y={128} width={208} height={20} fill={GREY} /><line x1={14} y1={128} x2={226} y2={128} {...o} />
    <Face x={100} y={104} r={17} mood={mood === "nothing" ? "flat" : (mood === "yes") === (value === true) || mood === "idle" ? "happy" : "sad"} />
    {mood === "yes" && <g className="sy-art-pop"><path d="M62 84 Q100 44 138 84 Z" fill={ORANGE} {...o} /><line x1={100} y1={84} x2={100} y2={126} {...o} /></g>}
    {mood === "no" && <g className="sy-art-pop"><rect x={84} y={96} width={14} height={8} rx={3} fill={INK} /><rect x={102} y={96} width={14} height={8} rx={3} fill={INK} /><line x1={98} y1={99} x2={102} y2={99} {...o} strokeWidth={2} /></g>}
    {pill(186, 112, String(value))}
  </>,
  ride: (value, mood) => {
    const h = Math.max(100, Math.min(180, Number(value)));
    const top = 146 - (h - 100) * 1.2 - 34;
    return <>
      <rect x={20} y={10} width={30} height={138} rx={4} fill={YELLOW} {...o} />
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <line key={i} x1={20} y1={146 - i * 12} x2={i % 2 ? 30 : 36} y2={146 - i * 12} {...o} strokeWidth={2} />)}
      <line x1={14} y1={146 - 40 * 1.2} x2={96} y2={146 - 40 * 1.2} stroke={ORANGE} strokeWidth={3} strokeDasharray="6 4" />
      <text x={56} y={146 - 40 * 1.2 - 6} className="sy-art-small">140 cm</text>
      <Face x={78} y={top + 12} r={13} mood={mood === "yes" ? "happy" : mood === "no" ? "sad" : "flat"} />
      <rect x={68} y={top + 24} width={20} height={146 - top - 24} rx={6} fill={BLUE} {...o} />
      {pill(78, 158, `${value} cm`)}
      <path d="M120 120 Q150 30 180 80 T226 60" fill="none" {...o} strokeWidth={4} />
      <g className={mood === "yes" ? "sy-art-drive" : ""}><rect x={132} y={106} width={52} height={22} rx={6} fill={mood === "yes" ? GREEN_L : CREAM} {...o} /><circle cx={144} cy={132} r={6} fill={INK} /><circle cx={172} cy={132} r={6} fill={INK} /></g>
      {mood === "yes" ? <Tag x={178} y={26} text="RIDE OPEN" tone="yes" angle={4} /> : mood === "no" ? <Tag x={178} y={26} text="TOO SHORT" tone="no" angle={4} /> : null}
    </>;
  },
  library: (value, mood) => <>
    <path d="M24 30 H104 V140 H24 Z" fill={BLUE} {...o} />
    <path d="M34 30 V140" {...o} />
    <rect x={46} y={52} width={46} height={22} rx={3} fill={CREAM} {...o} strokeWidth={2.5} />
    <text x={69} y={67} textAnchor="middle" className="sy-art-small">BOOK</text>
    <rect x={120} y={22} width={92} height={70} rx={8} fill={CREAM} {...o} />
    <rect x={120} y={22} width={92} height={18} rx={8} fill={ORANGE} {...o} />
    <text x={166} y={70} textAnchor="middle" className="sy-art-big">{String(value)}</text>
    <text x={166} y={86} textAnchor="middle" className="sy-art-small">days late</text>
    {mood === "yes" ? <g className="sy-art-pop"><circle cx={150} cy={124} r={16} fill={YELLOW} {...o} /><text x={150} y={130} textAnchor="middle" className="sy-art-text">$</text><Tag x={194} y={124} text="FINE" tone="no" angle={-8} /></g>
      : mood === "no" ? <g className="sy-art-pop"><path d="M150 138 q-24 -14 -24 -28 a12 12 0 0 1 24 -4 a12 12 0 0 1 24 4 q0 14 -24 28Z" fill={ORANGE} {...o} /><Tag x={200} y={122} text="THANKS" tone="yes" angle={-8} /></g> : null}
  </>,
  pool: (value, mood) => <>
    <rect x={16} y={82} width={208} height={62} rx={10} fill={GREY} {...o} />
    <rect x={26} y={90} width={188} height={46} rx={6} fill={mood === "no" ? "#bcd3e8" : "#8fd0f5"} {...o} />
    <path d="M36 108 q10 -6 20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0" fill="none" stroke={CREAM} strokeWidth={3} strokeLinecap="round" />
    <rect x={20} y={18} width={22} height={58} rx={11} fill={CREAM} {...o} />
    <rect x={26} y={24 + (1 - Math.max(0, Math.min(1, Number(value) / 40))) * 46} width={10} height={Math.max(4, Math.min(1, Number(value) / 40) * 46)} rx={5} fill={Number(value) >= 26 ? ORANGE : BLUE} />
    {pill(78, 36, `${value}°C`)}
    {mood === "yes" && <g className="sy-art-pop"><Face x={120} y={100} r={13} mood="happy" /><line x1={190} y1={30} x2={190} y2={84} {...o} /><path d="M190 30 H218 L210 40 L218 50 H190 Z" fill={GREEN} {...o} /></g>}
    {mood === "no" && <g className="sy-art-pop"><path d="M178 34 V74 M160 44 L196 64 M160 64 L196 44" stroke={BLUE} strokeWidth={4} strokeLinecap="round" /><Tag x={120} y={60} text="CLOSED" tone="no" angle={-5} /></g>}
  </>,
};

/** The client's picture for one level, reacting to what the program printed for this value. */
export function WorldArt({ level, value, printed }: { level: YardLevel; value: Input; printed: string | null }) {
  const mood = moodOf(level, printed);
  const draw = scenes[level.id] ?? scenes.cinema;
  return <svg className={`sy-art is-${mood}`} viewBox="0 0 240 166" role="img" aria-label={`${level.place}: ${printed === null ? "waiting for a train" : printed || "nothing printed"}`}>
    {draw(value, mood)}
    {mood === "nothing" && <Tag x={120} y={150} text="nothing happens" tone="ghost" angle={0} />}
  </svg>;
}
