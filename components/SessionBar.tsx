"use client";

import { UserRound, ChevronDown } from "lucide-react";

export default function SessionBar({
  name,
  onChangeName,
}: {
  name: string;
  onChangeName: () => void;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="max-w-[120px] truncate text-[10px] text-[#77736d]" title={name}>
        {name}
      </span>
      <button
        type="button"
        onClick={onChangeName}
        aria-label="Trocar integrante"
        title="Trocar nome"
        className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[#77736d] transition hover:bg-[#f2f1ee] hover:text-[#262626]"
      >
        <ChevronDown size={15} />
      </button>
    </div>
  );
}
