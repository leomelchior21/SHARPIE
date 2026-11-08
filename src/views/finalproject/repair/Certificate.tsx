import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Camera, Download, Sparkles, X } from "lucide-react";
import { sfx } from "./sound";
import "./certificate.css";

/*
 * The end of the whole Final Project: a golden scroll, tied with a ribbon.
 * Untie it and it unrolls into a certificate: "Welcome to the Family, <name> Maker!", with the student's photo
 * and Leo Maker's signature. It downloads as a picture. The photo stays on this device.
 */

/** Leo Maker's signature, as one SVG path (also drawn on the downloaded picture). */
export const SIGNATURE = [
  "M20 70 C22 40 30 18 38 20 C46 22 36 50 28 66 C24 74 34 76 48 70",
  "C54 66 60 60 58 56 C56 52 48 58 50 66 C52 72 60 72 66 66",
  "C70 60 76 56 80 60 C84 66 78 72 72 70 C68 68 72 60 80 62 C84 63 88 64 94 61",
  "M108 72 C112 50 116 34 120 30 C124 40 126 56 128 64 C132 50 138 34 142 30 C146 44 146 60 150 70",
  "C154 62 158 58 164 58 C158 56 152 64 156 70 C160 72 164 66 166 60 C166 66 168 72 174 70",
  "C178 58 182 40 184 30 C182 46 180 60 180 72 C184 62 192 56 194 60 C190 64 184 66 186 66 C190 68 194 72 200 70",
  "C206 66 212 60 210 56 C208 52 200 58 202 66 C204 72 212 72 218 66",
  "C220 62 222 58 224 58 C226 62 226 64 228 62 C230 58 234 58 240 62",
  "M30 86 C90 94 180 92 262 76",
].join(" ");

const SCRIPT = `"Snell Roundhand", "Segoe Script", "Brush Script MT", "Apple Chancery", cursive`;
const SERIF = `"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif`;
const photoKey = (login: string) => `sharpie.certificate.photo.${encodeURIComponent(login.trim().toLowerCase())}`;
const today = () => new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
export const makerName = (name: string) => `${(name.trim().split(/\s+/)[0] || "Student").replace(/^./, (c) => c.toUpperCase())} Maker`;

/** A photo, made small enough to keep on the device. */
function shrink(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const side = 480, s = Math.min(img.width, img.height);
      const c = document.createElement("canvas");
      c.width = c.height = side;
      c.getContext("2d")!.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, side, side);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("not a picture")); };
    img.src = url;
  });
}

export function Certificate({ name, login, onClose }: { name: string; login: string; onClose: () => void }) {
  const [stage, setStage] = useState<"tied" | "untying" | "open">("tied");
  const [photo, setPhoto] = useState<string | null>(() => { try { return localStorage.getItem(photoKey(login)); } catch { return null; } });
  const [busy, setBusy] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const maker = makerName(name);
  const date = useRef(today()).current;

  const untie = () => {
    if (stage !== "tied") return;
    sfx.whoosh();
    setStage("untying");
    window.setTimeout(() => { sfx.cash(); setStage("open"); }, 1500);
  };
  const pick = async (f: File | undefined) => {
    if (!f) return;
    try {
      const data = await shrink(f);
      setPhoto(data);
      sfx.good();
      try { localStorage.setItem(photoKey(login), data); } catch { /* still shows for this visit */ }
    } catch { sfx.wrong(); }
  };
  const download = async () => {
    setBusy(true);
    try {
      const url = await drawCertificate({ maker, photo, date });
      const a = document.createElement("a");
      a.href = url;
      a.download = `Welcome-to-the-Family-${maker.replace(/\s+/g, "-")}.png`;
      document.body.appendChild(a); a.click(); a.remove();
      sfx.cash();
    } finally { setBusy(false); }
  };
  useEffect(() => { sfx.power(); }, []);

  return <div className={`mk is-${stage}`} role="dialog" aria-label="Your Maker certificate">
    <div className="mk-rays" aria-hidden="true" />
    <div className="mk-sparkles" aria-hidden="true">{Array.from({ length: 28 }, (_, i) => <i key={i} style={{ "--i": i, "--x": `${(i * 37) % 100}%`, "--d": `${2 + (i % 5) * 0.6}s`, "--s": `${6 + (i % 4) * 4}px` } as CSSProperties} />)}</div>
    <button className="mk-x" aria-label="Close" onClick={onClose}><X size={20} /></button>

    {stage !== "open" && <div className="mk-gift">
      <p className="mk-kicker"><Sparkles size={18} /> A golden delivery for {maker.split(" ")[0]} <Sparkles size={18} /></p>
      <button className="mk-scroll" onClick={untie} aria-label="Untie the ribbon">
        <span className="mk-roll mk-roll-top" />
        <span className="mk-paper" />
        <span className="mk-roll mk-roll-bottom" />
        <span className="mk-shine" />
        <span className="mk-ribbon" />
        <span className="mk-bow"><i /><i /><b /></span>
      </button>
      <p className="mk-hint">{stage === "tied" ? "Tap the bow to untie it" : "…"}</p>
    </div>}

    {stage === "open" && <div className="mk-open">
      <article className="mk-cert" aria-label={`Certificate: Welcome to the Family, ${maker}!`}>
        <span className="mk-corner is-tl" /><span className="mk-corner is-tr" /><span className="mk-corner is-bl" /><span className="mk-corner is-br" />
        <header>
          <small>SHARPIE · FINAL PROJECT</small>
          <h1>Certificate of Maker Mastery</h1>
        </header>
        <div className="mk-body">
          <button className={`mk-photo ${photo ? "has-photo" : ""}`} onClick={() => file.current?.click()} aria-label={photo ? "Change your photo" : "Add your photo"}>
            {photo ? <img src={photo} alt="" /> : <span><Camera size={30} /><b>Add your photo</b></span>}
          </button>
          <input ref={file} type="file" accept="image/*" hidden onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = ""; }} />
          <div className="mk-words">
            <p className="mk-welcome">Welcome to the Family,</p>
            <p className="mk-name">{maker}!</p>
            <p className="mk-text">has reached the <b>final level of Maker Mastery</b>. Years of code, circuits, squashed bugs and machines brought back to life, all of that magnanimous work and expertise came to this. The Maker family is proud to have you.</p>
          </div>
        </div>
        <footer>
          <div className="mk-sign">
            <svg viewBox="0 0 280 100" aria-label="Signature of Leo Maker"><path d={SIGNATURE} /></svg>
            <span>Leo Maker</span>
            <small>Teacher · Head of the Maker Family</small>
          </div>
          <div className="mk-seal" aria-hidden="true"><span>MAKER<br /><b>★</b><br />FAMILY</span><i /><i /></div>
          <div className="mk-date"><b>{date}</b><small>Date</small></div>
        </footer>
      </article>
      <div className="mk-actions">
        <button className="mk-btn" onClick={() => file.current?.click()}><Camera size={18} /> {photo ? "Change photo" : "Add your photo"}</button>
        <button className="mk-btn is-gold" disabled={busy} onClick={download}><Download size={18} /> {busy ? "Making it…" : "Download"}</button>
      </div>
    </div>}
  </div>;
}

/** The certificate as a picture to download: drawn again on a canvas, the same as on screen. */
export async function drawCertificate({ maker, photo, date }: { maker: string; photo: string | null; date: string }): Promise<string> {
  const W = 2000, H = 1414;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const g = c.getContext("2d")!;
  // Parchment and gold frame.
  const bg = g.createRadialGradient(W / 2, H / 2, 200, W / 2, H / 2, 1200);
  bg.addColorStop(0, "#fffaf0"); bg.addColorStop(1, "#f3e3bd");
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  const gold = g.createLinearGradient(0, 0, W, H);
  gold.addColorStop(0, "#b8862b"); gold.addColorStop(0.35, "#ffe08a"); gold.addColorStop(0.6, "#c99a3a"); gold.addColorStop(1, "#ffd76a");
  g.strokeStyle = gold; g.lineWidth = 34; g.strokeRect(40, 40, W - 80, H - 80);
  g.lineWidth = 6; g.strokeRect(92, 92, W - 184, H - 184);
  g.fillStyle = gold;
  for (const [x, y] of [[92, 92], [W - 92, 92], [92, H - 92], [W - 92, H - 92]]) { g.beginPath(); g.arc(x, y, 30, 0, Math.PI * 2); g.fill(); }
  const center = (text: string, y: number, font: string, color = "#3a2a10") => { g.font = font; g.fillStyle = color; g.textAlign = "center"; g.fillText(text, W / 2, y); };
  center("SHARPIE · FINAL PROJECT", 210, `700 34px ${SERIF}`, "#8a6a2a");
  center("Certificate of Maker Mastery", 300, `700 76px ${SERIF}`);
  // Photo in a gold ring.
  const px = 420, py = 720, pr = 210;
  g.save(); g.beginPath(); g.arc(px, py, pr, 0, Math.PI * 2); g.closePath();
  if (photo) {
    const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = photo; });
    g.clip(); g.drawImage(img, px - pr, py - pr, pr * 2, pr * 2);
  } else { g.fillStyle = "#efe2c2"; g.fill(); }
  g.restore();
  g.strokeStyle = gold; g.lineWidth = 18; g.beginPath(); g.arc(px, py, pr + 9, 0, Math.PI * 2); g.stroke();
  // The words.
  const tx = 1220;
  g.textAlign = "center"; g.fillStyle = "#3a2a10";
  g.font = `400 70px ${SCRIPT}`; g.fillText("Welcome to the Family,", tx, 560);
  let size = 150;
  do { g.font = `700 ${size}px ${SCRIPT}`; size -= 6; } while (g.measureText(`${maker}!`).width > 1050 && size > 60);
  g.fillStyle = "#9a6b12"; g.fillText(`${maker}!`, tx, 720);
  g.fillStyle = "#3a2a10"; g.font = `400 38px ${SERIF}`;
  const text = "has reached the final level of Maker Mastery. Years of code, circuits, squashed bugs and machines brought back to life, all of that magnanimous work and expertise came to this. The Maker family is proud to have you.";
  const words = text.split(" "); let line = "", y = 820;
  for (const w of words) { const test = line ? `${line} ${w}` : w; if (g.measureText(test).width > 1000) { g.fillText(line, tx, y); line = w; y += 54; } else line = test; }
  g.fillText(line, tx, y);
  // Signature, seal and date.
  g.save(); g.translate(260, 1030); g.scale(2.2, 2.2);
  g.strokeStyle = "#1f3b8a"; g.lineWidth = 2.6; g.lineCap = "round"; g.lineJoin = "round"; g.stroke(new Path2D(SIGNATURE)); g.restore();
  g.strokeStyle = "#8a6a2a"; g.lineWidth = 3; g.beginPath(); g.moveTo(260, 1250); g.lineTo(880, 1250); g.stroke();
  g.textAlign = "center"; g.fillStyle = "#3a2a10"; g.font = `700 40px ${SERIF}`; g.fillText("Leo Maker", 570, 1300);
  g.font = `400 28px ${SERIF}`; g.fillStyle = "#6b5530"; g.fillText("Teacher · Head of the Maker Family", 570, 1340);
  const sx = W / 2 + 60, sy = 1180;
  g.fillStyle = "#c0392b";
  g.beginPath(); g.moveTo(sx - 60, sy + 60); g.lineTo(sx - 100, sy + 200); g.lineTo(sx - 60, sy + 175); g.lineTo(sx - 30, sy + 210); g.lineTo(sx - 10, sy + 60); g.fill();
  g.beginPath(); g.moveTo(sx + 60, sy + 60); g.lineTo(sx + 100, sy + 200); g.lineTo(sx + 60, sy + 175); g.lineTo(sx + 30, sy + 210); g.lineTo(sx + 10, sy + 60); g.fill();
  g.beginPath();
  for (let i = 0; i < 48; i++) { const a = (i / 48) * Math.PI * 2, r = i % 2 ? 120 : 135; g.lineTo(sx + Math.cos(a) * r, sy + Math.sin(a) * r); }
  g.closePath(); g.fillStyle = gold; g.fill();
  g.beginPath(); g.arc(sx, sy, 98, 0, Math.PI * 2); g.strokeStyle = "#8a6a2a"; g.lineWidth = 4; g.stroke();
  g.fillStyle = "#5a3d00"; g.font = `800 30px ${SERIF}`; g.fillText("MAKER", sx, sy - 22); g.font = `800 44px ${SERIF}`; g.fillText("★", sx, sy + 22); g.font = `800 30px ${SERIF}`; g.fillText("FAMILY", sx, sy + 62);
  g.fillStyle = "#3a2a10"; g.font = `700 40px ${SERIF}`; g.fillText(date, 1560, 1250);
  g.strokeStyle = "#8a6a2a"; g.beginPath(); g.moveTo(1340, 1270); g.lineTo(1780, 1270); g.stroke();
  g.font = `400 28px ${SERIF}`; g.fillStyle = "#6b5530"; g.fillText("Date", 1560, 1310);
  return c.toDataURL("image/png");
}
