"use client";

import { useState } from "react";
import Image from "next/image";
import { cn, formatDate } from "@/lib/utils";
import type { NotionPost } from "@/lib/types";
import { CalendarDays, Play, Copy } from "lucide-react";

interface GridCellProps {
  post: NotionPost;
  onClick: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  Planejado: "bg-gray-400",
  "Em produção": "bg-yellow-400",
  Revisar: "bg-red-500",
  Agendado: "bg-blue-500",
  Aprovado: "bg-sky-500",
  Publicado: "bg-green-500",
  Concluído: "bg-green-600",
};

export default function GridCell({ post, onClick }: GridCellProps) {
  const [hover, setHover] = useState(false);
  const [imgError, setImgError] = useState(false);
  const statusColor = post.status ? STATUS_COLORS[post.status] ?? "bg-gray-400" : null;
  const hasVideo = post.media?.some((asset) => asset.kind === "video") ?? false;
  const previewVideo =
    post.media?.find((asset) => asset.kind === "video") &&
    !(post.media?.some((asset) => asset.kind === "image") ?? false)
      ? post.media.find((asset) => asset.kind === "video")
      : null;
  const mediaCount = post.media?.length ?? 0;

  return (
    <button
      type="button"
      aria-label={"Abrir publicação: " + post.title}
      className="group relative block w-full cursor-pointer select-none text-left"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div className="grid-image">
        {previewVideo ? (
          <video
            src={previewVideo.url}
            autoPlay
            muted
            loop
            playsInline
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : post.thumbnail && !imgError ? (
          <Image
            src={post.thumbnail}
            alt={post.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            onError={() => setImgError(true)}
            sizes="(max-width: 430px) 33vw, 140px"
            unoptimized
          />
        ) : (
          <PlaceholderCell title={post.title} />
        )}

        <div
          className={cn(
            "absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/45 p-2 transition-opacity duration-200",
            hover ? "opacity-100" : "opacity-0"
          )}
        >
          {post.publishDate && (
            <div className="flex items-center gap-1 text-[10px] font-medium text-white">
              <CalendarDays size={10} />
              <span>{formatDate(post.publishDate)}</span>
            </div>
          )}
          <p className="mt-1 line-clamp-2 text-center text-[11px] font-semibold leading-tight text-white">
            {post.title}
          </p>
          <span className="mt-1 text-[9px] uppercase tracking-[0.12em] text-white/80">
            Ver publicação
          </span>
        </div>
      </div>

      <div className="absolute right-1.5 top-1.5 flex items-center gap-1">
        {mediaCount > 1 && (
          <span className="rounded bg-black/45 p-1 text-white" title={mediaCount + " mídias"}>
            <Copy size={12} />
          </span>
        )}
        {hasVideo && (
          <span className="rounded bg-black/45 p-1 text-white" title="Contém vídeo">
            <Play size={12} fill="currentColor" />
          </span>
        )}
        {statusColor && (
          <span
            className={cn("h-2 w-2 rounded-full border border-white/80", statusColor)}
            title={post.status ?? ""}
          />
        )}
      </div>
    </button>
  );
}

function PlaceholderCell({ title }: { title: string }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[#eeece7] p-3">
      <span className="line-clamp-3 text-center text-[10px] leading-tight tracking-[0.06em] text-[#77736d]">
        {title}
      </span>
    </div>
  );
}
