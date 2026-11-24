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
import StatusFilter from "./StatusFilter";
import PostDetailModal from "./PostDetailModal";
import StoryViewer from "./StoryViewer";

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
  const [showPublished, setShowPublished] = useState(true);
  const [showCompleted, setShowCompleted] = useState(true);
  const [selectedPost, setSelectedPost] = useState<NotionPost | null>(null);
  const [storiesOpen, setStoriesOpen] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("ig-widget-settings");
      if (saved) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(saved) });
      const savedFilters = localStorage.getItem("ig-widget-status-filters");
      if (savedFilters) {
        const parsed = JSON.parse(savedFilters) as {
          showPublished?: boolean;
          showCompleted?: boolean;
        };
        if (typeof parsed.showPublished === "boolean") setShowPublished(parsed.showPublished);
        if (typeof parsed.showCompleted === "boolean") setShowCompleted(parsed.showCompleted);
      }
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

  useEffect(() => {
    try {
      localStorage.setItem(
        "ig-widget-status-filters",
        JSON.stringify({ showPublished, showCompleted })
      );
    } catch {
      // Browser storage can be unavailable in private contexts.
    }
  }, [showPublished, showCompleted]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(undefined);

    try {
      const response = await fetch("/api/posts?refresh=" + Date.now(), {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache, no-store",
          Pragma: "no-cache",
        },
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Não foi possível atualizar as publicações.");
      }
      if (!Array.isArray(data.posts)) {
        throw new Error("A resposta do Notion não trouxe uma lista de publicações.");
      }

      // Replace the array reference so every view (grid, map and Stories)
      // recalculates from the same fresh Notion response.
      setPosts([...data.posts]);
      setLastUpdated(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro desconhecido.");
    } finally {
      setLoading(false);
    }
  }, []);

  const sortedPosts = sortPosts(posts);
  const feedPosts = sortedPosts.filter((post) => post.format !== "Stories");

  const visiblePosts = feedPosts.filter((post) => {
    if (post.status === "Publicado") return showPublished;
    if (post.status === "Concluído") return showCompleted;
    return false;
  });

  // Only published Stories are grouped behind the profile-photo story ring.
  // Completed Stories stay out of both the ring and the normal post grid.
  const publishedStories = sortedPosts
    .filter((post) => post.format === "Stories" && post.status === "Publicado")
    .sort((a, b) => {
      if (!a.publishDate && !b.publishDate) return 0;
      if (!a.publishDate) return -1;
      if (!b.publishDate) return 1;
      return a.publishDate.localeCompare(b.publishDate);
    });

  const publishedCount = feedPosts.filter((post) => post.status === "Publicado").length;
  const completedCount = feedPosts.filter((post) => post.status === "Concluído").length;
  const [activeTab, setActiveTab] = useState<"grid" | "map">("grid");

  return (
    <div className="w-full max-w-[430px] min-h-[780px] overflow-hidden rounded-[28px] border border-[#e8e6e2] bg-white shadow-[0_18px_55px_rgba(28,25,20,0.10)]">
      <div className="flex items-center justify-center border-b border-[#efefef] bg-white px-4 py-3">
        <span className="text-[13px] font-semibold uppercase tracking-[0.16em] text-[#262626]">
          Melina Romano
        </span>
      </div>

      {settings.showBio && (
        <ProfileHeader
          profile={profile}
          postCount={visiblePosts.length}
          storyCount={publishedStories.length}
          onOpenStories={() => setStoriesOpen(true)}
        />
      )}

      {settings.showHighlights && highlights.length > 0 && (
        <div className="border-b border-[#dbdbdb] py-3">
          <Highlights highlights={highlights} />
        </div>
      )}

      <Toolbar
        settings={settings}
        onSettingsChange={setSettings}
        onRefresh={refresh}
        loading={loading}
      />

      <StatusFilter
        showPublished={showPublished}
        showCompleted={showCompleted}
        publishedCount={publishedCount}
        completedCount={completedCount}
        onPublishedChange={setShowPublished}
        onCompletedChange={setShowCompleted}
      />

      {error && <ErrorBanner message={error} />}

      <div className="flex border-b border-[#dbdbdb]">
        <button
          onClick={() => setActiveTab("grid")}
          className={
            "flex flex-1 items-center justify-center gap-1.5 border-b-2 py-3 text-[12px] font-semibold transition-colors " +
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
              "flex flex-1 items-center justify-center gap-1.5 border-b-2 py-3 text-[12px] font-semibold transition-colors " +
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
        <InstagramGrid posts={visiblePosts} onSelectPost={setSelectedPost} />
      ) : (
        <ContentMap posts={visiblePosts} />
      )}

      <div className="mt-2 border-t border-[#dbdbdb] px-4 py-3 text-center">
        <p className="text-[10px] text-[#8e8e8e]">
          Conectado ao Notion · {visiblePosts.length} publicações visíveis
          {lastUpdated
            ? " · Atualizado às " +
              lastUpdated.toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
              })
            : ""}
        </p>
      </div>

      {selectedPost && (
        <PostDetailModal post={selectedPost} onClose={() => setSelectedPost(null)} />
      )}

      {storiesOpen && (
        <StoryViewer
          posts={publishedStories}
          username={"@" + profile.username}
          onClose={() => setStoriesOpen(false)}
        />
      )}
    </div>
  );
}
