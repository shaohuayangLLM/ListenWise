"use client";

import { useEffect, useState } from "react";
import { Loader2, Lock } from "lucide-react";
import { API_BASE, PASSCODE_KEY } from "@/lib/api";

/** 用口令调一个受保护接口验证；本地后端未设口令时空口令也会通过（200）。 */
async function verifyPasscode(passcode: string): Promise<boolean> {
  try {
    const headers: Record<string, string> = {};
    if (passcode) headers["X-Access-Passcode"] = passcode;
    const resp = await fetch(`${API_BASE}/stats`, { headers });
    return resp.ok;
  } catch {
    return false;
  }
}

export default function PasscodeGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(PASSCODE_KEY) || "";
    verifyPasscode(stored)
      .then((ok) => {
        if (ok) setAuthed(true);
        else if (stored) localStorage.removeItem(PASSCODE_KEY);
      })
      .finally(() => setReady(true));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const pc = value.trim();
    if (!pc) return;
    setChecking(true);
    setError("");
    const ok = await verifyPasscode(pc);
    setChecking(false);
    if (ok) {
      localStorage.setItem(PASSCODE_KEY, pc);
      setAuthed(true);
    } else {
      setError("口令不正确，请重试");
    }
  };

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 size={28} className="animate-spin text-accent" />
      </div>
    );
  }

  if (authed) return <>{children}</>;

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-[380px] rounded-xl border border-border bg-surface p-8 shadow-ring shadow-soft"
      >
        <div className="mb-7 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-accent-glow">
            <Lock size={24} className="text-accent" />
          </div>
          <h1 className="font-serif text-[1.6rem] font-semibold tracking-[-0.01em] text-text">
            ListenWise
          </h1>
          <p className="mt-2 text-[13px] leading-relaxed text-text-dim">
            这是一个受邀体验的 Demo，请输入访问口令
          </p>
        </div>

        <input
          type="password"
          value={value}
          autoFocus
          onChange={(e) => setValue(e.target.value)}
          placeholder="访问口令"
          className="w-full rounded-lg border border-border bg-bg px-4 py-3 text-sm text-text outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-text-muted hover:border-border-hover focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-glow)]"
        />
        {error && (
          <p className="mt-2 text-[13px] font-medium text-danger">{error}</p>
        )}

        <button
          type="submit"
          disabled={checking || !value.trim()}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-accent py-3 text-sm font-semibold text-white shadow-ring transition-colors duration-200 hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-accent"
        >
          {checking ? <Loader2 size={16} className="animate-spin" /> : null}
          进入
        </button>
      </form>
    </div>
  );
}
