"use client";

import { useState } from "react";
import clsx from "clsx";

interface DocumentPanelProps {
  sceneType: string;
  content: Record<string, unknown> | null;
}

const SCENE_DOC_TITLE: Record<string, string> = {
  requirement_review: "需求评审纪要",
  report_meeting: "汇报纪要",
  leadership_conference: "大会纪要",
  parent_meeting: "家长会纪要",
  phone_call: "通话纪要",
  study_recording: "学习笔记",
};

const SECTION_LABELS: Record<string, string> = {
  summary: "摘要",
  // requirement_review
  requirements: "需求清单",
  discussion_points: "讨论要点",
  decisions: "最终决策",
  action_items: "后续行动",
  // report_meeting
  key_data: "关键数据",
  qa_records: "问答记录",
  follow_up_actions: "行动计划",
  // leadership_conference
  key_points: "核心要点",
  policy_directions: "政策方向",
  notable_quotes: "金句摘录",
  // parent_meeting
  teacher_feedback: "老师反馈",
  study_suggestions: "学习建议",
  parent_todos: "家长待办",
  // phone_call
  key_info: "关键信息",
  commitments: "承诺事项",
  next_steps: "后续跟进",
  // study_recording
  outline: "知识大纲",
  key_notes: "重点笔记",
  concepts: "概念解释",
};

function renderValue(value: unknown): React.ReactNode {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  return JSON.stringify(value);
}

function renderStringList(items: string[]) {
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2 text-sm text-text-dim leading-relaxed">
          <span className="text-accent shrink-0">&#8226;</span>
          {item}
        </li>
      ))}
    </ul>
  );
}

function renderObjectList(items: Record<string, unknown>[]) {
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="bg-surface-2 rounded-lg p-3 text-sm leading-relaxed">
          {Object.entries(item).map(([k, v]) => (
            <p key={k}>
              <span className="font-medium text-text">{k}：</span>
              <span className="text-text-dim">{renderValue(v)}</span>
            </p>
          ))}
        </div>
      ))}
    </div>
  );
}

function renderCheckboxList(items: Array<Record<string, unknown>>) {
  return (
    <div className="space-y-2">
      {items.map((item, i) => {
        const mainText = Object.values(item).filter(v => typeof v === "string").join(" — ");
        return (
          <label key={i} className="flex items-start gap-3 text-sm cursor-pointer group">
            <input type="checkbox" className="mt-0.5 w-4 h-4 rounded border-border accent-accent" />
            <span className="text-text-dim leading-relaxed group-hover:text-text transition-colors">
              {mainText}
            </span>
          </label>
        );
      })}
    </div>
  );
}

function renderSection(key: string, value: unknown): React.ReactNode {
  if (key === "summary" || typeof value === "string") {
    return <p className="text-sm text-text-dim leading-relaxed">{String(value)}</p>;
  }

  if (!Array.isArray(value) || value.length === 0) return null;

  // String array
  if (typeof value[0] === "string") {
    return renderStringList(value as string[]);
  }

  // Object array: action_items, next_steps, commitments, follow_up_actions → checkbox
  const checkboxKeys = ["action_items", "next_steps", "follow_up_actions", "parent_todos", "commitments"];
  if (checkboxKeys.includes(key) && typeof value[0] === "object") {
    return renderCheckboxList(value as Record<string, unknown>[]);
  }

  // key_info: label-value pairs
  if (key === "key_info" && typeof value[0] === "object") {
    const items = value as Array<{ label?: string; value?: string }>;
    return (
      <div className="space-y-1.5">
        {items.map((item, i) => (
          <div key={i} className="flex gap-2 text-sm">
            <span className="font-medium text-text shrink-0 min-w-[5em]">{item.label || ""}：</span>
            <span className="text-text-dim">{item.value || ""}</span>
          </div>
        ))}
      </div>
    );
  }

  // Generic object array
  if (typeof value[0] === "object") {
    return renderObjectList(value as Record<string, unknown>[]);
  }

  return null;
}

export default function DocumentPanel({ sceneType, content }: DocumentPanelProps) {
  const [activeTab, setActiveTab] = useState<"scene" | "summary">("scene");

  const docTitle = SCENE_DOC_TITLE[sceneType] || "场景化文档";

  if (!content) {
    return (
      <div className="bg-surface border border-border rounded-xl overflow-hidden h-full flex flex-col">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-base font-semibold">场景化文档</h2>
        </div>
        <div className="flex-1 flex items-center justify-center text-text-muted text-sm p-8">
          暂无文档数据，等待处理完成
        </div>
      </div>
    );
  }

  const summary = (content.summary as string) || "";

  // Get all content keys except summary for structured display
  const sectionKeys = Object.keys(content).filter((k) => k !== "summary");

  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden h-full flex flex-col">
      {/* Header with tabs */}
      <div className="px-5 py-4 border-b border-border flex items-center justify-between shrink-0">
        <h2 className="text-base font-semibold">场景化文档</h2>
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab("scene")}
            className={clsx(
              "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
              activeTab === "scene"
                ? "bg-accent text-white"
                : "text-text-dim hover:bg-surface-2"
            )}
          >
            {docTitle}
          </button>
          <button
            onClick={() => setActiveTab("summary")}
            className={clsx(
              "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
              activeTab === "summary"
                ? "bg-accent text-white"
                : "text-text-dim hover:bg-surface-2"
            )}
          >
            原始摘要
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5">
        {activeTab === "scene" ? (
          <div className="space-y-6">
            {/* Summary always first */}
            {summary && (
              <section>
                <h3 className="text-sm font-semibold mb-2">摘要</h3>
                <p className="text-sm text-text-dim leading-relaxed">{summary}</p>
              </section>
            )}

            {/* Dynamic sections */}
            {sectionKeys.map((key) => {
              const rendered = renderSection(key, content[key]);
              if (!rendered) return null;
              return (
                <section key={key}>
                  <h3 className="text-sm font-semibold mb-2">
                    {SECTION_LABELS[key] || key}
                  </h3>
                  {rendered}
                </section>
              );
            })}
          </div>
        ) : (
          <div className="text-sm text-text-dim leading-relaxed whitespace-pre-wrap">
            {summary || "暂无摘要内容"}
          </div>
        )}
      </div>
    </div>
  );
}
