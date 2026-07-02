export type Player = {
  playerID: string;
  nick: string;
  superiorID: number;
  deviceType: string;
  vip: number;
  phone: string;
  email: string;
  channelCode: string;
  sourceChannel: string;
  level: string;
  coins: number;
  totalPayed: number;
  totalWithdrawal: number;
  totalBets: number;
  remainBets: number;
  totalWin: number;
  todayWin: number;
  lastPayed: string;
  createTime: string;
  lastLogin: string;
  remark: string;
  status: "active" | "disabled";
  safeCoins?: number;
  addr?: string;
  goldInTransfer?: number;
  totalPayedTimes?: number;
  totalWithdrawTimes?: number;
  totalPayout?: number;
  registerMac?: string;
  registerIp?: string;
  registerCountry?: string;
  loginIp?: string;
  loginCountry?: string;
  payedRecords?: { orderNo: string; time: string; amount: number; coins: number }[];
  withdrawalRecords?: { orderNo: string; time: string; amount: number; coins: number }[];
};

export const mockPlayers: Player[] = [
  {
    playerID: "1075559",
    nick: "Account deactivation",
    superiorID: 0,
    deviceType: "android",
    vip: 1,
    phone: "00959666885403",
    email: "",
    channelCode: "2002",
    sourceChannel: "vider 短信群发",
    level: "WITH-BLOCK",
    coins: 17227.65,
    totalPayed: 5000.0,
    totalWithdrawal: 15000.0,
    totalBets: 238150.4,
    remainBets: 0.0,
    totalWin: 23431.85,
    todayWin: 1927.25,
    lastPayed: "12-20 19:46",
    createTime: "12-20 12:03",
    lastLogin: "12-27 12:38",
    remark: "P107 to 9W",
    status: "disabled",
    safeCoins: 0,
    addr: "",
    goldInTransfer: 15000,
    totalPayedTimes: 230,
    totalWithdrawTimes: 65,
    totalPayout: 28031443.31,
    registerMac: "f54ee1d92f25989b825c15a24e9c2c64",
    registerIp: "136.228.174.127",
    registerCountry: "Myanmar",
    loginIp: "64.226.99.199",
    loginCountry: "Germany",
    payedRecords: [
      { orderNo: "P2512271619276167", time: "2025-12-27 16:19:27", amount: 10000, coins: 10000 },
      { orderNo: "P2512271545376136", time: "2025-12-27 15:45:37", amount: 10000, coins: 10000 },
      { orderNo: "P2512271216245883", time: "2025-12-27 12:16:24", amount: 10000, coins: 10000 },
      { orderNo: "P2512271201395862", time: "2025-12-27 12:01:39", amount: 5000, coins: 5000 },
      { orderNo: "P2512261949025017", time: "2025-12-26 19:49:02", amount: 5000, coins: 5000 },
    ],
    withdrawalRecords: [
      { orderNo: "W2512261100002211", time: "2025-12-26 11:00:22", amount: 5000, coins: 5000 },
    ],
  },
  {
    playerID: "1075612",
    nick: "MgMg",
    superiorID: 1002,
    deviceType: "ios",
    vip: 3,
    phone: "00959771234567",
    email: "mgmg@mail.com",
    channelCode: "2003",
    sourceChannel: "facebook ads",
    level: "GOLD",
    coins: 45820.1,
    totalPayed: 120000.0,
    totalWithdrawal: 80000.0,
    totalBets: 512340.5,
    remainBets: 1250.0,
    totalWin: 67240.0,
    todayWin: 3120.5,
    lastPayed: "12-28 08:12",
    createTime: "10-14 09:20",
    lastLogin: "12-28 09:05",
    remark: "VIP player",
    status: "active",
  },
  {
    playerID: "1075890",
    nick: "AyeAye",
    superiorID: 1005,
    deviceType: "android",
    vip: 2,
    phone: "00959882345678",
    email: "",
    channelCode: "2002",
    sourceChannel: "telegram",
    level: "SILVER",
    coins: 8320.4,
    totalPayed: 30000.0,
    totalWithdrawal: 22000.0,
    totalBets: 98450.0,
    remainBets: 320.0,
    totalWin: 12450.0,
    todayWin: 0,
    lastPayed: "12-26 14:20",
    createTime: "11-01 10:15",
    lastLogin: "12-27 20:10",
    remark: "",
    status: "active",
  },
  {
    playerID: "1076001",
    nick: "Ko Zaw",
    superiorID: 0,
    deviceType: "web",
    vip: 0,
    phone: "00959123456789",
    email: "kozaw@mail.com",
    channelCode: "2001",
    sourceChannel: "google ads",
    level: "BRONZE",
    coins: 240.0,
    totalPayed: 500.0,
    totalWithdrawal: 0.0,
    totalBets: 1240.0,
    remainBets: 0.0,
    totalWin: 320.0,
    todayWin: 120.0,
    lastPayed: "12-28 07:30",
    createTime: "12-27 22:00",
    lastLogin: "12-28 09:15",
    remark: "new user",
    status: "active",
  },
];