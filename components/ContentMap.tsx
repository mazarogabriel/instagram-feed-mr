"use client";

import type { NotionPost } from "@/lib/types";
import { formatDate } from "@/lib/utils";

interface ContentMapProps {
  posts: NotionPost[];
}

const STATUS_COLORS: Record<string, string> = {
  Planejado: "#9ca3af",
  "Em produção": "#eab308",
  Revisar: "#ef4444",
  Agendado: "#3b82f6",
  Aprovado: "#0ea5e9",
  Publicado: "#22c55e",
  Concluído: "#16a34a",
};

const STATUS_BG: Record<string, string> = {
  Planejado: "#f9fafb",
  "Em produção": "#fefce8",
  Revisar: "#fef2f2",
  Agendado: "#eff6ff",
  Aprovado: "#f0f9ff",
  Publicado: "#f0fdf4",
  Concluído: "#f0fdf4",
};

export default function ContentMap({ posts }: ContentMapProps) {
  const byStatus = posts.reduce<Record<string, NotionPost[]>>((acc, post) => {
    const key = post.status ?? "Sem status";
    if (!acc[key]) acc[key] = [];
    acc[key].push(post);
    return acc;
  }, {});

  const statuses = Object.keys(byStatus).sort();

  return (
    <div className="px-4 py-3 border-b border-[#dbdbdb]">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-[#8e8e8e] mb-2">
        Status das publicações
      </p>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {statuses.map((status) => {
          const color = STATUS_COLORS[status] ?? "#9ca3af";
          const bg = STATUS_BG[status] ?? "#f9fafb";
          return (
            <div key={status} className="flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-medium" style={{ background: bg, color }}>
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
              <span>{status}</span>
              <span className="text-[10px] opacity-70">({byStatus[status].length})</span>
            </div>
          );
        })}
      </div>

      {(() => {
        const upcoming = posts
          .filter((post) => post.publishDate && new Date(post.publishDate) >= new Date())
          .sort((a, b) => {
            if (!a.publishDate || !b.publishDate) return 0;
            return new Date(a.publishDate).getTime() - new Date(b.publishDate).getTime();
          })
          .slice(0, 5);

        if (upcoming.length === 0) return null;

        return (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#8e8e8e] mb-1.5">
              Próximas publicações
            </p>
            <div className="space-y-1">
              {upcoming.map((post) => {
                const color = STATUS_COLORS[post.status ?? ""] ?? "#9ca3af";
                return (
                  <div key={post.id} className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
                    <span className="text-[11px] text-[#262626] flex-1 truncate">{post.title}</span>
                    <span className="text-[10px] text-[#8e8e8e] flex-shrink-0">{formatDate(post.publishDate)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
