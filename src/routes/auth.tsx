import { useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nick, setNick] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { nick: nick || email.split("@")[0] },
          },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate({ to: "/" });
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setBusy(true);
    setErr(null);
    const res = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (res.error) {
      setErr(res.error.message ?? String(res.error));
      setBusy(false);
      return;
    }
    if (!res.redirected) {
      navigate({ to: "/" });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm bg-panel border border-panel-border rounded-md p-6 space-y-4">
        <div className="text-center">
          <h1 className="text-xl font-semibold">Casino Backend</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {mode === "signin" ? "Sign in to continue" : "Create an account"}
          </p>
        </div>

        <button
          type="button"
          onClick={google}
          disabled={busy}
          className="w-full h-10 rounded-sm border border-input bg-background text-sm hover:bg-accent disabled:opacity-50"
        >
          Continue with Google
        </button>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={submit} className="space-y-3">
          {mode === "signup" && (
            <input
              className="w-full h-9 px-2 rounded-sm border border-input bg-background text-sm"
              placeholder="Nickname"
              value={nick}
              onChange={(e) => setNick(e.target.value)}
            />
          )}
          <input
            required
            type="email"
            className="w-full h-9 px-2 rounded-sm border border-input bg-background text-sm"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            required
            type="password"
            minLength={6}
            className="w-full h-9 px-2 rounded-sm border border-input bg-background text-sm"
            placeholder="Password (min 6)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {err && <p className="text-xs text-destructive">{err}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full h-10 rounded-sm bg-primary text-primary-foreground text-sm hover:bg-primary/90 disabled:opacity-50"
          >
            {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        <div className="text-center text-sm">
          {mode === "signin" ? (
            <button className="text-info hover:underline" onClick={() => setMode("signup")}>
              Don't have an account? Sign up
            </button>
          ) : (
            <button className="text-info hover:underline" onClick={() => setMode("signin")}>
              Already have an account? Sign in
            </button>
          )}
        </div>
        <div className="text-center text-xs text-muted-foreground">
          <Link to="/" className="hover:underline">Back home</Link>
        </div>
      </div>
    </div>
  );
}