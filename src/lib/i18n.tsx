import { createContext, useContext, useState, type ReactNode } from "react";

export type Lang = "en" | "my";

type Dict = Record<string, { en: string; my: string }>;

export const dict: Dict = {
  home: { en: "Home", my: "မူလ" },
  player: { en: "Player", my: "ကစားသမား" },
  playerQuery: { en: "Player Query", my: "ကစားသမားရှာဖွေမှု" },
  withdrawalOrder: { en: "Withdrawal Order", my: "ငွေထုတ်အော်ဒါ" },
  withdrawalPayment: { en: "Withdrawal Payment", my: "ငွေထုတ်ငွေပေး" },
  reviewWithdrawal: { en: "Review Withdrawal", my: "ငွေထုတ်စစ်ဆေး" },
  english: { en: "English", my: "အင်္ဂလိပ်" },
  online: { en: "online", my: "အွန်လိုင်း" },
  file: { en: "file", my: "ဖိုင်" },
  pay: { en: "pay", my: "ပေးချေ" },
  withdraw: { en: "withdraw", my: "ငွေထုတ်" },
  playerID: { en: "playerID", my: "ကစားသမား ID" },
  superiorID: { en: "Superior ID", my: "အထက်ဆုံး ID" },
  deviceType: { en: "deviceType", my: "စက်အမျိုးအစား" },
  payed: { en: "payed", my: "ပေးပြီး" },
  phone: { en: "Phone", my: "ဖုန်း" },
  email: { en: "email", my: "အီးမေးလ်" },
  ipAddr: { en: "IP addr", my: "IP လိပ်စာ" },
  level: { en: "Level", my: "အဆင့်" },
  channelCode: { en: "Channel code", my: "လမ်းကြောင်းကုဒ်" },
  vipLevel: { en: "VIP level", my: "VIP အဆင့်" },
  to: { en: "to", my: "မှ" },
  bankAccount: { en: "Bank Account", my: "ဘဏ်အကောင့်" },
  status: { en: "Status", my: "အခြေအနေ" },
  registrationDate: { en: "registration date", my: "စာရင်းသွင်းရက်" },
  lastLogin: { en: "Last login", my: "နောက်ဆုံးဝင်" },
  startDate: { en: "start date", my: "စတင်ရက်" },
  endDate: { en: "end date", my: "ပြီးဆုံးရက်" },
  search: { en: "Search", my: "ရှာဖွေ" },
  reset: { en: "Reset", my: "ပြန်စ" },
  export: { en: "Export", my: "တင်ပို့" },
  enable: { en: "Enable", my: "ဖွင့်" },
  disable: { en: "Disable", my: "ပိတ်" },
  pullLevel: { en: "Pull Level", my: "အဆင့်ဆွဲ" },
  remark: { en: "Remark", my: "မှတ်ချက်" },
  nick: { en: "Nick", my: "အမည်ပြောင်" },
  coins: { en: "coins", my: "ဒင်္ဂါး" },
  totalPayed: { en: "total payed", my: "စုစုပေါင်းပေး" },
  totalWithdrawal: { en: "total withdrawal", my: "စုစုပေါင်းထုတ်" },
  totalBets: { en: "total bets", my: "စုစုပေါင်းလောင်း" },
  remainBets: { en: "Remain bets", my: "ကျန်လောင်း" },
  totalWin: { en: "total win", my: "စုစုပေါင်းနိုင်" },
  todayWin: { en: "today win", my: "ယနေ့နိုင်" },
  lastPayed: { en: "Last payed", my: "နောက်ဆုံးပေး" },
  createTime: { en: "create time", my: "ဖန်တီးချိန်" },
  action: { en: "Action", my: "လုပ်ဆောင်ချက်" },
  betsAdjustment: { en: "bets adjustment", my: "လောင်းညှိ" },
  sourceChannel: { en: "Source Channel", my: "မူလလမ်းကြောင်း" },
  allPlayers: { en: "All players", my: "အားလုံး" },
  all: { en: "All", my: "အားလုံး" },
  select: { en: "select", my: "ရွေး" },
  accountDeactivation: { en: "Account deactivation", my: "အကောင့်ပိတ်" },
  total: { en: "Total", my: "စုစုပေါင်း" },
  perPage: { en: "/page", my: "/စာမျက်နှာ" },
  goTo: { en: "Go to", my: "သွား" },
};

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (k: keyof typeof dict) => string };
const LangCtx = createContext<Ctx | null>(null);

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("en");
  const t = (k: keyof typeof dict) => dict[k]?.[lang] ?? String(k);
  return <LangCtx.Provider value={{ lang, setLang, t }}>{children}</LangCtx.Provider>;
}

export function useT() {
  const ctx = useContext(LangCtx);
  if (!ctx) throw new Error("useT must be used within LangProvider");
  return ctx;
}