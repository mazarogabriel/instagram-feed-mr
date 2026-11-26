"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function SessionBar({ email }: { email: string }) {
  const [loading, setLoading] = useState(false);

  async function handleSignOut() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.reload();
  }

  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="max-w-[170px] truncate text-[10px] text-[#77736d]" title={email}>
        {email}
      </span>
      <button
        type="button"
        onClick={handleSignOut}
        disabled={loading}
        aria-label="Sair da conta"
        title="Sair"
        className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[#77736d] transition hover:bg-[#f2f1ee] hover:text-[#262626] disabled:opacity-50"
      >
        <LogOut size={15} />
      </button>
    </div>
  );
}
