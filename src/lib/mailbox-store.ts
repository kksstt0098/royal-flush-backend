import { useSyncExternalStore } from "react";

export type Mail = {
  id: string;
  playerID: string;
  subject: string;
  body: string;
  time: string;
  read: boolean;
};

let mails: Mail[] = [];
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};
const getSnapshot = () => mails;

export function useMailbox(playerID?: string) {
  const all = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return playerID ? all.filter((m) => m.playerID === playerID) : all;
}

export function sendMail(m: Omit<Mail, "id" | "time" | "read">) {
  const mail: Mail = {
    ...m,
    id: `M${Date.now()}${Math.floor(Math.random() * 1000)}`,
    time: new Date().toISOString().slice(0, 16).replace("T", " "),
    read: false,
  };
  mails = [mail, ...mails];
  emit();
}

export function markMailRead(id: string) {
  mails = mails.map((m) => (m.id === id ? { ...m, read: true } : m));
  emit();
}