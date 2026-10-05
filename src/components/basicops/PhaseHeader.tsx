import { ArrowLeft, Volume2, VolumeX } from "lucide-react";
import { Brand } from "../Brand";

type PhaseHeaderProps = {
  name: string;
  crumb: string;
  title: string;
  soundOn: boolean;
  onToggleSound: () => void;
  onHome?: () => void;
  onBack: () => void;
};

export function PhaseHeader({ name, crumb, title, soundOn, onToggleSound, onHome, onBack }: PhaseHeaderProps) {
  return (
    <header className="playground-header bo-header">
      <div className="playground-identity">
        <Brand compact asButton onClick={onBack} />
        <span className="header-divider" />
        <div>
          <span>{crumb}</span>
          <strong>{title}</strong>
        </div>
      </div>
      <div className="playground-tools">
        <button
          className="icon-text-button"
          onClick={onToggleSound}
          aria-pressed={soundOn}
          aria-label={soundOn ? "Mute sound" : "Enable sound"}
        >
          {soundOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
          <span>{soundOn ? "SOUND" : "MUTED"}</span>
        </button>
        <span className="student-chip"><i /> {name}</span>
        {onHome && (
          <button className="icon-text-button back-button" onClick={onHome}>
            <ArrowLeft size={17} /> <span>MODULE</span>
          </button>
        )}
      </div>
    </header>
  );
}
