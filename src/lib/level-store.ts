import { useSyncExternalStore } from "react";

export type StatusLevel = {
  id: string;
  name: string;
  description: string;
  blockWithdraw: boolean;
  blockBonus: boolean;
  blockDeposit: boolean;
  blockLogin: boolean;
  isActive: boolean;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
};

const today = () => new Date().toISOString().slice(0, 10);

// Auto color derived from restrictions — most severe wins.
export function levelColor(l: Pick<StatusLevel, "blockLogin" | "blockWithdraw" | "blockDeposit" | "blockBonus">): string {
  if (l.blockLogin) return "#7f1d1d"; // dark red — cannot enter game
  if (l.blockWithdraw) return "#ef4444"; // red
  if (l.blockDeposit) return "#f97316"; // orange
  if (l.blockBonus) return "#f59e0b"; // amber
  return "#22c55e"; // green — normal
}

const DEFAULTS: StatusLevel[] = [
  { id: "sl1", name: "Normal", description: "Default status. No restrictions.", blockWithdraw: false, blockBonus: false, blockDeposit: false, blockLogin: false, isActive: true, createdAt: "2026-01-05", createdBy: "vyy", updatedAt: "2026-06-01", updatedBy: "vyy" },
  { id: "sl2", name: "Withdrawal Block", description: "Player cannot withdraw.", blockWithdraw: true, blockBonus: false, blockDeposit: false, blockLogin: false, isActive: true, createdAt: "2026-01-05", createdBy: "vyy", updatedAt: "2026-06-01", updatedBy: "vyy" },
  { id: "sl3", name: "Bonus Block", description: "Player is excluded from bonuses.", blockWithdraw: false, blockBonus: true, blockDeposit: false, blockLogin: false, isActive: true, createdAt: "2026-01-05", createdBy: "vyy", updatedAt: "2026-06-01", updatedBy: "khine" },
  { id: "sl4", name: "Block from entering the game", description: "Player cannot log in or enter the game.", blockWithdraw: false, blockBonus: false, blockDeposit: false, blockLogin: true, isActive: true, createdAt: today(), createdBy: "vyy", updatedAt: today(), updatedBy: "vyy" },
];

const STORAGE_KEY = "admin.statusLevels.v1";

function load(): StatusLevel[] {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as StatusLevel[];
    if (!Array.isArray(parsed)) return DEFAULTS;
    return parsed.map((l) => ({ ...l, blockLogin: l.blockLogin ?? false }));
  } catch {
    return DEFAULTS;
  }
}

let state: StatusLevel[] = load();
const listeners = new Set<() => void>();

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

function emit() {
  persist();
  listeners.forEach((l) => l());
}

export const levelStore = {
  get: () => state,
  subscribe: (cb: () => void) => {
    listeners.add(cb);
    return () => listeners.delete(cb);
  },
  setAll: (next: StatusLevel[]) => {
    state = next;
    emit();
  },
  upsert: (l: StatusLevel, operator: string = "system") => {
    const now = today();
    const withStamp = { ...l, updatedAt: now, updatedBy: operator };
    const exists = state.some((x) => x.id === l.id);
    state = exists
      ? state.map((x) => (x.id === l.id ? withStamp : x))
      : [...state, { ...withStamp, id: l.id || "sl" + Date.now(), createdAt: withStamp.createdAt || now, createdBy: operator }];
    emit();
  },
  remove: (id: string) => {
    state = state.filter((x) => x.id !== id);
    emit();
  },
  toggle: (id: string, operator: string = "system") => {
    const now = today();
    state = state.map((x) => (x.id === id ? { ...x, isActive: !x.isActive, updatedAt: now, updatedBy: operator } : x));
    emit();
  },
};

export function useLevels(): StatusLevel[] {
  return useSyncExternalStore(levelStore.subscribe, levelStore.get, () => DEFAULTS);
}
