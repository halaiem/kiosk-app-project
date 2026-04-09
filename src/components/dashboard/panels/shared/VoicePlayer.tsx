import { useEffect, useRef, useState, useCallback } from "react";
import Icon from "@/components/ui/icon";

interface VoicePlayerProps {
  url: string;
  bars?: number;
}

const SPEEDS = [1, 1.5, 2];
const peaksCache = new Map<string, number[]>();

function VoicePlayer({ url, bars = 36 }: VoicePlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [peaks, setPeaks] = useState<number[]>(() => peaksCache.get(url) || []);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(false);
  const [speedIdx, setSpeedIdx] = useState(0);

  useEffect(() => {
    if (peaks.length > 0) return;
    let cancelled = false;
    setLoading(true);

    const load = async () => {
      try {
        const res = await fetch(url);
        const buf = await res.arrayBuffer();
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new AudioCtx();
        const decoded = await ctx.decodeAudioData(buf.slice(0));
        ctx.close().catch(() => {});
        if (cancelled) return;

        const channel = decoded.getChannelData(0);
        const blockSize = Math.floor(channel.length / bars);
        const result: number[] = [];
        let maxV = 0;
        for (let i = 0; i < bars; i++) {
          let sum = 0;
          const start = i * blockSize;
          for (let j = 0; j < blockSize; j++) {
            sum += Math.abs(channel[start + j] || 0);
          }
          const avg = sum / blockSize;
          result.push(avg);
          if (avg > maxV) maxV = avg;
        }
        const normalized = result.map((v) => (maxV > 0 ? Math.min(1, v / maxV) : 0));
        peaksCache.set(url, normalized);
        if (!cancelled) setPeaks(normalized);
      } catch (e) {
        console.warn("Waveform decode failed:", e);
        if (!cancelled) {
          const fallback = Array.from({ length: bars }, () => 0.3 + Math.random() * 0.5);
          setPeaks(fallback);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [url, bars, peaks.length]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = SPEEDS[speedIdx];
  }, [speedIdx]);

  const togglePlay = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) a.play().catch((e) => console.warn("play failed", e));
    else a.pause();
  }, []);

  const cycleSpeed = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSpeedIdx((i) => (i + 1) % SPEEDS.length);
  };

  const onBarsClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const a = audioRef.current;
    if (!a || !duration || !isFinite(duration)) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    a.currentTime = ratio * duration;
    setCurrent(a.currentTime);
  };

  const progress = duration > 0 ? current / duration : 0;
  const fmt = (t: number) => {
    if (!isFinite(t) || t < 0) t = 0;
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };
  const speed = SPEEDS[speedIdx];

  return (
    <div className="flex items-center gap-2 min-w-0 w-full">
      <audio
        ref={audioRef}
        src={url}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => { setPlaying(false); setCurrent(0); }}
        onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration;
          if (isFinite(d)) setDuration(d);
          e.currentTarget.playbackRate = SPEEDS[speedIdx];
        }}
        onDurationChange={(e) => {
          const d = e.currentTarget.duration;
          if (isFinite(d)) setDuration(d);
        }}
      />

      <button
        onClick={togglePlay}
        className="shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground hover:opacity-90 flex items-center justify-center transition-opacity"
        title={playing ? "Пауза" : "Воспроизвести"}
      >
        <Icon name={playing ? "Pause" : "Play"} className="w-3.5 h-3.5" fallback="Play" />
      </button>

      <div
        className="flex-1 min-w-0 flex items-center gap-[2px] h-7 cursor-pointer select-none"
        onClick={onBarsClick}
      >
        {loading && peaks.length === 0 ? (
          <div className="flex-1 h-0.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full w-1/3 bg-primary/50 animate-pulse" />
          </div>
        ) : (
          peaks.map((lvl, i) => {
            const played = i / Math.max(1, peaks.length - 1) <= progress;
            return (
              <span
                key={i}
                className="w-[2px] rounded-full transition-colors"
                style={{
                  height: `${Math.max(14, Math.round(lvl * 100))}%`,
                  backgroundColor: "currentColor",
                  opacity: played ? 0.95 : 0.3,
                }}
              />
            );
          })
        )}
      </div>

      <span className="text-[9px] font-mono tabular-nums text-muted-foreground shrink-0 w-7 text-right">
        {fmt(duration > 0 ? (playing || current > 0 ? current : duration) : 0)}
      </span>

      <button
        onClick={cycleSpeed}
        title="Скорость воспроизведения"
        className="shrink-0 min-w-[28px] h-5 px-1 rounded text-[10px] font-bold tabular-nums transition-colors bg-muted hover:bg-primary/15 text-muted-foreground hover:text-primary"
      >
        {speed === 1 ? "1×" : `${speed}×`}
      </button>
    </div>
  );
}

export default VoicePlayer;
