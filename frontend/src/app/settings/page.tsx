"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  getProviders,
  updateProvider,
  testProvider,
  type ProviderConfig,
} from "@/lib/api";

const CAP_META: Record<
  string,
  { title: string; desc: string; providers: { v: string; l: string }[]; defaultModel: string }
> = {
  asr: {
    title: "转写服务（ASR）",
    desc: "音频转文字，决定逐字稿质量与说话人区分",
    providers: [
      { v: "fun_asr", l: "阿里云百炼 · Fun-ASR（推荐）" },
      { v: "dashscope", l: "DashScope Paraformer-v2" },
    ],
    defaultModel: "fun-asr",
  },
  llm: {
    title: "总结服务（大模型）",
    desc: "生成摘要要点，手动触发时调用",
    providers: [
      { v: "qwen", l: "阿里云百炼 · qwen-plus（推荐）" },
      { v: "deepseek", l: "DeepSeek" },
    ],
    defaultModel: "qwen-plus",
  },
};

type Draft = { provider: string; model: string; api_key: string };

export default function SettingsPage() {
  const [configs, setConfigs] = useState<Record<string, ProviderConfig>>({});
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [results, setResults] = useState<
    Record<string, { ok: boolean; message: string }>
  >({});

  useEffect(() => {
    getProviders()
      .then((list) => {
        const cmap: Record<string, ProviderConfig> = {};
        const dmap: Record<string, Draft> = {};
        for (const c of list) {
          cmap[c.capability] = c;
          dmap[c.capability] = {
            provider: c.provider || CAP_META[c.capability].providers[0].v,
            model: c.model || CAP_META[c.capability].defaultModel,
            api_key: "",
          };
        }
        setConfigs(cmap);
        setDrafts(dmap);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function setDraft(cap: string, patch: Partial<Draft>) {
    setDrafts((d) => ({ ...d, [cap]: { ...d[cap], ...patch } }));
  }

  async function save(cap: string) {
    const d = drafts[cap];
    setSaving(cap);
    try {
      const updated = await updateProvider(cap, {
        provider: d.provider,
        model: d.model,
        api_key: d.api_key || null, // 空表示不改密钥
        enabled: true,
      });
      setConfigs((c) => ({ ...c, [cap]: updated }));
      setDraft(cap, { api_key: "" });
      setResults((r) => ({ ...r, [cap]: { ok: true, message: "已保存" } }));
    } catch {
      setResults((r) => ({ ...r, [cap]: { ok: false, message: "保存失败" } }));
    } finally {
      setSaving(null);
    }
  }

  async function test(cap: string) {
    setTesting(cap);
    try {
      const res = await testProvider(cap);
      setResults((r) => ({ ...r, [cap]: res }));
    } catch {
      setResults((r) => ({
        ...r,
        [cap]: { ok: false, message: "未配置或连接失败" },
      }));
    } finally {
      setTesting(null);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-24 text-text-dim">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[760px]">
      <h1 className="text-[26px] font-extrabold tracking-tight">模型设置</h1>
      <p className="mb-7 mt-1.5 text-[14px] text-text-dim">
        按能力分别配置公有云 API。密钥仅用于你的转写与总结请求，加密存储、不外传。
      </p>

      {(["asr", "llm"] as const).map((cap) => {
        const meta = CAP_META[cap];
        const cfg = configs[cap];
        const d = drafts[cap];
        const res = results[cap];
        if (!d) return null;
        return (
          <div
            key={cap}
            className="mb-5 rounded-[14px] border border-border bg-white p-6"
          >
            <div className="flex items-center gap-3">
              <div>
                <div className="text-[17px] font-bold">{meta.title}</div>
                <div className="text-[12.5px] text-text-muted">{meta.desc}</div>
              </div>
              <div className="ml-auto flex items-center text-[12px] font-semibold text-text-dim">
                <span
                  className={clsxDot(cfg?.configured)}
                />
                {cfg?.configured ? "已连接" : "未配置"}
              </div>
            </div>

            <div className="mt-5 grid gap-4">
              <div className="grid grid-cols-2 gap-3.5">
                <label className="grid gap-1.5">
                  <span className="text-[13px] font-semibold text-text-dim">服务商</span>
                  <select
                    value={d.provider}
                    onChange={(e) => setDraft(cap, { provider: e.target.value })}
                    className="h-[42px] rounded-[9px] border border-border px-3 text-[14px] outline-none focus:border-accent"
                  >
                    {meta.providers.map((p) => (
                      <option key={p.v} value={p.v}>
                        {p.l}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1.5">
                  <span className="text-[13px] font-semibold text-text-dim">模型</span>
                  <input
                    value={d.model}
                    onChange={(e) => setDraft(cap, { model: e.target.value })}
                    className="h-[42px] rounded-[9px] border border-border px-3.5 text-[14px] outline-none focus:border-accent"
                  />
                </label>
              </div>
              <label className="grid gap-1.5">
                <span className="text-[13px] font-semibold text-text-dim">API Key</span>
                <input
                  value={d.api_key}
                  onChange={(e) => setDraft(cap, { api_key: e.target.value })}
                  placeholder={
                    cfg?.configured ? cfg.api_key_masked : "填写你的服务密钥"
                  }
                  className="h-[42px] rounded-[9px] border border-border px-3.5 text-[14px] outline-none focus:border-accent"
                />
                <span className="text-[11.5px] text-text-muted">
                  {cfg?.configured
                    ? "已保存的密钥脱敏显示，留空表示不修改。"
                    : "填写后保存即生效。"}
                </span>
              </label>
            </div>

            <div className="mt-5 flex items-center gap-3 border-t border-border pt-4">
              {res && (
                <span
                  className={`rounded-[7px] px-2.5 py-1 text-[12.5px] font-semibold ${
                    res.ok
                      ? "bg-[#E8FCF0] text-success"
                      : "bg-[#FFEEEF] text-[#FF4754]"
                  }`}
                >
                  {res.message}
                </span>
              )}
              <div className="flex-1" />
              <button
                onClick={() => test(cap)}
                disabled={testing === cap}
                className="inline-flex h-9 items-center rounded-[9px] border border-border-hover bg-white px-3.5 text-[13px] font-medium transition-colors hover:border-accent hover:text-accent disabled:opacity-50"
              >
                {testing === cap ? "测试中…" : "测试连接"}
              </button>
              <button
                onClick={() => save(cap)}
                disabled={saving === cap}
                className="inline-flex h-9 items-center rounded-[9px] bg-accent px-3.5 text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {saving === cap ? "保存中…" : "保存"}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function clsxDot(on: boolean | undefined): string {
  return `mr-1.5 h-[7px] w-[7px] rounded-full ${on ? "bg-success" : "bg-text-muted"}`;
}
