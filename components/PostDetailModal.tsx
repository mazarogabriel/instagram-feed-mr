"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { X, ExternalLink, CalendarDays, ChevronLeft, ChevronRight, Images, Play } from "lucide-react";
import type { NotionPost, StoryMedia } from "@/lib/types";
import { formatDate } from "@/lib/utils";

interface PostDetailModalProps {
  post: NotionPost;
  profileName: string;
  onClose: () => void;
}

export default function PostDetailModal({
  post,
  profileName,
  onClose,
}: PostDetailModalProps) {
  const media = useMemo<StoryMedia[]>(() => {
    if (post.media?.length) return post.media;
    if (post.thumbnail) {
      return [{ url: post.thumbnail, kind: "image" }];
    }
    return [];
  }, [post]);

  const [activeIndex, setActiveIndex] = useState(0);
  const currentMedia = media[activeIndex];

  useEffect(() => {
    setActiveIndex(0);
  }, [post.id]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") {
        setActiveIndex((index) => Math.min(media.length - 1, index + 1));
      }
      if (event.key === "ArrowLeft") {
        setActiveIndex((index) => Math.max(0, index - 1));
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [media.length, onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-3 sm:p-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={"Publicação: " + post.title}
        className="relative flex max-h-[92vh] w-full max-w-[850px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:flex-row"
      >
        <div className="relative flex max-h-[48vh] min-h-[220px] w-full flex-shrink-0 items-center justify-center bg-[#111] sm:max-h-none sm:min-h-[560px] sm:w-[48%]">
          {currentMedia?.kind === "video" ? (
            <video
              key={currentMedia.url}
              src={currentMedia.url}
              controls
              playsInline
              className="h-full max-h-[48vh] w-full object-contain sm:max-h-[92vh]"
            />
          ) : currentMedia?.url ? (
            <Image
              key={currentMedia.url}
              src={currentMedia.url}
              alt={post.title}
              fill
              className="object-contain"
              unoptimized
              sizes="(max-width: 640px) 100vw, 420px"
            />
          ) : (
            <div className="flex h-full min-h-[220px] items-center justify-center p-8 text-center text-sm text-white/70">
              Nenhuma imagem ou vídeo cadastrado
            </div>
          )}

          {media.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Mídia anterior"
                onClick={() => setActiveIndex((index) => Math.max(0, index - 1))}
                disabled={activeIndex === 0}
                className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white disabled:opacity-30"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                type="button"
                aria-label="Próxima mídia"
                onClick={() => setActiveIndex((index) => Math.min(media.length - 1, index + 1))}
                disabled={activeIndex === media.length - 1}
                className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white disabled:opacity-30"
              >
                <ChevronRight size={20} />
              </button>
              <span className="absolute bottom-3 right-3 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-medium text-white">
                {activeIndex + 1} / {media.length}
              </span>
            </>
          )}
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex items-start justify-between gap-4 border-b border-[#efefef] px-5 py-4">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8e8e8e]">
                {profileName}
              </p>
              <h2 className="mt-1 text-base font-semibold leading-snug text-[#262626]">
                {post.title}
              </h2>
              {media.length > 1 && (
                <p className="mt-1 inline-flex items-center gap-1 text-[10px] text-[#8e8e8e]">
                  <Images size={12} /> Carrossel · {media.length} mídias
                </p>
              )}
              {media.length === 1 && media[0].kind === "video" && (
                <p className="mt-1 inline-flex items-center gap-1 text-[10px] text-[#8e8e8e]">
                  <Play size={11} /> Vídeo
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar publicação"
              className="rounded-full p-1.5 text-[#6f6f6f] transition-colors hover:bg-[#f2f2f2]"
            >
              <X size={19} />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-[#77736d]">
              {post.publishDate && (
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays size={13} />
                  {formatDate(post.publishDate)}
                </span>
              )}
              {post.status && (
                <span className="rounded-full bg-[#f1f0ed] px-2.5 py-1">
                  {post.status}
                </span>
              )}
              {post.format && (
                <span className="rounded-full bg-[#f1f0ed] px-2.5 py-1">
                  {post.format}
                </span>
              )}
            </div>
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8e8e8e]">
              Legenda
            </h3>
            <p className="whitespace-pre-wrap text-[13px] leading-[1.75] text-[#262626]">
              {post.caption || "A legenda ainda não foi preenchida nesta publicação."}
            </p>
          </div>

          <div className="border-t border-[#efefef] px-5 py-3">
            <a
              href={post.pageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#262626] hover:underline"
            >
              Abrir no Notion <ExternalLink size={12} />
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
