export interface WalletEntry {
  id: string;
  date: string;
  thbAmount: number;
  usdtReceived: number;
  binanceRate: number; // THB/USDT
  note?: string;
}

export interface RobuxAccount {
  id: string;
  createdAt: string;
  robuxAmount: number;
  usdtCost: number;
  vndRate: number;        // VND per USDT (used for reference/logging)
  binanceRate: number;    // THB per USDT used at purchase time
  unitCostTHB: number;    // (usdtCost * binanceRate) / robuxAmount
  status: "available" | "sold";
  soldAt?: string;
  sellingPriceTHB?: number;
  netProfit?: number;
}

export interface AppState {
  walletEntries: WalletEntry[];
  accounts: RobuxAccount[];
  buyRate: number;   // THB per USDT (buy)
  sellRate: number;  // Robux per THB sell rate (e.g. how many robux per 1 THB)
}
