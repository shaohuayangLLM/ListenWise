"use client";

import { useEffect, useRef, useState, use } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import AudioPlayer, { type AudioPlayerHandle } from "@/components/AudioPlayer";
import TranscriptPanel from "@/components/TranscriptPanel";
import DocumentPanel from "@/components/DocumentPanel";
import { getRecordingDetail, type RecordingDetail } from "@/lib/api";

const SCENE_LABELS: Record<string, string> = {
  requirement_review: "需求评审",
  report_meeting: "汇报会议",
  leadership_conference: "领导大会",
  parent_meeting: "家长会",
  phone_call: "电话录音",
  study_recording: "学习录音",
};

const SCENE_COLORS: Record<string, { bg: string; text: string }> = {
  requirement_review: { bg: "rgba(108,92,231,0.1)", text: "#5a4bd1" },
  report_meeting: { bg: "rgba(108,92,231,0.1)", text: "#5a4bd1" },
  leadership_conference: { bg: "rgba(108,92,231,0.1)", text: "#5a4bd1" },
  parent_meeting: { bg: "rgba(232,67,147,0.1)", text: "#d63384" },
  phone_call: { bg: "rgba(225,125,16,0.1)", text: "#c96a0a" },
  study_recording: { bg: "rgba(0,168,163,0.1)", text: "#008f8a" },
};

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

  const sceneColor = SCENE_COLORS[recording.scene_type] || SCENE_COLORS.requirement_review;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/"
          className="p-2 rounded-lg hover:bg-surface-2 text-text-dim transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-xl font-bold">{recording.title}</h1>
        <span
          className="text-xs font-medium px-2.5 py-1 rounded-xl"
          style={{ background: sceneColor.bg, color: sceneColor.text }}
        >
          {SCENE_LABELS[recording.scene_type] || recording.scene_type}
        </span>
      </div>

      {/* Audio Player */}
      {recording.file_url && (
        <AudioPlayer
          ref={playerRef}
          fileUrl={recording.file_url.replace(/^\/app\/uploads\//, "/uploads/")}
          onTimeUpdate={setCurrentTime}
        />
      )}

      {/* Split View: Transcript + Document */}
      <div className="grid grid-cols-2 gap-6" style={{ height: "calc(100vh - 320px)" }}>
        <TranscriptPanel
          segments={recording.transcript?.segments || []}
          wordCount={recording.transcript?.word_count || 0}
          currentTime={currentTime}
          onSeek={handleSeek}
        />
        <DocumentPanel
          sceneType={recording.scene_type}
          content={recording.document?.content || null}
        />
      </div>
    </div>
  );
}
