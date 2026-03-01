"use client";

import { useState } from "react";
import clsx from "clsx";
import {
  Briefcase,
  BarChart3,
  Landmark,
  GraduationCap,
  Phone,
  BookOpen,
  Pencil,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// Toggle switch component
function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={clsx(
        "relative w-11 h-6 rounded-full transition-colors shrink-0",
        checked ? "bg-accent" : "bg-surface-3"
      )}
    >
      <span
        className={clsx(
          "absolute top-[3px] left-[3px] w-[18px] h-[18px] rounded-full bg-white transition-transform",
          checked && "translate-x-5"
        )}
      />
    </button>
  );
}

// Select component
function Select({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-3.5 py-2 bg-surface-2 border border-border rounded-md text-[13px] outline-none cursor-pointer min-w-[140px] text-text"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

// Setting row
function SettingRow({
  label,
  description,
  children,
  last,
}: {
  label: string;
  description: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div
      className={clsx(
        "flex items-center justify-between py-3",
        !last && "border-b border-border"
      )}
    >
      <div>
        <p className="text-sm">{label}</p>
        <p className="text-xs text-text-dim mt-0.5">{description}</p>
      </div>
      {children}
    </div>
  );
}

// Scene templates
const SCENE_TEMPLATES: { icon: LucideIcon; name: string }[] = [
  { icon: Briefcase, name: "需求评审会" },
  { icon: BarChart3, name: "汇报会议" },
  { icon: Landmark, name: "领导大会" },
  { icon: GraduationCap, name: "家长会" },
  { icon: Phone, name: "电话录音" },
  { icon: BookOpen, name: "学习录音" },
];

export default function SettingsPage() {
  // Transcription settings
  const [speakerDiarization, setSpeakerDiarization] = useState(true);
  const [autoPunctuation, setAutoPunctuation] = useState(true);
  const [timestampGranularity, setTimestampGranularity] = useState("sentence");
  const [defaultLanguage, setDefaultLanguage] = useState("zh-CN");

  // Export settings
  const [exportFormat, setExportFormat] = useState("markdown");
  const [exportIncludeTranscript, setExportIncludeTranscript] = useState(true);
  const [exportIncludeTimestamps, setExportIncludeTimestamps] = useState(false);

  // Notification settings
  const [notifyBrowser, setNotifyBrowser] = useState(true);
  const [notifyEmail, setNotifyEmail] = useState(false);

  return (
    <div className="max-w-[680px] mx-auto py-4">
      <h1 className="text-[22px] font-bold mb-8">设置</h1>

      {/* Transcription Settings */}
      <section className="bg-surface border border-border rounded-xl p-6 mb-5">
        <h3 className="text-[15px] font-semibold pb-3 mb-3 border-b border-border">
          转录设置
        </h3>
        <SettingRow
          label="说话人分离"
          description="自动识别和标注不同发言人"
        >
          <Toggle checked={speakerDiarization} onChange={setSpeakerDiarization} />
        </SettingRow>
        <SettingRow
          label="自动标点恢复"
          description="智能添加标点符号和段落分隔"
        >
          <Toggle checked={autoPunctuation} onChange={setAutoPunctuation} />
        </SettingRow>
        <SettingRow
          label="时间戳粒度"
          description="转录文本中时间标记的精度"
        >
          <Select
            value={timestampGranularity}
            onChange={setTimestampGranularity}
            options={[
              { value: "sentence", label: "逐句（推荐）" },
              { value: "30s", label: "每 30 秒" },
              { value: "1m", label: "每分钟" },
            ]}
          />
        </SettingRow>
        <SettingRow
          label="默认语言"
          description="录音的主要语言"
          last
        >
          <Select
            value={defaultLanguage}
            onChange={setDefaultLanguage}
            options={[
              { value: "zh-CN", label: "中文（普通话）" },
              { value: "en", label: "英文" },
              { value: "auto", label: "自动检测" },
            ]}
          />
        </SettingRow>
      </section>

      {/* Scene Template Management */}
      <section className="bg-surface border border-border rounded-xl p-6 mb-5">
        <h3 className="text-[15px] font-semibold pb-3 mb-3 border-b border-border">
          场景模板管理
        </h3>
        <div className="flex flex-col gap-2 mt-3">
          {SCENE_TEMPLATES.map(({ icon: Icon, name }) => (
            <div
              key={name}
              className="flex items-center gap-3 px-3.5 py-3 bg-surface-2 border border-border rounded-lg text-[13px] hover:border-border-hover transition-colors"
            >
              <Icon size={16} className="text-text-dim shrink-0" />
              <span className="flex-1 font-medium">{name}</span>
              <button className="flex items-center gap-1 text-accent text-xs font-medium hover:opacity-80">
                <Pencil size={12} />
                编辑模板
              </button>
            </div>
          ))}
        </div>
        <button className="w-full mt-3 py-2.5 text-[13px] text-accent font-medium border border-dashed border-border rounded-lg hover:bg-surface-2 transition-colors">
          + 添加自定义场景模板
        </button>
      </section>

      {/* Export Settings */}
      <section className="bg-surface border border-border rounded-xl p-6 mb-5">
        <h3 className="text-[15px] font-semibold pb-3 mb-3 border-b border-border">
          导出设置
        </h3>
        <SettingRow
          label="默认导出格式"
          description="生成文档的默认文件格式"
        >
          <Select
            value={exportFormat}
            onChange={setExportFormat}
            options={[
              { value: "markdown", label: "Markdown (.md)" },
              { value: "docx", label: "Word (.docx)" },
              { value: "pdf", label: "PDF (.pdf)" },
            ]}
          />
        </SettingRow>
        <SettingRow
          label="导出包含原始转录"
          description="导出时是否同时包含完整转录文本"
        >
          <Toggle checked={exportIncludeTranscript} onChange={setExportIncludeTranscript} />
        </SettingRow>
        <SettingRow
          label="导出包含时间戳"
          description="在导出文档中保留时间标记"
          last
        >
          <Toggle checked={exportIncludeTimestamps} onChange={setExportIncludeTimestamps} />
        </SettingRow>
      </section>

      {/* Notification Settings */}
      <section className="bg-surface border border-border rounded-xl p-6 mb-5">
        <h3 className="text-[15px] font-semibold pb-3 mb-3 border-b border-border">
          通知设置
        </h3>
        <SettingRow
          label="转录完成通知"
          description="录音处理完成后发送浏览器通知"
        >
          <Toggle checked={notifyBrowser} onChange={setNotifyBrowser} />
        </SettingRow>
        <SettingRow
          label="邮件通知"
          description="同时发送邮件提醒"
          last
        >
          <Toggle checked={notifyEmail} onChange={setNotifyEmail} />
        </SettingRow>
      </section>
    </div>
  );
}
