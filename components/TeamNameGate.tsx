"use client";

import { useEffect, useState } from "react";
import { UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type TeamName = { display_name: string };

export default function TeamNameGate({ onSelect }: { onSelect: (name: string) => void }) {
  const [names, setNames] = useState<TeamName[]>([]);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function loadNames() {
      try {
        const supabase = createClient();
        const { data, error: queryError } = await supabase
          .from("team_display_names")
          .select("display_name")
          .eq("enabled", true)
          .order("display_name");
        if (queryError) throw queryError;
        if (active) setNames((data ?? []) as TeamName[]);
      } catch {
        if (active) setError("Não foi possível carregar a lista de integrantes.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadNames();
    return () => { active = false; };
  }, []);

  return (
    <section className="w-full max-w-[390px] rounded-[24px] border border-[#e8e6e2] bg-white p-7 shadow-[0_18px_55px_rgba(28,25,20,0.10)]">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-[#f2f1ee] text-[#4c4944]">
          <UserRound size={21} />
        </div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8e8e8e]">
          Melina Romano · LAB MR
        </p>
        <h1 className="mt-2 text-[22px] font-semibold tracking-[-0.03em] text-[#262626]">
          Acesso da equipe
        </h1>
        <p className="mt-2 text-[13px] leading-6 text-[#77736d]">
          Selecione seu nome para acessar as publicações.
        </p>
      </div>

      {loading ? (
        <p className="py-3 text-center text-[12px] text-[#77736d]">Carregando integrantes…</p>
      ) : error ? (
        <p role="alert" className="rounded-xl bg-[#fbefed] px-3 py-3 text-[12px] leading-5 text-[#9b3429]">{error}</p>
      ) : names.length === 0 ? (
        <p className="rounded-xl bg-[#f7f6f3] px-3 py-3 text-[12px] leading-5 text-[#77736d]">
          Nenhum integrante foi cadastrado. Adicione nomes na tabela team_display_names do Supabase.
        </p>
      ) : (
        <form onSubmit={(event) => { event.preventDefault(); if (selected) onSelect(selected); }} className="space-y-3">
          <label htmlFor="team-display-name" className="block text-[11px] font-semibold text-[#4c4944]">
            Seu nome
          </label>
          <select
            id="team-display-name"
            required
            value={selected}
            onChange={(event) => setSelected(event.target.value)}
            className="w-full rounded-xl border border-[#dedbd5] bg-white px-4 py-3 text-[13px] text-[#262626] outline-none focus:border-[#77736d]"
          >
            <option value="">Selecione seu nome</option>
            {names.map((member) => (
              <option key={member.display_name} value={member.display_name}>{member.display_name}</option>
            ))}
          </select>
          <button
            type="submit"
            disabled={!selected}
            className="flex w-full items-center justify-center rounded-xl bg-[#262626] px-4 py-3 text-[13px] font-medium text-white transition hover:bg-[#444] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Entrar
          </button>
        </form>
      )}

      <p className="mt-7 text-center text-[10px] leading-5 text-[#99958e]">
        A identificação fica salva neste dispositivo e navegador.
      </p>
    </section>
  );
}
