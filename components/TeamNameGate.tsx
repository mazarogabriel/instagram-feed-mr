"use client";

import { useEffect, useState, type FormEvent } from "react";
import { UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type TeamName = { actor_id: string; display_name: string };

export default function TeamNameGate({
  onSelect,
}: {
  onSelect: (name: string, actorId: string) => void;
}) {
  const [mode, setMode] = useState<"login" | "create">("login");
  const [names, setNames] = useState<TeamName[]>([]);
  const [name, setName] = useState("");
  const [loadingNames, setLoadingNames] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function loadNames() {
      try {
        const supabase = createClient();
        const { data, error: queryError } = await supabase
          .from("team_display_names")
          .select("actor_id,display_name")
          .eq("enabled", true)
          .order("display_name");
        if (queryError) throw queryError;
        if (active) setNames((data ?? []) as TeamName[]);
      } catch {
        if (active) setError("Não foi possível carregar os usuários. Verifique a configuração do banco.");
      } finally {
        if (active) setLoadingNames(false);
      }
    }
    void loadNames();
    return () => { active = false; };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const cleanName = name.trim().replace(/\s+/g, " ");
    if (cleanName.length < 2 || cleanName.length > 40) {
      setError("Digite um nome com até 40 caracteres.");
      return;
    }

    setSaving(true);
    try {
      const existing = names.find(
        (member) => member.display_name.toLocaleLowerCase("pt-BR") === cleanName.toLocaleLowerCase("pt-BR")
      );

      if (mode === "login") {
        if (!existing) {
          setError("Esse nome não está cadastrado. Use Criar usuário para cadastrar.");
          return;
        }
        onSelect(existing.display_name, existing.actor_id);
        return;
      }

      if (existing) {
        setError("Esse nome já está cadastrado. Use Entrar para acessar.");
        return;
      }

      const actorId = crypto.randomUUID();
      const supabase = createClient();
      const { data, error: insertError } = await supabase
        .from("team_display_names")
        .insert({ actor_id: actorId, display_name: cleanName, enabled: true })
        .select("actor_id,display_name")
        .single();

      if (insertError) {
        if (insertError.code === "23505") {
          setError("Esse nome já está cadastrado. Use Entrar para acessar.");
        } else {
          throw insertError;
        }
        return;
      }

      onSelect(data.display_name, data.actor_id);
    } catch {
      setError("Não foi possível concluir. Confira se a nova estrutura do Supabase foi instalada.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="w-full max-w-[390px] rounded-[24px] border border-[#e8e6e2] bg-white p-7 shadow-[0_18px_55px_rgba(28,25,20,0.10)]">
      <div className="mb-7 text-center">
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
          Entre com seu nome ou crie um novo usuário.
        </p>
      </div>

      <div className="mb-5 grid grid-cols-2 rounded-xl bg-[#f3f2ef] p-1">
        <button
          type="button"
          onClick={() => { setMode("login"); setError(""); }}
          aria-pressed={mode === "login"}
          className={"rounded-lg px-3 py-2.5 text-[12px] font-medium transition " + (mode === "login" ? "bg-white text-[#262626] shadow-sm" : "text-[#77736d]")}
        >
          Entrar
        </button>
        <button
          type="button"
          onClick={() => { setMode("create"); setError(""); }}
          aria-pressed={mode === "create"}
          className={"rounded-lg px-3 py-2.5 text-[12px] font-medium transition " + (mode === "create" ? "bg-white text-[#262626] shadow-sm" : "text-[#77736d]")}
        >
          Criar usuário
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <label htmlFor="team-display-name" className="block text-[11px] font-semibold text-[#4c4944]">
          Nome
        </label>
        <input
          id="team-display-name"
          type="text"
          required
          minLength={2}
          maxLength={40}
          autoComplete="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Digite seu nome"
          className="w-full rounded-xl border border-[#dedbd5] bg-white px-4 py-3 text-[13px] text-[#262626] outline-none focus:border-[#77736d]"
        />
        <button
          type="submit"
          disabled={saving || loadingNames || !name.trim()}
          className="flex w-full items-center justify-center rounded-xl bg-[#262626] px-4 py-3 text-[13px] font-medium text-white transition hover:bg-[#444] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving ? "Aguarde…" : mode === "login" ? "Entrar" : "Criar usuário"}
        </button>
      </form>

      {loadingNames && <p className="mt-3 text-center text-[11px] text-[#8e8e8e]">Carregando usuários…</p>}
      {error && <p role="alert" className="mt-4 rounded-xl bg-[#fbefed] px-3 py-3 text-[12px] leading-5 text-[#9b3429]">{error}</p>}

      <p className="mt-7 text-center text-[10px] leading-5 text-[#99958e]">
        O nome fica salvo neste dispositivo e navegador.
      </p>
    </section>
  );
}
