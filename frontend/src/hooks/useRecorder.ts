"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export type RecState = "idle" | "recording" | "paused" | "stopped";

/**
 * 浏览器录音逻辑（MediaRecorder + 音量分析 + 计时），与 UI 解耦。
 * 供「专注记笔记」录音页用自定义界面驱动。
 */
export function useRecorder() {
  const [state, setState] = useState<RecState>("idle");
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const durationRef = useRef(0);

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (animRef.current) {
      cancelAnimationFrame(animRef.current);
      animRef.current = null;
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

  useEffect(() => cleanup, [cleanup]);

  const tick = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;
    const data = new Uint8Array(analyser.fftSize);
    analyser.getByteTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      const v = (data[i] - 128) / 128;
      sum += v * v;
    }
    setVolume(Math.min(1, Math.sqrt(sum / data.length) * 3));
    animRef.current = requestAnimationFrame(tick);
  }, []);

  const startTimer = useCallback(() => {
    timerRef.current = setInterval(() => {
      setDuration((d) => {
        durationRef.current = d + 1;
        return d + 1;
      });
    }, 1000);
  }, []);

  const start = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      const src = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      src.connect(analyser);
      analyserRef.current = analyser;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const now = new Date();
        const ts = `${now.getFullYear()}${(now.getMonth() + 1)
          .toString()
          .padStart(2, "0")}${now.getDate().toString().padStart(2, "0")}_${now
          .getHours()
          .toString()
          .padStart(2, "0")}${now.getMinutes().toString().padStart(2, "0")}`;
        setFile(new File([blob], `recording_${ts}.webm`, { type: mimeType }));
      };

      recorder.start(1000);
      setState("recording");
      setDuration(0);
      durationRef.current = 0;
      startTimer();
      tick();
    } catch {
      setError("无法访问麦克风，请检查浏览器权限设置");
    }
  }, [startTimer, tick]);

  const pause = useCallback(() => {
    const r = mediaRecorderRef.current;
    if (!r || r.state !== "recording") return;
    r.pause();
    setState("paused");
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (animRef.current) {
      cancelAnimationFrame(animRef.current);
      animRef.current = null;
    }
    setVolume(0);
  }, []);

  const resume = useCallback(() => {
    const r = mediaRecorderRef.current;
    if (!r || r.state !== "paused") return;
    r.resume();
    setState("recording");
    startTimer();
    tick();
  }, [startTimer, tick]);

  const stop = useCallback(() => {
    const r = mediaRecorderRef.current;
    if (!r || r.state === "inactive") return;
    r.stop();
    setState("stopped");
    cleanup();
  }, [cleanup]);

  const reset = useCallback(() => {
    setFile(null);
    setState("idle");
    setDuration(0);
    durationRef.current = 0;
    setVolume(0);
    setError(null);
  }, []);

  return { state, duration, volume, file, error, start, pause, resume, stop, reset };
}
