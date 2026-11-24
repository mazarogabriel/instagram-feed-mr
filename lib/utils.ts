import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { NotionPost } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function sortPosts(posts: NotionPost[]): NotionPost[] {
  return [...posts].sort((a, b) => {
    if (!a.publishDate && !b.publishDate) return 0;
    if (!a.publishDate) return 1;
    if (!b.publishDate) return -1;
    return b.publishDate.localeCompare(a.publishDate);
  });
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";

  // Notion date-only values are YYYY-MM-DD. Parsing them as UTC shifts the
  // displayed day backwards in Brazil, so construct a local date explicitly.
  const dateOnly = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const date = dateOnly
    ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
    : new Date(dateStr);

  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function getPlaceholderImage(index: number): string {
  const colors = ["e8d5c4", "c4d5e8", "d5e8c4", "e8c4d5", "d5c4e8", "e8e0c4"];
  const color = colors[index % colors.length];
  return "https://via.placeholder.com/400x400/" + color + "/999999?text=Sem+imagem";
}
