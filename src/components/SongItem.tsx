// src/components/SongItem.tsx
import { useEffect, useState } from "react";

/* 🔊 Gedeelde audio player (module-scope) */
let globalAudio: HTMLAudioElement | null = null;
let currentPreview: string | null = null;
let setGlobalPlaying: ((v: boolean) => void) | null = null;

type Props = {
  rank: number;
  title: string;
  artist: string;
  image?: string | null;
  preview?: string | null;
  points: number;
  appearances: number;
};

export default function SongItem({
  rank,
  title,
  artist,
  image,
  preview,
  points,
  appearances,
}: Props) {
  const [playing, setPlaying] = useState(false);

  /* stop playing indicator if another item starts */
  useEffect(() => {
    if (setGlobalPlaying !== setPlaying) {
      setPlaying(false);
    }
  }, []);

  function togglePreview() {
    if (!preview) return;

    // stop current
    if (globalAudio && currentPreview === preview) {
      globalAudio.pause();
      globalAudio.currentTime = 0;
      setPlaying(false);
      currentPreview = null;
      return;
    }

    // stop previous audio
    if (globalAudio) {
      globalAudio.pause();
      globalAudio.currentTime = 0;
    }

    // notify previous component
    if (setGlobalPlaying) setGlobalPlaying(false);

    // create / reuse audio
    globalAudio = new Audio(preview);
    globalAudio.preload = "auto";
    currentPreview = preview;
    setGlobalPlaying = setPlaying;

    globalAudio.onended = () => {
      setPlaying(false);
      currentPreview = null;
    };

    globalAudio
      .play()
      .then(() => setPlaying(true))
      .catch(() => {});
  }

  const medal =
    rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : null;

  return (
    <div className={`result-row ${rank <= 3 ? "top-rank" : ""}`}>
      {/* Rank */}
      <div className="rank">{medal ?? rank}</div>

      {/* Cover */}
      <img
        className="result-cover"
        src={image || "https://via.placeholder.com/120?text=Geen+cover"}
        alt={title}
        loading="lazy"
      />

      {/* Info */}
      <div className="result-meta">
        <div className="result-title">{title}</div>
        <div className="result-artist">{artist}</div>

        <div className="result-stats">
          <span>⭐ {points} punten</span>
          <span>• 🗳️ {appearances} stemmen</span>
        </div>
      </div>

      {/* Actions */}
      <div className="result-actions">
        {preview ? (
          <button
            className={`btn preview-btn ${playing ? "playing" : ""}`}
            onClick={togglePreview}
          >
            {playing ? "⏸ Pauzeer" : "▶ Preview"}
          </button>
        ) : (
          <button className="btn disabled" disabled>
            Geen preview
          </button>
        )}
      </div>
    </div>
  );
}
