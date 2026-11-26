"use client";

import { useEffect, useRef, useState } from "react";
import { UserRound, ChevronDown, LogOut } from "lucide-react";

export default function SessionBar({
  name,
  onSignOut,
}: {
  name: string;
  onSignOut: () => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div ref={menuRef} className="relative flex min-w-0 items-center gap-2">
      <span className="max-w-[120px] truncate text-[10px] text-[#77736d]" title={name}>
        {name}
      </span>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label="Abrir opções da conta"
        aria-expanded={open}
        aria-haspopup="menu"
        title="Opções da conta"
        className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[#77736d] transition hover:bg-[#f2f1ee] hover:text-[#262626]"
      >
        <ChevronDown size={15} />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Opções da conta"
          className="absolute right-0 top-full z-[120] mt-2 w-56 rounded-xl border border-[#e8e6e2] bg-white p-3 shadow-[0_12px_35px_rgba(28,25,20,0.16)]"
        >
          <div className="flex items-center gap-2 border-b border-[#efefef] pb-3">
            <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#f2f1ee] text-[#77736d]">
              <UserRound size={15} />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] text-[#99958e]">Usuário atual</p>
              <p className="truncate text-[12px] font-medium text-[#262626]">{name}</p>
            </div>
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onSignOut();
            }}
            className="mt-2 flex w-full items-center gap-2 rounded-lg px-2 py-2.5 text-left text-[12px] text-[#8f3434] transition hover:bg-[#fbf3f3]"
          >
            <LogOut size={14} />
            Sair
          </button>
        </div>
      )}
    </div>
  );
}
