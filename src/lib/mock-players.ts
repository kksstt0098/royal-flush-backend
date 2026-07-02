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