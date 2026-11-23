"use client";

import { useState } from "react";
import Image from "next/image";
import { cn, formatDate } from "@/lib/utils";
import type { NotionPost } from "@/lib/types";
import { CalendarDays } from "lucide-react";

interface GridCellProps {
  post: NotionPost;
  index: number;
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

export default function GridCell({ post, index }: GridCellProps) {
  const [hover, setHover] = useState(false);
  const [imgError, setImgError] = useState(false);
  const statusColor = post.status ? STATUS_COLORS[post.status] ?? "bg-gray-400" : null;

  return (
    <div
      className="relative cursor-pointer select-none group"
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
            sizes="(max-width: 600px) 33vw, 200px"
            unoptimized
          />
        ) : (
          <PlaceholderCell index={index} title={post.title} />
        )}

        <div
          className={cn(
            "absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-1 transition-opacity duration-200 p-2",
            hover ? "opacity-100" : "opacity-0"
          )}
        >
          {post.publishDate && (
            <div className="flex items-center gap-1 text-white text-[10px] font-medium">
              <CalendarDays size={10} />
              <span>{formatDate(post.publishDate)}</span>
            </div>
          )}
          <p className="text-white text-[11px] font-semibold text-center line-clamp-2 mt-1 leading-tight">
            {post.title}
          </p>
        </div>
      </div>

      {statusColor && (
        <div
          className={cn(
            "absolute top-1.5 right-1.5 w-2 h-2 rounded-full border border-white/80",
            statusColor
          )}
          title={post.status ?? ""}
        />
      )}
    </div>
  );
}

function PlaceholderCell({ index, title }: { index: number; title: string }) {
  const gradients = [
    "from-rose-200 to-pink-300",
    "from-sky-200 to-blue-300",
    "from-emerald-200 to-green-300",
    "from-violet-200 to-purple-300",
    "from-amber-200 to-yellow-300",
    "from-teal-200 to-cyan-300",
  ];
  const gradient = gradients[index % gradients.length];

  return (
    <div className={cn(
      "absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br gap-1 p-2",
      gradient
    )}>
      <span className="text-white/70 text-[10px] font-medium text-center line-clamp-3 leading-tight">
        {title}
      </span>
    </div>
  );
}
