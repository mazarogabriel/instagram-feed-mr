"use client";

import { useState, useCallback, useEffect } from "react";
import type { NotionPost, Profile, Highlight, WidgetSettings } from "@/lib/types";
import { sortPosts } from "@/lib/utils";
import ProfileHeader from "./ProfileHeader";
import Highlights from "./Highlights";
import Toolbar from "./Toolbar";
import InstagramGrid from "./InstagramGrid";
import ContentMap from "./ContentMap";
import ErrorBanner from "./ErrorBanner";
import LoadingSkeleton from "./LoadingSkeleton";

interface InstagramWidgetProps {
  initialPosts: NotionPost[];
  profile: Profile;
  highlights: Highlight[];
  initialError?: string;
}

const DEFAULT_SETTINGS: WidgetSettings = {
  showBio: true,
  showHighlights: true,
  showContentMap: false,
  sortMode: "date",
};

export default function InstagramWidget({
  initialPosts,
  profile,
  highlights,
  initialError,
}: InstagramWidgetProps) {
  const [posts, setPosts] = useState<NotionPost[]>(initialPosts);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(initialError);
  const [settings, setSettings] = useState<WidgetSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("ig-widget-settings");
      if (saved) setSettings(JSON.parse(saved));
    } catch {
      // Keep defaults if browser storage contains invalid data.
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("ig-widget-settings", JSON.stringify(settings));
    } catch {
      // Browser storage can be unavailable in private contexts.
    }
  }, [settings]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const response = await fetch("/api/posts", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Não foi possível atualizar as publicações.");
      }
      setPosts(data.posts);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro desconhecido.");
    } finally {
      setLoading(false);
    }
  }, []);

  const sortedPosts = sortPosts(posts);
  const [activeTab, setActiveTab] = useState<"grid" | "map">("grid");

  return (
    <div className="w-full max-w-[430px] min-h-[780px] bg-white overflow-hidden rounded-[28px] border border-[#e8e6e2] shadow-[0_18px_55px_rgba(28,25,20,0.10)]">
      <div className="flex items-center justify-center px-4 py-3 border-b border-[#efefef] bg-white">
        <span className="text-[13px] font-semibold tracking-[0.16em] text-[#262626] uppercase">
          Melina Romano
        </span>
      </div>

      {settings.showBio && <ProfileHeader profile={profile} postCount={posts.length} />}

      {settings.showHighlights && highlights.length > 0 && (
        <div className="py-3 border-b border-[#dbdbdb]">
          <Highlights highlights={highlights} />
        </div>
      )}

      <Toolbar
        settings={settings}
        onSettingsChange={setSettings}
        onRefresh={refresh}
        loading={loading}
      />

      {error && <ErrorBanner message={error} />}

      <div className="flex border-b border-[#dbdbdb]">
        <button
          onClick={() => setActiveTab("grid")}
          className={
            "flex-1 flex items-center justify-center gap-1.5 py-3 text-[12px] font-semibold transition-colors border-b-2 " +
            (activeTab === "grid"
              ? "border-[#262626] text-[#262626]"
              : "border-transparent text-[#8e8e8e] hover:text-[#262626]")
          }
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
          Grade
        </button>
        {settings.showContentMap && (
          <button
            onClick={() => setActiveTab("map")}
            className={
              "flex-1 flex items-center justify-center gap-1.5 py-3 text-[12px] font-semibold transition-colors border-b-2 " +
              (activeTab === "map"
                ? "border-[#262626] text-[#262626]"
                : "border-transparent text-[#8e8e8e] hover:text-[#262626]")
            }
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" />
            </svg>
            Mapa de conteúdo
          </button>
        )}
      </div>

      {loading && posts.length === 0 ? (
        <LoadingSkeleton />
      ) : activeTab === "grid" ? (
        <InstagramGrid posts={sortedPosts} />
      ) : (
        <ContentMap posts={sortedPosts} />
      )}

      <div className="px-4 py-3 text-center border-t border-[#dbdbdb] mt-2">
        <p className="text-[10px] text-[#8e8e8e]">
          Conectado ao Notion · {posts.length} publicações
        </p>
      </div>
    </div>
  );
}
