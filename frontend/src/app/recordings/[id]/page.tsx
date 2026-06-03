"use client";

import { useEffect, useRef, useState, use } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Loader2 } from "lucide-react";
import AudioPlayer, { type AudioPlayerHandle } from "@/components/AudioPlayer";
import TranscriptPanel from "@/components/TranscriptPanel";
import { getRecordingDetail, type RecordingDetail } from "@/lib/api";

const EXPORT_FORMATS = [
  { format: "md", label: "Markdown" },
  { format: "txt", label: "TXT" },
  { format: "srt", label: "SRT" },
  { format: "vtt", label: "VTT" },
];

export default function RecordingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [recording, setRecording] = useState<RecordingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const playerRef = useRef<AudioPlayerHandle>(null);

  useEffect(() => {
    getRecordingDetail(Number(id))
      .then(setRecording)
      .catch(() => setError("无法加载录音详情"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSeek = (time: number) => {
    playerRef.current?.seekTo(time);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={32} className="animate-spin text-accent" />
      </div>
    );
  }

  if (error || !recording) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <p className="text-text-muted mb-4">{error || "录音不存在"}</p>
        <Link href="/" className="text-accent text-sm font-medium">
          返回首页
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4 min-w-0">
          <Link
            href="/"
            className="p-2 rounded-lg hover:bg-surface-2 text-text-dim transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-xl font-bold truncate">{recording.title}</h1>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {EXPORT_FORMATS.map((item) => (
            <a
              key={item.format}
              href={`/api/recordings/${recording.id}/export?format=${item.format}`}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-surface text-xs font-medium text-text-dim hover:border-accent hover:text-accent transition-colors"
            >
              <Download size={13} />
              {item.label}
            </a>
          ))}
        </div>
      </div>

      {/* Audio Player */}
      {recording.file_url && (
        <AudioPlayer
          ref={playerRef}
          fileUrl={recording.file_url.replace(/^\/app\/uploads\//, "/uploads/")}
          onTimeUpdate={setCurrentTime}
        />
      )}

      {/* Transcript */}
      <div style={{ height: "calc(100vh - 320px)" }}>
        <TranscriptPanel
          segments={recording.transcript?.segments || []}
          wordCount={recording.transcript?.word_count || 0}
          currentTime={currentTime}
          onSeek={handleSeek}
        />
      </div>
    </div>
  );
}
