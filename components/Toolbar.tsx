"use client";

import { RefreshCw, Settings2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import type { WidgetSettings } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ToolbarProps {
  settings: WidgetSettings;
  onSettingsChange: (settings: WidgetSettings) => void;
  onRefresh: () => void;
  loading: boolean;
}

export default function Toolbar({ settings, onSettingsChange, onRefresh, loading }: ToolbarProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(event: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setSettingsOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function toggle(key: keyof WidgetSettings) {
    if (key === "sortMode") return;
    onSettingsChange({ ...settings, [key]: !settings[key] });
  }

  return (
    <div className="flex items-center gap-1.5 border-b border-[#dbdbdb] bg-white px-3 py-2">
      <button
        type="button"
        onClick={() => void onRefresh()}
        disabled={loading}
        className={cn(
          "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium",
          "bg-[#efefef] text-[#262626] transition-colors hover:bg-[#dbdbdb]",
          "disabled:cursor-not-allowed disabled:opacity-50"
        )}
        title="Atualizar publicações e stories do Notion"
      >
        <RefreshCw size={13} className={cn("transition-transform", loading && "animate-spin")} />
        <span>{loading ? "Atualizando…" : "Atualizar"}</span>
      </button>

      <div className="flex-1" />
      <div className="relative" ref={settingsRef}>
        <button
          type="button"
          onClick={() => setSettingsOpen(!settingsOpen)}
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium",
            "bg-[#efefef] text-[#262626] transition-colors hover:bg-[#dbdbdb]"
          )}
        >
          <Settings2 size={13} />
          <span>Configurações</span>
        </button>

        {settingsOpen && (
          <div className="absolute right-0 top-full z-50 mt-1 min-w-[200px] overflow-hidden rounded-xl border border-[#dbdbdb] bg-white py-2 shadow-lg">
            <p className="px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#8e8e8e]">
              Exibição
            </p>
            {[
              { key: "showBio" as const, label: "Exibir perfil" },
              { key: "showHighlights" as const, label: "Exibir destaques" },
              { key: "showContentMap" as const, label: "Exibir mapa de conteúdo" },
            ].map(({ key, label }) => (
              <label
                key={key}
                className="flex cursor-pointer items-center justify-between px-4 py-2 hover:bg-[#fafafa]"
              >
                <span className="text-[13px] text-[#262626]">{label}</span>
                <Toggle checked={settings[key] as boolean} onChange={() => toggle(key)} />
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <div
      onClick={onChange}
      className={cn(
        "relative h-5 w-9 cursor-pointer rounded-full transition-colors",
        checked ? "bg-[#0095f6]" : "bg-[#dbdbdb]"
      )}
    >
      <div
        className={cn(
          "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
          checked ? "translate-x-4" : "translate-x-0.5"
        )}
      />
    </div>
  );
}
