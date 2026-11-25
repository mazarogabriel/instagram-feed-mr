"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Image from "next/image";
import type { NotionPost, Profile, Highlight, WidgetSettings, StoryMedia } from "@/lib/types";
import type { ProfileKey } from "@/lib/notion";
import { sortPosts } from "@/lib/utils";
import { optimizedMediaUrl } from "@/lib/media-url";
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

interface InitialSnapshot {
  posts: NotionPost[];
  revision: string;
  error?: string;
}

interface CachedPostMedia {
  media: StoryMedia[];
  caption: string | null;
  loadedAt: number;
}

const MEDIA_CACHE_TTL = 45 * 60 * 1000;
const MEDIA_BATCH_SIZE = 4;

function preloadImage(url: string): Promise<void> {
  return new Promise((resolve) => {
    const image = new window.Image();
    image.decoding = "async";
    image.onload = () => resolve();
    image.onerror = () => resolve();
    image.src = optimizedMediaUrl(url, 1200, 75);
    if (image.complete) resolve();
  });
}

async function preloadMediaAssets(media: StoryMedia[]): Promise<void> {
  const images = media.filter((item) => item.kind === "image");
  for (let index = 0; index < images.length; index += 2) {
    await Promise.all(images.slice(index, index + 2).map((item) => preloadImage(item.url)));
  }

  // For video, fetch metadata only. Full video files can be very large and
  // should stream when opened rather than silently consuming the user's data.
  media
    .filter((item) => item.kind === "video")
    .forEach((item) => {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.src = item.url;
      video.load();
    });
}

interface InstagramWidgetProps {
  initialProfiles: Record<ProfileKey, InitialSnapshot>;
  profile: Profile;
  highlights: Highlight[];
}

interface ProfileConfig {
  name: string;
  profile: Profile;
  logo: string;
}

const DEFAULT_SETTINGS: WidgetSettings = {
  showBio: true,
  showHighlights: true,
  showContentMap: false,
  sortMode: "date",
};

export default function InstagramWidget({
  initialProfiles,
  profile,
  highlights,
}: InstagramWidgetProps) {
  const profileConfigs: Record<ProfileKey, ProfileConfig> = {
    mr: {
      name: "Melina Romano",
      logo: "/mr-profile.jpg",
      profile: {
        ...profile,
        displayName: "Melina Romano Studio",
        username: "mr.melinaromano",
        avatarUrl: "/mr-profile.jpg",
      },
    },
    lab: {
      name: "LAB MR",
      logo: "/lab-mr-profile.jpg",
      profile: {
        username: "",
        displayName: "LAB MR",
        bio: "Arte, design e pesquisa.",
        website: "",
        avatarUrl: "/lab-mr-profile.jpg",
      },
    },
  };

  const [activeProfile, setActiveProfile] = useState<ProfileKey>("mr");
  const [postsByProfile, setPostsByProfile] = useState<Record<ProfileKey, NotionPost[]>>({
    mr: initialProfiles.mr.posts,
    lab: initialProfiles.lab.posts,
  });
  const [loadingByProfile, setLoadingByProfile] = useState<Record<ProfileKey, boolean>>({
    mr: false,
    lab: false,
  });
  const [errorsByProfile, setErrorsByProfile] = useState<Record<ProfileKey, string | undefined>>({
    mr: initialProfiles.mr.error,
    lab: initialProfiles.lab.error,
  });
  const [settings, setSettings] = useState<WidgetSettings>(DEFAULT_SETTINGS);
  const [showPublished, setShowPublished] = useState(true);
  const [showCompleted, setShowCompleted] = useState(true);
  const [selectedPost, setSelectedPost] = useState<NotionPost | null>(null);
  const [selectedPostLoading, setSelectedPostLoading] = useState(false);
  const [selectedPostError, setSelectedPostError] = useState<string | undefined>();
  const postDetailRequestSequence = useRef(0);
  const postMediaCache = useRef<Record<ProfileKey, Map<string, CachedPostMedia>>>({
    mr: new Map(),
    lab: new Map(),
  });
  const preloadingProfiles = useRef<Record<ProfileKey, boolean>>({
    mr: false,
    lab: false,
  });
  const [storiesOpen, setStoriesOpen] = useState(false);
  const [lastUpdatedByProfile, setLastUpdatedByProfile] = useState<Record<ProfileKey, Date | null>>({
    mr: initialProfiles.mr.error ? null : new Date(),
    lab: initialProfiles.lab.error ? null : new Date(),
  });
  const requestSequence = useRef<Record<ProfileKey, number>>({ mr: 0, lab: 0 });
  const currentRevisions = useRef<Record<ProfileKey, string>>({
    mr: initialProfiles.mr.revision,
    lab: initialProfiles.lab.revision,
  });

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

  const loadPosts = useCallback(async (profileKey: ProfileKey, silent = false) => {
    const requestId = ++requestSequence.current[profileKey];
    if (!silent) {
      setLoadingByProfile((current) => ({ ...current, [profileKey]: true }));
      setErrorsByProfile((current) => ({ ...current, [profileKey]: undefined }));
    }

    try {
      const response = await fetch(
        "/api/posts?profile=" + profileKey + "&refresh=" + Date.now(),
        {
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache, no-store",
            Pragma: "no-cache",
          },
        }
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Não foi possível atualizar as publicações.");
      }
      if (!Array.isArray(data.posts)) {
        throw new Error("A resposta do Notion não trouxe uma lista de publicações.");
      }

      if (requestId === requestSequence.current[profileKey]) {
        // A changed Notion revision may have new media URLs or expired file
        // links. Discard this profile's media cache and let the queue rebuild it.
        postMediaCache.current[profileKey].clear();
        setPostsByProfile((current) => ({ ...current, [profileKey]: [...data.posts] }));
        currentRevisions.current[profileKey] = data.revision ?? "";
        setLastUpdatedByProfile((current) => ({ ...current, [profileKey]: new Date() }));
        if (silent) {
          setErrorsByProfile((current) => ({ ...current, [profileKey]: undefined }));
        }
      }
    } catch (e) {
      if (requestId === requestSequence.current[profileKey] && !silent) {
        setErrorsByProfile((current) => ({
          ...current,
          [profileKey]: e instanceof Error ? e.message : "Erro desconhecido.",
        }));
      }
    } finally {
      if (requestId === requestSequence.current[profileKey] && !silent) {
        setLoadingByProfile((current) => ({ ...current, [profileKey]: false }));
      }
    }
  }, []);

  const refresh = useCallback(() => {
    void loadPosts(activeProfile);
  }, [activeProfile, loadPosts]);

  // One lightweight request checks both profiles every 10 seconds. Only a
  // profile whose revision changed receives the heavier media refresh.
  useEffect(() => {
    let disposed = false;
    let checking = false;

    const checkForUpdates = async () => {
      if (checking || document.visibilityState !== "visible") return;
      checking = true;

      try {
        const response = await fetch(
          "/api/posts/revision?profile=all&check=" + Date.now(),
          {
            cache: "no-store",
            headers: {
              "Cache-Control": "no-cache, no-store",
              Pragma: "no-cache",
            },
          }
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error ?? "Não foi possível verificar o Notion.");
        }

        if (disposed || !data.revisions) return;

        const changedProfiles = (["mr", "lab"] as ProfileKey[]).filter((profileKey) => {
          const nextRevision = data.revisions[profileKey];
          return (
            typeof nextRevision === "string" &&
            nextRevision !== currentRevisions.current[profileKey]
          );
        });

        // Keep the polling cycle locked until any changed profile finishes
        // loading, preventing duplicate refreshes on slow Notion responses.
        await Promise.all(
          changedProfiles.map((profileKey) => loadPosts(profileKey, true))
        );
      } catch {
        // Background checks stay quiet; the manual refresh remains available.
      } finally {
        checking = false;
      }
    };

    const timer = window.setInterval(() => {
      void checkForUpdates();
    }, 10_000);

    return () => {
      disposed = true;
      window.clearInterval(timer);
    };
  }, [loadPosts]);

  const switchProfile = (profileKey: ProfileKey) => {
    if (profileKey === activeProfile) return;
    setActiveProfile(profileKey);
    postDetailRequestSequence.current += 1;
    setSelectedPost(null);
    setSelectedPostLoading(false);
    setSelectedPostError(undefined);
    setStoriesOpen(false);

    // Profiles are already loaded into memory. Retry only when the initial
    // server-side load for the selected profile failed.
    if (errorsByProfile[profileKey]) {
      void loadPosts(profileKey);
    }
  };

  const openPost = (post: NotionPost) => {
    const requestId = ++postDetailRequestSequence.current;
    const profileKey = activeProfile;
    const cached = postMediaCache.current[profileKey].get(post.id);
    const cacheIsFresh = cached && Date.now() - cached.loadedAt < MEDIA_CACHE_TTL;

    setSelectedPost(
      cacheIsFresh
        ? { ...post, media: cached.media, caption: cached.caption ?? post.caption }
        : post
    );
    setSelectedPostLoading(!cacheIsFresh);
    setSelectedPostError(undefined);

    if (cacheIsFresh) return;

    void (async () => {
      try {
        const response = await fetch(
          "/api/posts/" + post.id + "/media?profile=" + profileKey,
          {
            cache: "no-store",
            headers: {
              "Cache-Control": "no-cache, no-store",
              Pragma: "no-cache",
            },
          }
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error ?? "Não foi possível carregar as mídias.");
        }

        if (Array.isArray(data.media)) {
          const media = data.media as StoryMedia[];
          const caption = data.caption ?? post.caption;
          postMediaCache.current[profileKey].set(post.id, {
            media,
            caption,
            loadedAt: Date.now(),
          });

          if (requestId === postDetailRequestSequence.current) {
            setSelectedPost((current) =>
              current?.id === post.id
                ? {
                    ...current,
                    media,
                    thumbnail:
                      media.find((asset) => asset.kind === "image")?.url ??
                      media[0]?.url ??
                      current.thumbnail,
                    caption,
                  }
                : current
            );
            void preloadMediaAssets(media);
          }
        }
      } catch (error) {
        if (requestId === postDetailRequestSequence.current) {
          setSelectedPostError(
            error instanceof Error ? error.message : "Erro ao carregar as mídias."
          );
        }
      } finally {
        if (requestId === postDetailRequestSequence.current) {
          setSelectedPostLoading(false);
        }
      }
    })();
  };

  // After the thumbnails have rendered, progressively fetch full media
  // metadata for both profiles. Each profile is processed newest to oldest,
  // in small batches, and image downloads are limited to two at a time.
  useEffect(() => {
    let cancelled = false;
    let started = false;

    const prefetchProfile = async (profileKey: ProfileKey) => {
      if (preloadingProfiles.current[profileKey]) return;
      preloadingProfiles.current[profileKey] = true;

      try {
        const candidates = [...(postsByProfile[profileKey] ?? [])]
          .filter((post) => post.status === "Publicado" || post.status === "Concluído")
          .sort((a, b) => {
            const dateA = a.publishDate ? new Date(a.publishDate).getTime() : 0;
            const dateB = b.publishDate ? new Date(b.publishDate).getTime() : 0;
            return dateB - dateA;
          });

        for (let index = 0; index < candidates.length && !cancelled; index += MEDIA_BATCH_SIZE) {
          const batch = candidates
            .slice(index, index + MEDIA_BATCH_SIZE)
            .filter((post) => {
              const cached = postMediaCache.current[profileKey].get(post.id);
              return !cached || Date.now() - cached.loadedAt >= MEDIA_CACHE_TTL;
            });

          if (batch.length === 0) continue;

          try {
            const response = await fetch("/api/posts/media/batch", {
              method: "POST",
              cache: "no-store",
              headers: {
                "Content-Type": "application/json",
                "Cache-Control": "no-cache, no-store",
                Pragma: "no-cache",
              },
              body: JSON.stringify({
                profile: profileKey,
                pageIds: batch.map((post) => post.id),
              }),
            });

            if (!response.ok) continue;
            const data = await response.json();
            const results = data.results as Record<
              string,
              { media: StoryMedia[]; caption: string | null }
            > | undefined;

            if (!results || cancelled) continue;

            // Store all metadata first, then download the actual image bytes
            // in publication order before moving to older posts.
            const mediaToPreload: StoryMedia[] = [];
            for (const post of batch) {
              const details = results[post.id];
              if (!details || !Array.isArray(details.media)) continue;

              postMediaCache.current[profileKey].set(post.id, {
                media: details.media,
                caption: details.caption ?? post.caption,
                loadedAt: Date.now(),
              });
              mediaToPreload.push(...details.media);
            }

            await preloadMediaAssets(mediaToPreload);
          } catch {
            // A failed batch does not block the rest of the background queue.
          }
        }
      } finally {
        preloadingProfiles.current[profileKey] = false;
      }
    };

    const startPrefetch = () => {
      if (started || document.visibilityState !== "visible") return;
      started = true;
      void Promise.all([
        prefetchProfile("mr"),
        prefetchProfile("lab"),
      ]);
    };

    const timer = window.setTimeout(startPrefetch, 1500);
    document.addEventListener("visibilitychange", startPrefetch);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", startPrefetch);
    };
  }, [postsByProfile]);

  const activeConfig = profileConfigs[activeProfile];
  const activeProfileData = activeConfig.profile;
  const posts = postsByProfile[activeProfile] ?? [];
  const loading = loadingByProfile[activeProfile];
  const error = errorsByProfile[activeProfile];
  const lastUpdated = lastUpdatedByProfile[activeProfile];
  const sortedPosts = sortPosts(posts);
  const feedPosts = sortedPosts.filter((post) => post.format !== "Stories");

  const visiblePosts = feedPosts.filter((post) => {
    if (post.status === "Publicado") return showPublished;
    if (post.status === "Concluído") return showCompleted;
    return false;
  });

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
      <div className="flex items-center justify-center border-b border-[#efefef] bg-white px-3 py-3">
        <div className="inline-flex items-center rounded-full bg-[#f4f4f4] p-1">
          {(["mr", "lab"] as ProfileKey[]).map((profileKey) => {
            const config = profileConfigs[profileKey];
            const active = activeProfile === profileKey;
            const hasPublishedStories = (postsByProfile[profileKey] ?? []).some(
              (post) => post.format === "Stories" && post.status === "Publicado"
            );

            return (
              <button
                key={profileKey}
                type="button"
                onClick={() => switchProfile(profileKey)}
                aria-label={"Alternar para " + config.name}
                title={config.name}
                aria-pressed={active}
                className={
                  "relative flex h-[42px] w-[42px] flex-shrink-0 items-center justify-center rounded-full p-1.5 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0095f6] " +
                  (hasPublishedStories
                    ? "bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600"
                    : active
                      ? "bg-white shadow-sm"
                      : "bg-transparent opacity-70 hover:opacity-100")
                }
              >
                <span className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-white">
                  <Image
                    src={config.logo}
                    alt={config.name}
                    width={22}
                    height={22}
                    className="h-[22px] w-[22px] rounded-full bg-white object-contain"
                    unoptimized
                  />
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {settings.showBio && (
        <ProfileHeader
          profile={activeProfileData}
          postCount={visiblePosts.length}
          storyCount={publishedStories.length}
          onOpenStories={() => setStoriesOpen(true)}
        />
      )}

      {settings.showHighlights && activeProfile === "mr" && highlights.length > 0 && (
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
        <InstagramGrid posts={visiblePosts} onSelectPost={openPost} />
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
          {" · Verificação automática a cada 10 s"}
        </p>
      </div>

      {selectedPost && (
        <PostDetailModal
          post={selectedPost}
          profileName={activeProfileData.displayName}
          loadingMedia={selectedPostLoading}
          mediaError={selectedPostError}
          onClose={() => {
            postDetailRequestSequence.current += 1;
            setSelectedPost(null);
            setSelectedPostLoading(false);
            setSelectedPostError(undefined);
          }}
        />
      )}

      {storiesOpen && (
        <StoryViewer
          posts={publishedStories}
          username={activeProfileData.username
            ? "@" + activeProfileData.username
            : activeProfileData.displayName}
          avatarUrl={activeProfileData.avatarUrl}
          profileKey={activeProfile}
          onClose={() => setStoriesOpen(false)}
        />
      )}
    </div>
  );
}
