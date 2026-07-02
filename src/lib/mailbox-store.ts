import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Mail = {
  id: string;
  playerID: string;
  subject: string;
  body: string;
  time: string;
  read: boolean;
};

type Row = {
  id: string;
  player_id: string;
  subject: string;
  body: string;
  read: boolean;
  created_at: string;
};

const fmt = (iso: string) => new Date(iso).toISOString().slice(0, 16).replace("T", " ");

const mapRow = (r: Row): Mail => ({
  id: r.id,
  playerID: r.player_id,
  subject: r.subject,
  body: r.body,
  time: fmt(r.created_at),
  read: r.read,
});

let cache: Mail[] = [];
let loaded = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

async function fetchAll() {
  const { data, error } = await supabase
    .from("mails")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[mails]", error);
    return;
  }
  cache = (data as Row[]).map(mapRow);
  loaded = true;
  emit();
}

let channel: ReturnType<typeof supabase.channel> | null = null;
function ensureSubscription() {
  if (channel) return;
  channel = supabase
    .channel("mails-live")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "mails" },
      () => {
        void fetchAll();
      },
    )
    .subscribe();
}

export function useMailbox(playerID?: string) {
  const [snap, setSnap] = useState<Mail[]>(cache);
  useEffect(() => {
    const l = () => setSnap([...cache]);
    listeners.add(l);
    ensureSubscription();
    if (!loaded) void fetchAll();
    l();
    return () => {
      listeners.delete(l);
    };
  }, []);
  return playerID
    ? snap.filter((m) => m.playerID === playerID || m.playerID.startsWith(playerID))
    : snap;
}

export async function sendMail(m: Omit<Mail, "id" | "time" | "read">) {
  // playerID may be short uuid (first 8 chars) coming from admin UI — resolve to full uuid
  let playerFull = m.playerID;
  if (playerFull.length < 36) {
    const { data } = await supabase
      .from("profiles")
      .select("id")
      .ilike("id", `${playerFull}%`)
      .limit(1)
      .maybeSingle();
    if (data) playerFull = data.id;
  }
  const { error } = await supabase.rpc("send_mail", {
    _player_id: playerFull,
    _subject: m.subject,
    _body: m.body,
  });
  if (error) {
    console.error("[send_mail]", error);
    alert(error.message);
  }
  await fetchAll();
}

export async function markMailRead(id: string) {
  const { error } = await supabase.from("mails").update({ read: true }).eq("id", id);
  if (error) console.error("[markMailRead]", error);
  await fetchAll();
}