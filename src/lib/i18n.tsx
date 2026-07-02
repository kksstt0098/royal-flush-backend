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
  playerDetails: { en: "Player details", my: "ကစားသမားအသေးစိတ်" },
  playerInformation: { en: "Player Information", my: "ကစားသမားအချက်အလက်" },
  resetLoginPassword: { en: "Reset login password", my: "လော့ဂ်အင်စကားဝှက်ပြန်စ" },
  resetSafePassword: { en: "Reset safe password", my: "safe စကားဝှက်ပြန်စ" },
  currentAssets: { en: "Current Assets", my: "လက်ရှိပိုင်ဆိုင်မှု" },
  carriedCoins: { en: "Carried Coins", my: "လက်ရှိဒင်္ဂါး" },
  safe: { en: "Safe", my: "Safe" },
  insuranceTransfer: { en: "Insurance Transfer", my: "Insurance လွှဲ" },
  addr: { en: "Addr", my: "လိပ်စာ" },
  statistics: { en: "Statistics", my: "စာရင်း" },
  grossProfit: { en: "Gross profit", my: "အသားတင်အမြတ်" },
  totalWithdraw: { en: "total withdraw", my: "စုစုပေါင်းထုတ်" },
  totalPayout: { en: "total payout", my: "စုစုပေါင်းပေးထုတ်" },
  registerMac: { en: "register mac", my: "စာရင်းသွင်း mac" },
  todaysWinLoss: { en: "Today's Win&Loss", my: "ယနေ့ နိုင်/ရှုံး" },
  registerIP: { en: "Register IP", my: "စာရင်းသွင်း IP" },
  loginIp: { en: "loginIp", my: "လော့ဂ်အင် IP" },
  goldInTransfer: { en: "Gold Coins in Transfer", my: "လွှဲထားသည့်ဒင်္ဂါး" },
  bankInformation: { en: "Bank information", my: "ဘဏ်အချက်အလက်" },
  payedRecords: { en: "Payed Records", my: "ငွေသွင်းမှတ်တမ်း" },
  withdrawalRecords: { en: "Withdrawal Records", my: "ငွေထုတ်မှတ်တမ်း" },
  orderNo: { en: "Order No.", my: "အော်ဒါနံပါတ်" },
  creationTime: { en: "Creation time", my: "ဖန်တီးချိန်" },
  orderAmount: { en: "Order Amount", my: "အော်ဒါပမာဏ" },
  close: { en: "Close", my: "ပိတ်" },
  edit: { en: "Edit", my: "ပြင်" },
  save: { en: "Save", my: "သိမ်း" },
  cancel: { en: "Cancel", my: "ဖျက်" },
  yes: { en: "Yes", my: "ဟုတ်" },
  no: { en: "No", my: "မဟုတ်" },
  betsAdjustmentTitle: { en: "Bets Adjustment", my: "လောင်းငွေညှိမြှင့်" },
  newRemainBets: { en: "New Remain Bets", my: "ကျန်လောင်းငွေအသစ်" },
  currentRemainBets: { en: "Current Remain Bets", my: "လက်ရှိကျန်လောင်း" },
  payedYes: { en: "Payed players", my: "ငွေသွင်းပြီးသူ" },
  payedNo: { en: "Not payed", my: "ငွေမသွင်းရသေးသူ" },
  active: { en: "Active", my: "ဖွင့်ထား" },
  disabled: { en: "Disabled", my: "ပိတ်ထား" },
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