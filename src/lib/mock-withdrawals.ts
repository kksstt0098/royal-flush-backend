export type WithdrawalStatus =
  | "Pending"
  | "Audited"
  | "Reject"
  | "Freeze"
  | "Paying Out"
  | "Failed"
  | "Successful";

export type Withdrawal = {
  orderNo: string;
  playerID: string;
  level: string;
  sourceUserId: string;
  channelCode: string;
  payoutMode: string;
  accountNo: string;
  applyAmount: number;
  fee: number;
  actualAmount: number;
  channel: string;
  outTradeNo: string;
  status: WithdrawalStatus;
  createTime: string;
  paymentTime: string;
  auditor: string;
  transferor: string;
  lockUser: string;
  notifyTime: string;
  firstWithdrawal: boolean;
  lockFlag: "locked" | "unlocked";
};

export const mockWithdrawals: Withdrawal[] = [
  {
    orderNo: "T2512280702154752",
    playerID: "1075559",
    level: "WITH-BLOCK",
    sourceUserId: "",
    channelCode: "2002",
    payoutMode: "KBZPay",
    accountNo: "09666885403",
    applyAmount: 10000,
    fee: 0,
    actualAmount: 10000,
    channel: "",
    outTradeNo: "",
    status: "Pending",
    createTime: "2025-12-28 07:02",
    paymentTime: "",
    auditor: "",
    transferor: "Vyx",
    lockUser: "",
    notifyTime: "",
    firstWithdrawal: false,
    lockFlag: "unlocked",
  },
  {
    orderNo: "T2512280642554750",
    playerID: "1075559",
    level: "WITH-BLOCK",
    sourceUserId: "",
    channelCode: "2002",
    payoutMode: "KBZPay",
    accountNo: "09666885403",
    applyAmount: 10000,
    fee: 0,
    actualAmount: 10000,
    channel: "",
    outTradeNo: "",
    status: "Reject",
    createTime: "2025-12-28 06:42",
    paymentTime: "",
    auditor: "",
    transferor: "Vyx",
    lockUser: "",
    notifyTime: "",
    firstWithdrawal: false,
    lockFlag: "unlocked",
  },
  {
    orderNo: "T2512280512334701",
    playerID: "1075612",
    level: "GOLD",
    sourceUserId: "1002",
    channelCode: "2003",
    payoutMode: "WavePay",
    accountNo: "09771234567",
    applyAmount: 50000,
    fee: 100,
    actualAmount: 49900,
    channel: "WavePay",
    outTradeNo: "WP2512280512339912",
    status: "Successful",
    createTime: "2025-12-28 05:12",
    paymentTime: "2025-12-28 05:20",
    auditor: "Minmin",
    transferor: "Vyx",
    lockUser: "",
    notifyTime: "2025-12-28 05:21",
    firstWithdrawal: false,
    lockFlag: "unlocked",
  },
  {
    orderNo: "T2512280430114689",
    playerID: "1075890",
    level: "SILVER",
    sourceUserId: "1005",
    channelCode: "2002",
    payoutMode: "KBZPay",
    accountNo: "09882345678",
    applyAmount: 20000,
    fee: 0,
    actualAmount: 20000,
    channel: "KBZPay",
    outTradeNo: "KBZ2512280430118871",
    status: "Paying Out",
    createTime: "2025-12-28 04:30",
    paymentTime: "2025-12-28 04:35",
    auditor: "Minmin",
    transferor: "Vyx",
    lockUser: "Minmin",
    notifyTime: "",
    firstWithdrawal: false,
    lockFlag: "locked",
  },
  {
    orderNo: "T2512280355094672",
    playerID: "1076001",
    level: "BRONZE",
    sourceUserId: "",
    channelCode: "2001",
    payoutMode: "AyaPay",
    accountNo: "09123456789",
    applyAmount: 5000,
    fee: 0,
    actualAmount: 5000,
    channel: "",
    outTradeNo: "",
    status: "Audited",
    createTime: "2025-12-28 03:55",
    paymentTime: "",
    auditor: "Minmin",
    transferor: "",
    lockUser: "",
    notifyTime: "",
    firstWithdrawal: true,
    lockFlag: "unlocked",
  },
  {
    orderNo: "T2512280221114612",
    playerID: "1075612",
    level: "GOLD",
    sourceUserId: "1002",
    channelCode: "2003",
    payoutMode: "CBPay",
    accountNo: "09771234567",
    applyAmount: 30000,
    fee: 50,
    actualAmount: 29950,
    channel: "CBPay",
    outTradeNo: "",
    status: "Failed",
    createTime: "2025-12-28 02:21",
    paymentTime: "2025-12-28 02:25",
    auditor: "Minmin",
    transferor: "Vyx",
    lockUser: "",
    notifyTime: "",
    firstWithdrawal: false,
    lockFlag: "unlocked",
  },
  {
    orderNo: "T2512280101124588",
    playerID: "1075890",
    level: "SILVER",
    sourceUserId: "1005",
    channelCode: "2002",
    payoutMode: "KBZPay",
    accountNo: "09882345678",
    applyAmount: 8000,
    fee: 0,
    actualAmount: 8000,
    channel: "",
    outTradeNo: "",
    status: "Freeze",
    createTime: "2025-12-28 01:01",
    paymentTime: "",
    auditor: "",
    transferor: "",
    lockUser: "Minmin",
    notifyTime: "",
    firstWithdrawal: false,
    lockFlag: "locked",
  },
];