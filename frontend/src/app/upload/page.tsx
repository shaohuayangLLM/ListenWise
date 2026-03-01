"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Mic } from "lucide-react";
import FileUploader from "@/components/FileUploader";
import SceneSelector from "@/components/SceneSelector";
import WebRecorder from "@/components/WebRecorder";
import { uploadRecording } from "@/lib/api";

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [sceneType, setSceneType] = useState("requirement_review");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showRecorder, setShowRecorder] = useState(false);

  const canSubmit = file && !uploading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setProgress(0);
    setError(null);

    try {
      await uploadRecording({
        file,
        title: title || file.name.replace(/\.[^.]+$/, ""),
        scene_type: sceneType,
        note: note || undefined,
        onProgress: setProgress,
      });
      router.push("/");
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "上传失败，请重试";
      setError(msg);
      setUploading(false);
    }
  };

  const handleRecordingComplete = (recordedFile: File) => {
    setFile(recordedFile);
    setShowRecorder(false);
  };

  return (
    <div className="max-w-[720px] mx-auto py-6">
      <h1 className="text-2xl font-bold text-center mb-2">上传录音</h1>
      <p className="text-center text-text-dim text-sm mb-9">
        支持 mp3、m4a、wav、mp4、webm 格式，单文件最大 500MB
      </p>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* File Upload Zone */}
        <FileUploader file={file} onFileChange={setFile} />

        {/* Or divider + Web Recorder */}
        <div className="relative text-center text-text-muted text-[13px] my-6">
          <span className="relative z-10 bg-bg px-4">或</span>
          <div className="absolute top-1/2 left-0 right-0 h-px bg-border -translate-y-1/2" />
        </div>

        {showRecorder ? (
          <WebRecorder
            onRecordingComplete={handleRecordingComplete}
            onCancel={() => setShowRecorder(false)}
          />
        ) : (
          <button
            type="button"
            onClick={() => setShowRecorder(true)}
            className="w-full py-[18px] rounded-lg border border-border bg-surface text-[15px] font-medium flex items-center justify-center gap-2.5 transition-all hover:border-[var(--accent-3)] hover:bg-[rgba(253,121,168,0.05)]"
          >
            <Mic size={18} className="text-[var(--accent-3)]" />
            开始浏览器录音
          </button>
        )}

        {/* Scene Selector */}
        <div>
          <h3 className="text-base font-semibold mb-4">选择场景类型</h3>
          <SceneSelector value={sceneType} onChange={setSceneType} />
        </div>

        {/* Additional Info */}
        <div>
          <h3 className="text-base font-semibold mb-4">补充信息（可选）</h3>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="录音标题，如：Q1产品评审会"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-border bg-surface text-sm placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
            />
            <input
              type="text"
              placeholder="备注说明（可选）"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-border bg-surface text-sm placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
            />
          </div>
        </div>

        {/* Progress Bar */}
        {uploading && (
          <div>
            <div className="flex items-center justify-between text-sm text-text-dim mb-2">
              <span>正在上传...</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full h-2 bg-surface-2 rounded-full overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="text-sm text-[var(--accent-3)] font-medium">{error}</p>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full py-3.5 rounded-lg bg-accent text-white font-semibold text-sm transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {uploading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              上传中...
            </>
          ) : (
            "开始转录处理"
          )}
        </button>
      </form>
    </div>
  );
}
