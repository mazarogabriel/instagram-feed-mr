"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { optimizedMediaUrl } from "@/lib/media-url";
import { X, ExternalLink, CalendarDays, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Images, Play } from "lucide-react";
import type { NotionPost, StoryMedia } from "@/lib/types";
import { formatDate } from "@/lib/utils";

interface PostDetailModalProps {
  post: NotionPost;
  profileName: string;
  loadingMedia?: boolean;
  mediaError?: string;
  onClose: () => void;
}

export default function PostDetailModal({
  post,
  profileName,
  loadingMedia = false,
  mediaError,
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
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const mediaTrackRef = useRef<HTMLDivElement>(null);
  const isReel = post.format?.trim().toLocaleLowerCase("pt-BR") === "reels";

  const goToMedia = (index: number) => {
    const safeIndex = Math.max(0, Math.min(media.length - 1, index));
    mediaTrackRef.current?.scrollTo({
      left: safeIndex * (mediaTrackRef.current?.clientWidth ?? 0),
      behavior: "smooth",
    });
    setActiveIndex(safeIndex);
  };

  const handleMediaScroll = () => {
    const track = mediaTrackRef.current;
    if (!track || !track.clientWidth) return;
    const nextIndex = Math.round(track.scrollLeft / track.clientWidth);
    setActiveIndex(Math.max(0, Math.min(media.length - 1, nextIndex)));
  };

  useEffect(() => {
    setActiveIndex(0);
    setDetailsExpanded(false);
    mediaTrackRef.current?.scrollTo({ left: 0, behavior: "auto" });
  }, [post.id]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") {
        goToMedia(activeIndex + 1);
      }
      if (event.key === "ArrowLeft") {
        goToMedia(activeIndex - 1);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [media.length, onClose, activeIndex]);

  return (
    <div
      className={
        "fixed inset-0 z-[100] flex items-center justify-center " +
        (isReel ? "bg-black p-0 sm:p-6" : "bg-black/60 p-3 sm:p-6")
      }
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={"Publicação: " + post.title}
        className={
          "relative flex w-full flex-col overflow-hidden shadow-2xl " +
          (isReel
            ? "h-[100dvh] max-h-[100dvh] max-w-none rounded-none bg-black sm:h-[92vh] sm:max-h-[92vh] sm:max-w-[980px] sm:flex-row sm:rounded-2xl"
            : "max-h-[92vh] max-w-[850px] rounded-2xl bg-white sm:flex-row")
        }
      >
        <div
          className={
            "relative flex w-full flex-shrink-0 items-center justify-center overflow-hidden " +
            (isReel
              ? "h-[calc(100dvh-116px)] max-h-[calc(100dvh-116px)] bg-black sm:h-[92vh] sm:max-h-[92vh] sm:w-[54%]"
              : "max-h-[55vh] self-start overflow-y-auto bg-white sm:h-[92vh] sm:max-h-none sm:w-[48%] sm:overflow-hidden sm:bg-[#111]")
          }
        >
          <div
            ref={mediaTrackRef}
            onScroll={handleMediaScroll}
            className={
              "flex w-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden " +
              (isReel ? "h-full items-center sm:h-full" : "sm:h-[92vh]")
            }
            style={{ touchAction: "pan-x pan-y" }}
          >
            {media.length > 0 ? (
              media.map((item, index) => (
                <div
                  key={item.url + "-" + index}
                  className={
                    "flex w-full min-w-full flex-shrink-0 snap-center items-center justify-center " +
                    (isReel ? "h-full" : "sm:h-[92vh]")
                  }
                >
                  {item.kind === "video" ? (
                    <video
                      src={item.url}
                      controls
                      playsInline
                      preload="metadata"
                      className={
                        isReel
                          ? "block h-full w-full object-cover sm:object-cover"
                          : "block h-auto max-h-[55vh] w-auto max-w-full object-contain sm:max-h-[92vh]"
                      }
                    />
                  ) : (
                    <img
                      src={optimizedMediaUrl(item.url, 1200, 75)}
                      alt={post.title + " - " + (index + 1)}
                      loading="eager"
                      decoding="async"
                      draggable={false}
                      className={
                        isReel
                          ? "block h-full w-full object-contain"
                          : "block h-auto max-h-[55vh] w-auto max-w-full object-contain sm:max-h-[92vh]"
                      }
                    />
                  )}
                </div>
              ))
            ) : (
              <div className="flex min-h-[220px] w-full min-w-full items-center justify-center p-8 text-center text-sm text-[#77736d]">
                {loadingMedia
                  ? "Carregando imagens e vídeos…"
                  : mediaError ?? "Nenhuma imagem ou vídeo cadastrado"}
              </div>
            )}
          </div>

          {isReel && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar Reel"
              className="absolute right-4 top-[calc(env(safe-area-inset-top)+12px)] z-30 rounded-full bg-black/35 p-2 text-white backdrop-blur-sm sm:hidden"
            >
              <X size={22} />
            </button>
          )}

          {media.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Mídia anterior"
                onClick={() => goToMedia(activeIndex - 1)}
                disabled={activeIndex === 0}
                className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white disabled:opacity-30"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                type="button"
                aria-label="Próxima mídia"
                onClick={() => goToMedia(activeIndex + 1)}
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

        <div
          className={
            "z-20 flex min-h-0 flex-col " +
            (isReel
              ? detailsExpanded
                ? "absolute inset-x-0 bottom-0 h-[68dvh] max-h-[68dvh] overflow-hidden bg-white text-[#262626] shadow-[0_-12px_40px_rgba(0,0,0,0.28)] sm:relative sm:inset-auto sm:h-auto sm:max-h-none sm:flex-1 sm:bg-white sm:shadow-none"
                : "relative h-[116px] max-h-[116px] flex-shrink-0 overflow-hidden bg-white text-[#262626] sm:relative sm:inset-auto sm:h-auto sm:max-h-none sm:flex-1 sm:bg-white"
              : "flex-1")
          }
        >
          <div
            className={"flex flex-shrink-0 items-start justify-between gap-4 border-b px-5 py-4 " + (isReel ? "cursor-pointer border-[#efefef] text-[#262626]" : "border-[#efefef]")}
            onClick={isReel ? () => setDetailsExpanded((expanded) => !expanded) : undefined}
            onKeyDown={isReel ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                setDetailsExpanded((expanded) => !expanded);
              }
            } : undefined}
            role={isReel ? "button" : undefined}
            tabIndex={isReel ? 0 : undefined}
            aria-expanded={isReel ? detailsExpanded : undefined}
            aria-label={isReel ? (detailsExpanded ? "Recolher detalhes do Reel" : "Expandir detalhes do Reel") : undefined}
          >
            <div className="min-w-0">
              <p className={"text-[11px] font-semibold uppercase tracking-[0.14em] " + (isReel ? "text-[#8e8e8e]" : "text-[#8e8e8e]")}>
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
              {loadingMedia && (
                <p className="mt-1 text-[10px] text-[#8e8e8e]">
                  Carregando mídias em segundo plano…
                </p>
              )}
              {mediaError && (
                <p className="mt-1 text-[10px] text-red-600">
                  {mediaError}
                </p>
              )}
              {media.length === 1 && media[0].kind === "video" && (
                <p className="mt-1 inline-flex items-center gap-1 text-[10px] text-[#8e8e8e]">
                  <Play size={11} /> Vídeo
                </p>
              )}
            </div>
            {isReel ? (
              <div className="flex flex-shrink-0 items-center gap-2">
                <span className="hidden text-[11px] font-medium text-[#8e8e8e] sm:inline">
                  {detailsExpanded ? "Recolher" : "Ver legenda"}
                </span>
                <span className="rounded-full bg-[#f2f1ee] p-1.5 text-[#555]">
                  {detailsExpanded ? <ChevronDown size={17} /> : <ChevronUp size={17} />}
                </span>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onClose();
                  }}
                  aria-label="Fechar Reel"
                  className="hidden rounded-full p-1.5 text-[#6f6f6f] transition-colors hover:bg-[#f2f2f2] sm:block"
                >
                  <X size={19} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar publicação"
                className="rounded-full p-1.5 text-[#6f6f6f] transition-colors hover:bg-[#f2f2f2]"
              >
                <X size={19} />
              </button>
            )}
          </div>

          <div
            className={
              "min-h-0 flex-1 overflow-y-auto px-5 py-4 " +
              (isReel && !detailsExpanded ? "hidden sm:block" : "")
            }
          >
            <div className={"mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] " + "text-[#77736d]"}>
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
            <h3 className={"mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] " + "text-[#8e8e8e]"}>
              Legenda
            </h3>
            <p className={"whitespace-pre-wrap text-[13px] leading-[1.75] " + "text-[#262626]"}>
              {post.caption || "A legenda ainda não foi preenchida nesta publicação."}
            </p>
          </div>

          <div
            className={
              "border-t px-5 py-3 " +
              (isReel
                ? "border-[#efefef] " + (!detailsExpanded ? "px-5 py-1.5 sm:px-5 sm:py-3" : "px-5 py-3")
                : "border-[#efefef]")
            }
          >
            <a
              href={post.pageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={
                "inline-flex items-center gap-1.5 font-medium text-[#77736d] hover:text-[#262626] hover:underline " +
                (isReel ? "text-[10px] sm:text-[12px]" : "text-[12px]")
              }
            >
              Abrir no Notion <ExternalLink size={12} />
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
