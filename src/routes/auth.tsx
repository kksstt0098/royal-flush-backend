import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import QRCode from "qrcode";
import { supabase } from "@/integrations/supabase/client";
import { checkClientIp } from "@/lib/ip-check.functions";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

type Stage = "password" | "totp" | "enroll";

function AuthPage() {
  const navigate = useNavigate();
  const [stage, setStage] = useState<Stage>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [clientIp, setClientIp] = useState<string | null>(null);

  const [factorId, setFactorId] = useState<string | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (data?.currentLevel === "aal2") navigate({ to: "/admin" });
      else if (data?.currentLevel === "aal1") {
        try {
          await startTotpForSession();
        } catch {
          /* user will just see the password stage */
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  const resetToPassword = async () => {
    await supabase.auth.signOut();
    setStage("password");
    setCode("");
    setFactorId(null);
    setChallengeId(null);
    setQrDataUrl(null);
    setSecret(null);
  };

  const startTotpForSession = async () => {
    const { data: list, error: listErr } = await supabase.auth.mfa.listFactors();
    if (listErr) throw listErr;
    const verified = list.totp?.find((f) => f.status === "verified");
    if (verified) {
      const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({
        factorId: verified.id,
      });
      if (chErr) throw chErr;
      setFactorId(verified.id);
      setChallengeId(ch.id);
      setStage("totp");
      return;
    }
    for (const f of list.totp ?? []) {
      if (f.status !== "verified") await supabase.auth.mfa.unenroll({ factorId: f.id });
    }
    const { data: en, error: enErr } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: `backend-${Date.now()}`,
    });
    if (enErr) throw enErr;
    setFactorId(en.id);
    setSecret(en.totp.secret);
    const png = await QRCode.toDataURL(en.totp.uri, { margin: 1, width: 220 });
    setQrDataUrl(png);
    setStage("enroll");
  };

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const ipCheck = await checkClientIp({ data: { email } });
      setClientIp(ipCheck.ip);
      if (!ipCheck.allowed) {
        throw new Error(
          ipCheck.ip
            ? `Invalid IP: ${ipCheck.ip} is not whitelisted for backend access.`
            : "Invalid IP: unable to determine your IP address.",
        );
      }
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      await startTotpForSession();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : String(e2));
    } finally {
      setBusy(false);
    }
  };

  const submitTotp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!factorId || !challengeId) return;
    setBusy(true);
    setErr(null);
    try {
      const { error } = await supabase.auth.mfa.verify({
        factorId,
        challengeId,
        code: code.trim(),
      });
      if (error) throw error;
      navigate({ to: "/admin" });
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : String(e2));
    } finally {
      setBusy(false);
    }
  };

  const submitEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!factorId) return;
    setBusy(true);
    setErr(null);
    try {
      const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId });
      if (chErr) throw chErr;
      const { error } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: ch.id,
        code: code.trim(),
      });
      if (error) throw error;
      navigate({ to: "/admin" });
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : String(e2));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm bg-panel border border-panel-border rounded-md p-6 space-y-4">
        <div className="text-center">
          <h1 className="text-xl font-semibold">Backend Login</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Authorized staff only · Two-factor required
          </p>
          {clientIp && (
            <p className="text-[10px] text-muted-foreground mt-1 font-mono">IP: {clientIp}</p>
          )}
        </div>

        {stage === "password" && (
          <form onSubmit={submitPassword} className="space-y-3">
            <input
              required
              type="email"
              autoComplete="username"
              className="w-full h-9 px-2 rounded-sm border border-input bg-background text-sm"
              placeholder="Username (email)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              required
              type="password"
              autoComplete="current-password"
              className="w-full h-9 px-2 rounded-sm border border-input bg-background text-sm"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {err && <p className="text-xs text-destructive">{err}</p>}
            <button
              type="submit"
              disabled={busy}
              className="w-full h-10 rounded-sm bg-primary text-primary-foreground text-sm hover:bg-primary/90 disabled:opacity-50"
            >
              {busy ? "Please wait…" : "Continue"}
            </button>
          </form>
        )}

        {stage === "totp" && (
          <form onSubmit={submitTotp} className="space-y-3">
            <p className="text-sm text-muted-foreground text-center">
              Enter the 6-digit code from Google Authenticator.
            </p>
            <input
              required
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              autoComplete="one-time-code"
              className="w-full h-11 px-2 rounded-sm border border-input bg-background text-center text-lg tracking-widest"
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            />
            {err && <p className="text-xs text-destructive">{err}</p>}
            <button
              type="submit"
              disabled={busy || code.length < 6}
              className="w-full h-10 rounded-sm bg-primary text-primary-foreground text-sm hover:bg-primary/90 disabled:opacity-50"
            >
              {busy ? "Verifying…" : "Verify & enter backend"}
            </button>
            <button
              type="button"
              onClick={resetToPassword}
              className="w-full text-xs text-muted-foreground hover:underline"
            >
              Cancel
            </button>
          </form>
        )}

        {stage === "enroll" && (
          <form onSubmit={submitEnroll} className="space-y-3">
            <p className="text-sm text-muted-foreground text-center">
              Scan this QR in Google Authenticator, then enter the 6-digit code.
            </p>
            {qrDataUrl && (
              <div className="flex justify-center">
                <img
                  src={qrDataUrl}
                  alt="TOTP QR"
                  className="rounded-sm border border-panel-border"
                />
              </div>
            )}
            {secret && (
              <div className="text-center">
                <p className="text-[11px] text-muted-foreground">Manual key</p>
                <p className="font-mono text-xs break-all select-all">{secret}</p>
              </div>
            )}
            <input
              required
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              autoComplete="one-time-code"
              className="w-full h-11 px-2 rounded-sm border border-input bg-background text-center text-lg tracking-widest"
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            />
            {err && <p className="text-xs text-destructive">{err}</p>}
            <button
              type="submit"
              disabled={busy || code.length < 6}
              className="w-full h-10 rounded-sm bg-primary text-primary-foreground text-sm hover:bg-primary/90 disabled:opacity-50"
            >
              {busy ? "Verifying…" : "Activate 2FA & enter backend"}
            </button>
            <button
              type="button"
              onClick={resetToPassword}
              className="w-full text-xs text-muted-foreground hover:underline"
            >
              Cancel
            </button>
          </form>
        )}
      </div>
    </div>
  );
}