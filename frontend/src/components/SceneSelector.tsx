"use client";

import clsx from "clsx";
import {
  Briefcase,
  BarChart3,
  Landmark,
  GraduationCap,
  Phone,
  BookOpen,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface SceneOption {
  value: string;
  label: string;
  icon: LucideIcon;
}

const SCENES: SceneOption[] = [
  { value: "requirement_review", label: "需求评审", icon: Briefcase },
  { value: "report_meeting", label: "汇报会议", icon: BarChart3 },
  { value: "leadership_conference", label: "领导大会", icon: Landmark },
  { value: "parent_meeting", label: "家长会", icon: GraduationCap },
  { value: "phone_call", label: "电话录音", icon: Phone },
  { value: "study_recording", label: "学习录音", icon: BookOpen },
];

interface SceneSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export default function SceneSelector({ value, onChange }: SceneSelectorProps) {
  return (
    <div className="grid grid-cols-3 gap-2.5">
      {SCENES.map(({ value: v, label, icon: Icon }) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={clsx(
            "flex flex-col items-center gap-1.5 py-3.5 px-3 rounded-xl border-2 text-sm font-medium transition-all",
            v === value
              ? "border-accent bg-accent-glow text-accent"
              : "border-border bg-surface-2 text-text hover:border-border-hover"
          )}
        >
          <Icon size={22} />
          <span className="text-[13px]">{label}</span>
        </button>
      ))}
    </div>
  );
}
