"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, X, FileAudio } from "lucide-react";
import clsx from "clsx";

const ALLOWED_EXTENSIONS = ["mp3", "m4a", "wav", "mp4", "webm", "ogg", "flac", "aac"];
const MAX_SIZE_MB = 500;

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface FileUploaderProps {
  file: File | null;
  onFileChange: (file: File | null) => void;
}

export default function FileUploader({ file, onFileChange }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback((f: File): string | null => {
    const ext = f.name.split(".").pop()?.toLowerCase() || "";
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return `不支持的文件格式: .${ext}`;
    }
    if (f.size > MAX_SIZE_MB * 1024 * 1024) {
      return `文件大小超过限制 (${MAX_SIZE_MB}MB)`;
    }
    return null;
  }, []);

  const handleFile = useCallback(
    (f: File) => {
      const err = validateFile(f);
      if (err) {
        setError(err);
        onFileChange(null);
      } else {
        setError(null);
        onFileChange(f);
      }
    },
    [validateFile, onFileChange]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const f = e.dataTransfer.files[0];
      if (f) handleFile(f);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (f) handleFile(f);
    },
    [handleFile]
  );

  const removeFile = useCallback(() => {
    setError(null);
    onFileChange(null);
    if (inputRef.current) inputRef.current.value = "";
  }, [onFileChange]);

  if (file) {
    return (
      <div className="bg-surface border border-border rounded-xl p-5 flex items-center gap-4">
        <div className="w-12 h-12 rounded-lg bg-accent-glow flex items-center justify-center shrink-0">
          <FileAudio size={22} className="text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{file.name}</p>
          <p className="text-xs text-text-muted mt-0.5">{formatFileSize(file.size)}</p>
        </div>
        <button
          type="button"
          onClick={removeFile}
          className="p-2 rounded-lg hover:bg-surface-2 text-text-muted hover:text-text transition-colors"
        >
          <X size={18} />
        </button>
      </div>
    );
  }

  return (
    <div>
      <div
        className={clsx(
          "border-2 border-dashed rounded-xl py-14 px-8 text-center cursor-pointer transition-all",
          isDragging
            ? "border-accent bg-accent-glow"
            : "border-border hover:border-accent hover:bg-[rgba(108,92,231,0.05)]"
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
      >
        <Upload size={40} className="mx-auto mb-4 text-text-muted opacity-70" />
        <p className="text-base font-medium mb-2">
          拖拽文件到此处，或点击选择文件
        </p>
        <p className="text-sm text-text-muted">
          支持 mp3, m4a, wav, mp4, webm 格式，最大 {MAX_SIZE_MB}MB
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED_EXTENSIONS.map((e) => `.${e}`).join(",")}
          onChange={handleInputChange}
          className="hidden"
        />
      </div>
      {error && (
        <p className="mt-3 text-sm text-[var(--accent-3)] font-medium">{error}</p>
      )}
    </div>
  );
}
