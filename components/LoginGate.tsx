"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Mail, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function LoginGate() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authError = params.get("auth_error");

    if (authError === "not_authorized") {
      setError("Este e-mail não está cadastrado como integrante autorizado.");
    } else if (authError) {
      setError("Não foi possível concluir o acesso. Solicite um novo link.");
    }

    if (authError) {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail.endsWith("@melinaromano.com")) {
      setError("Use seu e-mail @melinaromano.com.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithOtp({
        email: normalizedEmail,
        options: {
          shouldCreateUser: false,
          emailRedirectTo: window.location.origin + "/auth/callback",
        },
      });

      if (signInError) throw signInError;
      setMessage("Enviamos um link de acesso para seu e-mail. Abra a mensagem neste dispositivo para entrar na plataforma.");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Não foi possível enviar o link de acesso."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="w-full max-w-[390px] rounded-[24px] border border-[#e8e6e2] bg-white p-7 shadow-[0_18px_55px_rgba(28,25,20,0.10)]">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-[#f2f1ee] text-[#4c4944]">
          <Mail size={21} />
        </div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8e8e8e]">
          Melina Romano · LAB MR
        </p>
        <h1 className="mt-2 text-[22px] font-semibold tracking-[-0.03em] text-[#262626]">
          Acesso da equipe
        </h1>
        <p className="mt-2 text-[13px] leading-6 text-[#77736d]">
          Informe seu e-mail corporativo para receber um link de acesso.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <label htmlFor="team-email" className="block text-[11px] font-semibold text-[#4c4944]">
          E-mail corporativo
        </label>
        <input
          id="team-email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="nome@melinaromano.com"
          className="w-full rounded-xl border border-[#dedbd5] bg-white px-4 py-3 text-[13px] text-[#262626] outline-none transition focus:border-[#77736d]"
        />
        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#262626] px-4 py-3 text-[13px] font-medium text-white transition hover:bg-[#444] disabled:cursor-wait disabled:opacity-60"
        >
          {loading ? "Enviando…" : "Enviar link de acesso"}
          {!loading && <ArrowRight size={15} />}
        </button>
      </form>

      {message && (
        <p role="status" className="mt-4 rounded-xl bg-[#f1f4ed] px-3 py-3 text-[12px] leading-5 text-[#40513b]">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-[#fbefed] px-3 py-3 text-[12px] leading-5 text-[#9b3429]">
          {error}
        </p>
      )}

      <p className="mt-7 text-center text-[10px] leading-5 text-[#99958e]">
        Acesso exclusivo a integrantes autorizados do domínio melinaromano.com.
      </p>
    </section>
  );
}
