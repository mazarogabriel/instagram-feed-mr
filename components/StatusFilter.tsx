"use client";

interface StatusFilterProps {
  showPublished: boolean;
  showCompleted: boolean;
  publishedCount: number;
  completedCount: number;
  onPublishedChange: (checked: boolean) => void;
  onCompletedChange: (checked: boolean) => void;
}

export default function StatusFilter({
  showPublished,
  showCompleted,
  publishedCount,
  completedCount,
  onPublishedChange,
  onCompletedChange,
}: StatusFilterProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 border-b border-[#efefef] bg-white">
      <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8e8e8e]">
        Exibir
      </span>
      <label className="inline-flex items-center gap-2 text-[12px] text-[#262626] cursor-pointer select-none">
        <input
          type="checkbox"
          checked={showPublished}
          onChange={(event) => onPublishedChange(event.target.checked)}
          className="h-3.5 w-3.5 accent-[#262626]"
        />
        <span>Publicados</span>
        <span className="text-[#8e8e8e] tabular-nums">{publishedCount}</span>
      </label>
      <label className="inline-flex items-center gap-2 text-[12px] text-[#262626] cursor-pointer select-none">
        <input
          type="checkbox"
          checked={showCompleted}
          onChange={(event) => onCompletedChange(event.target.checked)}
          className="h-3.5 w-3.5 accent-[#262626]"
        />
        <span>Concluídos</span>
        <span className="text-[#8e8e8e] tabular-nums">{completedCount}</span>
      </label>
    </div>
  );
}
