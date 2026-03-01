"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, Square, Pause, Play } from "lucide-react";

interface WebRecorderProps {
  onRecordingComplete: (file: File) => void;
  onCancel: () => void;
}

type RecordingState = "idle" | "recording" | "paused" | "stopped";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function WebRecorder({
  onRecordingComplete,
  onCancel,
}: WebRecorderProps) {
  const [state, setState] = useState<RecordingState>("idle");
  const [duration, setDuration] = useState(0);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    analyserRef.current = null;
  }, []);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  const updateVolume = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;

    const data = new Uint8Array(analyser.fftSize);
    analyser.getByteTimeDomainData(data);

    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      const v = (data[i] - 128) / 128;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / data.length);
    setVolumeLevel(Math.min(1, rms * 3));

    animFrameRef.current = requestAnimationFrame(updateVolume);
  }, []);

  const startRecording = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Set up audio analyser for volume visualization
      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const now = new Date();
        const ts = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, "0")}${now.getDate().toString().padStart(2, "0")}_${now.getHours().toString().padStart(2, "0")}${now.getMinutes().toString().padStart(2, "0")}`;
        const file = new File([blob], `recording_${ts}.webm`, {
          type: mimeType,
        });
        onRecordingComplete(file);
      };

      recorder.start(1000); // collect data every 1s
      setState("recording");
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);

      updateVolume();
    } catch {
      setError("无法访问麦克风，请检查浏览器权限设置");
    }
  };

  const pauseRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state !== "recording") return;

    recorder.pause();
    setState("paused");

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    setVolumeLevel(0);
  };

  const resumeRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state !== "paused") return;

    recorder.resume();
    setState("recording");

    timerRef.current = setInterval(() => {
      setDuration((d) => d + 1);
    }, 1000);

    updateVolume();
  };

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") return;

    recorder.stop();
    setState("stopped");
    cleanup();
  };

  const handleCancel = () => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      // Remove onstop handler to prevent file creation
      recorder.onstop = null;
      recorder.stop();
    }
    cleanup();
    setState("idle");
    setDuration(0);
    setVolumeLevel(0);
    onCancel();
  };

  // Volume visualization bars
  const bars = 24;
  const barElements = Array.from({ length: bars }, (_, i) => {
    const threshold = i / bars;
    const active =
      (state === "recording" && volumeLevel > threshold) ||
      (state === "paused" && i < 2);
    return (
      <div
        key={i}
        className="flex-1 rounded-full transition-all duration-75"
        style={{
          height: `${8 + Math.sin((i / bars) * Math.PI) * 24}px`,
          backgroundColor: active
            ? "var(--accent-3)"
            : "var(--surface-2, #eee)",
          opacity: active ? 0.6 + volumeLevel * 0.4 : 0.3,
        }}
      />
    );
  });

  return (
    <div className="border border-border rounded-xl bg-surface p-6">
      {error && (
        <p className="text-sm text-[var(--accent-3)] font-medium mb-4">
          {error}
        </p>
      )}

      {/* Volume visualization */}
      <div className="flex items-center justify-center gap-[3px] h-12 mb-4">
        {barElements}
      </div>

      {/* Timer */}
      <div className="text-center mb-6">
        <span className="text-3xl font-mono font-semibold tabular-nums">
          {formatTime(duration)}
        </span>
        {state === "recording" && (
          <span className="inline-block w-2 h-2 rounded-full bg-[var(--accent-3)] ml-3 animate-pulse" />
        )}
        {state === "paused" && (
          <span className="text-sm text-text-muted ml-3">已暂停</span>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4">
        {state === "idle" && (
          <button
            type="button"
            onClick={startRecording}
            className="flex items-center gap-2 px-6 py-3 rounded-lg bg-[var(--accent-3)] text-white font-medium text-sm hover:opacity-90 transition-opacity"
          >
            <Mic size={18} />
            开始录音
          </button>
        )}

        {state === "recording" && (
          <>
            <button
              type="button"
              onClick={pauseRecording}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-border bg-surface text-sm font-medium hover:bg-surface-2 transition-colors"
            >
              <Pause size={16} />
              暂停
            </button>
            <button
              type="button"
              onClick={stopRecording}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-accent text-white text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <Square size={16} />
              完成录音
            </button>
          </>
        )}

        {state === "paused" && (
          <>
            <button
              type="button"
              onClick={resumeRecording}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-border bg-surface text-sm font-medium hover:bg-surface-2 transition-colors"
            >
              <Play size={16} />
              继续
            </button>
            <button
              type="button"
              onClick={stopRecording}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-accent text-white text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <Square size={16} />
              完成录音
            </button>
          </>
        )}

        {state !== "idle" && (
          <button
            type="button"
            onClick={handleCancel}
            className="px-5 py-2.5 rounded-lg text-sm text-text-muted hover:text-text transition-colors"
          >
            取消
          </button>
        )}
      </div>
    </div>
  );
}
