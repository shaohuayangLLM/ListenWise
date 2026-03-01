"use client";

import {
  useEffect,
  useRef,
  useState,
  useCallback,
  useImperativeHandle,
  forwardRef,
} from "react";
import { Play, Pause, SkipBack, SkipForward } from "lucide-react";
import clsx from "clsx";

const SPEED_OPTIONS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0)
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export interface AudioPlayerHandle {
  seekTo: (time: number) => void;
}

interface AudioPlayerProps {
  fileUrl: string;
  onTimeUpdate?: (currentTime: number) => void;
}

const AudioPlayer = forwardRef<AudioPlayerHandle, AudioPlayerProps>(
  function AudioPlayer({ fileUrl, onTimeUpdate }, ref) {
    const audioRef = useRef<HTMLAudioElement>(null);
    const progressBarRef = useRef<HTMLDivElement>(null);
    const rafRef = useRef<number>(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [speed, setSpeed] = useState(1.0);
    const [ready, setReady] = useState(false);
    const [buffered, setBuffered] = useState(0);

    useImperativeHandle(ref, () => ({
      seekTo(time: number) {
        const audio = audioRef.current;
        if (audio) {
          audio.currentTime = time;
          setCurrentTime(time);
          onTimeUpdate?.(time);
        }
      },
    }));

    // Sync time via requestAnimationFrame for smooth updates
    useEffect(() => {
      const audio = audioRef.current;
      if (!audio) return;

      function tick() {
        if (audio) {
          const t = audio.currentTime;
          setCurrentTime(t);
          onTimeUpdate?.(t);
        }
        rafRef.current = requestAnimationFrame(tick);
      }

      const onPlay = () => {
        setIsPlaying(true);
        rafRef.current = requestAnimationFrame(tick);
      };
      const onPause = () => {
        setIsPlaying(false);
        cancelAnimationFrame(rafRef.current);
      };
      const onEnded = () => {
        setIsPlaying(false);
        cancelAnimationFrame(rafRef.current);
      };
      const onLoaded = () => {
        setDuration(audio.duration);
        setReady(true);
      };
      const onProgress = () => {
        if (audio.buffered.length > 0 && audio.duration > 0) {
          setBuffered(audio.buffered.end(audio.buffered.length - 1) / audio.duration);
        }
      };

      audio.addEventListener("play", onPlay);
      audio.addEventListener("pause", onPause);
      audio.addEventListener("ended", onEnded);
      audio.addEventListener("loadedmetadata", onLoaded);
      audio.addEventListener("progress", onProgress);
      audio.addEventListener("durationchange", onLoaded);

      return () => {
        cancelAnimationFrame(rafRef.current);
        audio.removeEventListener("play", onPlay);
        audio.removeEventListener("pause", onPause);
        audio.removeEventListener("ended", onEnded);
        audio.removeEventListener("loadedmetadata", onLoaded);
        audio.removeEventListener("progress", onProgress);
        audio.removeEventListener("durationchange", onLoaded);
      };
    }, [fileUrl, onTimeUpdate]);

    const togglePlay = useCallback(() => {
      const audio = audioRef.current;
      if (!audio) return;
      if (audio.paused) {
        audio.play();
      } else {
        audio.pause();
      }
    }, []);

    const skip = useCallback(
      (delta: number) => {
        const audio = audioRef.current;
        if (!audio) return;
        audio.currentTime = Math.max(
          0,
          Math.min(audio.duration || 0, audio.currentTime + delta)
        );
      },
      []
    );

    const cycleSpeed = useCallback(() => {
      setSpeed((prev) => {
        const idx = SPEED_OPTIONS.indexOf(prev);
        const next = SPEED_OPTIONS[(idx + 1) % SPEED_OPTIONS.length];
        if (audioRef.current) audioRef.current.playbackRate = next;
        return next;
      });
    }, []);

    const handleProgressClick = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        const bar = progressBarRef.current;
        const audio = audioRef.current;
        if (!bar || !audio || !duration) return;
        const rect = bar.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        audio.currentTime = ratio * duration;
      },
      [duration]
    );

    const progress = duration > 0 ? currentTime / duration : 0;

    return (
      <div className="bg-surface border border-border rounded-xl p-5 mb-6">
        {/* Hidden audio element */}
        <audio ref={audioRef} src={fileUrl} preload="metadata" />

        {/* Progress bar */}
        <div
          ref={progressBarRef}
          onClick={handleProgressClick}
          className="relative h-10 cursor-pointer group mb-4"
        >
          {/* Track */}
          <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-1.5 rounded-full bg-surface-2 overflow-hidden">
            {/* Buffered */}
            <div
              className="absolute inset-y-0 left-0 bg-[rgba(108,92,231,0.15)] rounded-full transition-[width] duration-300"
              style={{ width: `${buffered * 100}%` }}
            />
            {/* Progress */}
            <div
              className="absolute inset-y-0 left-0 bg-accent rounded-full"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          {/* Thumb */}
          <div
            className={clsx(
              "absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-accent border-2 border-white shadow-sm transition-transform",
              "group-hover:scale-125"
            )}
            style={{ left: `${progress * 100}%` }}
          />
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => skip(-10)}
            className="p-2 rounded-lg hover:bg-surface-2 text-text-dim transition-colors"
            title="后退 10 秒"
          >
            <SkipBack size={18} />
          </button>

          <button
            onClick={togglePlay}
            disabled={!ready}
            className={clsx(
              "w-10 h-10 rounded-full bg-accent text-white flex items-center justify-center transition-opacity",
              ready ? "hover:opacity-90" : "opacity-50"
            )}
          >
            {isPlaying ? (
              <Pause size={18} />
            ) : (
              <Play size={18} className="ml-0.5" />
            )}
          </button>

          <button
            onClick={() => skip(10)}
            className="p-2 rounded-lg hover:bg-surface-2 text-text-dim transition-colors"
            title="快进 10 秒"
          >
            <SkipForward size={18} />
          </button>

          <span className="text-sm font-mono text-text-dim">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          <button
            onClick={cycleSpeed}
            className="ml-auto px-3 py-1 rounded-md bg-surface-2 border border-border text-xs font-mono font-medium hover:border-border-hover transition-colors"
          >
            {speed.toFixed(1)}x
          </button>
        </div>
      </div>
    );
  }
);

export default AudioPlayer;
