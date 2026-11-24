"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { X, ExternalLink } from "lucide-react";
import type { NotionPost, StoryMedia } from "@/lib/types";
import { formatDate } from "@/lib/utils";

interface StorySlide {
  post: NotionPost;
  media: StoryMedia | null;
}

interface StoryViewerProps {
  posts: NotionPost[];
  username: string;
  avatarUrl: string;
  onClose: () => void;
}

const IMAGE_DURATION = 6000;

export default function StoryViewer({
  posts,
  username,
  avatarUrl,
  onClose,
}: StoryViewerProps) {
  const slides = useMemo<StorySlide[]>(() => {
    return posts.flatMap((post) => {
      const assets = post.media?.length
        ? post.media
        : post.thumbnail
          ? [{ url: post.thumbnail, kind: "image" as const }]
          : [null];

      return assets.map((media) => ({ post, media }));
    });
  }, [posts]);

  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [remainingTime, setRemainingTime] = useState(IMAGE_DURATION);
  const timerStartedAt = useRef<number | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const current = slides[activeIndex];

  const pauseStory = () => {
    if (isPaused) return;

    if (current?.media?.kind !== "video" && timerStartedAt.current !== null) {
      const elapsed = Date.now() - timerStartedAt.current;
      setRemainingTime((previous) => Math.max(0, previous - elapsed));
    }

    setIsPaused(true);
    videoRef.current?.pause();
  };

  const resumeStory = () => {
    setIsPaused(false);
    if (current?.media?.kind === "video") {
      void videoRef.current?.play().catch(() => {
        // Playback can remain paused if the browser blocks autoplay.
      });
    }
  };

  const next = () => {
    if (activeIndex >= slides.length - 1) {
      onClose();
      return;
    }
    setActiveIndex((index) => index + 1);
  };

  const previous = () => {
    setActiveIndex((index) => Math.max(0, index - 1));
  };

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") next();
      if (event.key === "ArrowLeft") previous();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeIndex, slides.length, onClose]);

  useEffect(() => {
    setRemainingTime(IMAGE_DURATION);
    setIsPaused(false);
  }, [activeIndex]);

  useEffect(() => {
    if (!current || current.media?.kind === "video" || isPaused) {
      timerStartedAt.current = null;
      return;
    }

    timerStartedAt.current = Date.now();
    const timer = window.setTimeout(next, remainingTime);

    return () => {
      window.clearTimeout(timer);
      timerStartedAt.current = null;
    };
  }, [activeIndex, current, isPaused, remainingTime]);

  if (!current) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black sm:p-5">
      <div
        className="relative h-[100dvh] w-full max-w-[430px] overflow-hidden bg-[#111] sm:h-[min(92vh,850px)] sm:rounded-2xl"
        onPointerDown={pauseStory}
        onPointerUp={resumeStory}
        onPointerCancel={resumeStory}
        onPointerLeave={resumeStory}
      >
        <div className="absolute inset-0">
          {current.media?.kind === "video" ? (
            <video
              ref={videoRef}
              key={current.media.url}
              src={current.media.url}
              autoPlay
              muted
              playsInline
              onEnded={next}
              onError={next}
              className="h-full w-full object-contain"
            />
          ) : current.media?.url ? (
            <Image
              key={current.media.url}
              src={current.media.url}
              alt={current.post.title}
              fill
              unoptimized
              sizes="(max-width: 430px) 100vw, 430px"
              className="object-contain"
            />
          ) : (
            <div className="flex h-full items-center justify-center px-10 text-center text-white">
              {current.post.title}
            </div>
          )}
        </div>

        <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-black/65 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/65 to-transparent" />

        <div className="absolute inset-x-3 top-3 z-20 flex gap-1">
          {slides.map((slide, index) => (
            <div
              key={slide.post.id + "-" + index}
              className="h-[2px] flex-1 overflow-hidden rounded-full bg-white/40"
            >
              <div
                className={
                  "h-full rounded-full " +
                  (index < activeIndex
                    ? "w-full bg-white"
                    : index === activeIndex
                      ? current.media?.kind === "video"
                        ? "w-1/3 bg-white"
                        : "story-progress bg-white"
                      : "w-0 bg-white")
                }
                style={
                  index === activeIndex && current.media?.kind !== "video"
                    ? {
                        animationDuration: String(IMAGE_DURATION) + "ms",
                        animationPlayState: isPaused ? "paused" : "running",
                      }
                    : undefined
                }
              />
            </div>
          ))}
        </div>

        <div className="absolute inset-x-4 top-8 z-20 flex items-center justify-between">
          <div className="flex min-w-0 items-center gap-2 text-white">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/80 bg-white">
              <Image
                src={avatarUrl}
                alt={username}
                width={34}
                height={34}
                unoptimized
                className="h-full w-full rounded-full object-contain"
              />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[12px] font-semibold">{username}</p>
              <p className="text-[10px] text-white/75">
                {current.post.publishDate
                  ? formatDate(current.post.publishDate)
                  : "Story publicado"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar stories"
            className="rounded-full p-2 text-white hover:bg-white/15"
          >
            <X size={23} />
          </button>
        </div>

        <button
          type="button"
          aria-label="Story anterior"
          onClick={previous}
          className="absolute inset-y-24 left-0 z-10 w-1/2 cursor-pointer"
        />
        <button
          type="button"
          aria-label="Próximo story"
          onClick={next}
          className="absolute inset-y-24 right-0 z-10 w-1/2 cursor-pointer"
        />

        <div className="absolute inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+58px)] z-20 text-white">
          <p className="text-[13px] font-semibold drop-shadow">
            {current.post.title}
          </p>
          {current.post.caption && (
            <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-[12px] leading-relaxed text-white/90 drop-shadow">
              {current.post.caption}
            </p>
          )}
        </div>

        <div className="absolute inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+12px)] z-30 flex justify-end">
          <a
            href={current.post.pageUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Abrir Story no Notion"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
            className="inline-flex items-center gap-1.5 rounded-full bg-black/30 px-2.5 py-1.5 text-[10px] font-medium text-white/85 backdrop-blur-sm transition-colors hover:bg-black/50 hover:text-white"
          >
            Abrir no Notion <ExternalLink size={11} />
          </a>
        </div>
      </div>
    </div>
  );
}
