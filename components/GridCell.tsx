"use client";

import { useState } from "react";
import Image from "next/image";
import { cn, formatDate } from "@/lib/utils";
import type { NotionPost } from "@/lib/types";
import { CalendarDays } from "lucide-react";

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

  return (
    <button
      type="button"
      aria-label={"Abrir publicação: " + post.title}
      className="relative block w-full cursor-pointer select-none text-left group"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div className="grid-image">
        {post.thumbnail && !imgError ? (
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
            Ver legenda
          </span>
        </div>
      </div>

      {statusColor && (
        <div
          className={cn(
            "absolute right-1.5 top-1.5 h-2 w-2 rounded-full border border-white/80",
            statusColor
          )}
          title={post.status ?? ""}
        />
      )}
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
