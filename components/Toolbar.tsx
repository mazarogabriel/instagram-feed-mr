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
    <div className="flex items-center gap-1.5 px-3 py-2 border-b border-[#dbdbdb] bg-white">
      <button
        onClick={onRefresh}
        disabled={loading}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium",
          "bg-[#efefef] hover:bg-[#dbdbdb] text-[#262626] transition-colors",
          "disabled:opacity-50 disabled:cursor-not-allowed"
        )}
        title="Atualizar publicações do Notion"
      >
        <RefreshCw size={13} className={cn("transition-transform", loading && "animate-spin")} />
        <span>Atualizar</span>
      </button>

      <div className="flex-1" />
      <div className="relative" ref={settingsRef}>
        <button
          onClick={() => setSettingsOpen(!settingsOpen)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium",
            "bg-[#efefef] hover:bg-[#dbdbdb] text-[#262626] transition-colors"
          )}
        >
          <Settings2 size={13} />
          <span>Configurações</span>
        </button>

        {settingsOpen && (
          <div className="absolute right-0 top-full mt-1 bg-white border border-[#dbdbdb] rounded-xl shadow-lg z-50 min-w-[200px] overflow-hidden py-2">
            <p className="px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#8e8e8e]">Exibição</p>
            {[
              { key: "showBio" as const, label: "Exibir perfil" },
              { key: "showHighlights" as const, label: "Exibir destaques" },
              { key: "showContentMap" as const, label: "Exibir mapa de conteúdo" },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center justify-between px-4 py-2 hover:bg-[#fafafa] cursor-pointer">
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
    <div onClick={onChange} className={cn(
      "relative w-9 h-5 rounded-full transition-colors cursor-pointer",
      checked ? "bg-[#0095f6]" : "bg-[#dbdbdb]"
    )}>
      <div className={cn(
        "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform",
        checked ? "translate-x-4" : "translate-x-0.5"
      )} />
    </div>
  );
}
