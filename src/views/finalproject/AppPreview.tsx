import { BatteryFull, BatteryLow, Eye, EyeOff, Fan, FileSearch, GraduationCap, Heart, Lock, LockOpen, Megaphone, Ticket, TrendingUp, Truck } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import type { Input } from "./content";
import { storyFor } from "./labStories";

type Tone = "good" | "bad" | "warn" | "info" | "idle";

// How each printed message reads inside its app.
const tones: Record<string, Tone> = {
  "Approved": "good", "Try again": "warn",
  "Child discount": "good", "You get a child discount!": "good", "Regular ticket": "info", "Regular ticket price applies": "info",
  "BOOST": "good", "NORMAL": "info",
  "Free delivery": "good", "Delivery fee": "info",
  "Turn on the fan": "info", "Fan stays off": "idle",
  "Low battery": "bad", "Battery OK": "good",
  "Door unlocked": "good", "Access denied": "bad",
  "Game over": "bad", "Keep playing": "good",
  "Sponsored": "warn", "Organic": "info",
  "Needs review": "warn", "Evidence provided": "info",
  "SHOW + REVIEW": "good", "SHOW": "info", "HIDE": "bad",
};

interface Props {
  id: string;
  variable: string;
  value: Input;
  // What the program printed, or null before it has run.
  output: string | null;
  label?: string;
}

const money = (value: number) => `$${value.toFixed(0)}`;

export function AppPreview({ id, variable, value, output, label = "LIVE PREVIEW" }: Props) {
  const story = storyFor(id);
  const tone: Tone = output === null ? "idle" : tones[output] ?? "info";
  const number = typeof value === "number" ? value : 0;
  const on = (text: string) => output === text;
  let body: ReactNode;
  switch (id) {
    case "school":
      body = <div className="app-report"><GraduationCap size={26} /><small>REPORT CARD · STUDENT #0417</small><b>{String(value)}<em>/10</em></b>{output && <span className={`app-stamp is-${tone}`}>{output.toUpperCase()}</span>}</div>;
      break;
    case "movie":
      body = <div className="app-ticket"><div><Ticket size={22} /><small>LUMEN CINEMA · ADMIT ONE</small><b>AGE {String(value)}</b></div><strong>{output === null ? "—" : /child/i.test(output) ? "$6" : "$10"}</strong></div>;
      break;
    case "viral":
      body = <div className="app-post"><header><i style={{ background: story.hue }} /><span>@greenwatch</span>{output && <em className={`is-${tone}`}><TrendingUp size={13} /> {output}</em>}</header><p>New photos from the river near the data center. Worth checking.</p><footer><Eye size={14} /> {number.toLocaleString("en-US")} views</footer></div>;
      break;
    case "delivery":
      body = <div className="app-checkout"><Truck size={24} /><div><span>Order total</span><b>{money(number)}</b></div><div><span>Delivery</span><b className={`is-${tone}`}>{output === null ? "…" : on("Free delivery") ? "FREE" : output === "Delivery fee" ? "$4.99" : output}</b></div></div>;
      break;
    case "heat":
      body = <div className="app-fan"><b>{String(value)}°C</b><Fan size={58} className={on("Turn on the fan") ? "is-spinning" : ""} /><small>{on("Turn on the fan") ? "FAN ON" : output === null ? "STANDBY" : "FAN OFF"}</small></div>;
      break;
    case "battery":
      body = <div className="app-battery">{on("Low battery") ? <BatteryLow size={30} /> : <BatteryFull size={30} />}<div className={`app-cell is-${tone}`}><i style={{ width: `${Math.max(2, Math.min(100, number))}%` }} /></div><b>{number}%</b></div>;
      break;
    case "secret":
      body = <div className="app-vault">{on("Door unlocked") ? <LockOpen size={34} /> : <Lock size={34} />}<b>{String(value).padStart(2, "0")}</b><div className="app-keys">{[1, 2, 3, 4, 5, 6, 7, 8, 9].map((key) => <i key={key}>{key}</i>)}</div></div>;
      break;
    case "health":
      body = <div className="app-hud"><div><Heart size={18} fill="currentColor" /><span>HP</span><div className="app-hp"><i style={{ width: `${Math.max(0, Math.min(100, number))}%` }} /></div><b>{number}</b></div>{on("Game over") && <strong>GAME OVER</strong>}</div>;
      break;
    case "sponsored":
      body = <div className="app-post"><header><i style={{ background: "#ffd166" }} /><span>ECHO Partners</span>{output && <em className={`is-${tone}`}><Megaphone size={13} /> {output}</em>}</header><p>A brighter future, powered by ECHO. Discover the new campaign.</p><footer>{`${variable} = ${String(value)}`}</footer></div>;
      break;
    case "evidence":
      body = <div className="app-claim"><FileSearch size={26} /><p>"The river level dropped after the new facility opened."</p><footer>{`${variable} = ${String(value)}`}</footer>{output && <span className={`app-stamp is-${tone}`}>{output.toUpperCase()}</span>}</div>;
      break;
    default:
      body = <div className={`app-post ${on("HIDE") ? "is-hidden" : ""}`}><header><i style={{ background: "#8fd3b6" }} /><span>Forest Observatory</span>{output && <em className={`is-${tone}`}>{on("HIDE") ? <EyeOff size={13} /> : <Eye size={13} />} {output}</em>}</header><p>Community groups ask whether the facilities affect nearby waterways. Claims are still being checked.</p><footer>{`${variable} = ${String(value)}`}</footer></div>;
  }
  return <figure className={`app-device tone-${tone}`} style={{ "--app-hue": story.hue } as CSSProperties} aria-label={`${story.app} preview${output ? `: ${output}` : ""}`}>
    <figcaption><span className="app-dot" />{story.app.toUpperCase()}<small>{label}</small></figcaption>
    <div className="app-screen">{body}</div>
    <div className="app-console" role="status"><span>&gt;</span>{output === null ? <em>waiting for the program…</em> : output}</div>
  </figure>;
}
