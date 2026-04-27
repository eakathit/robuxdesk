// eakathit/robuxdesk/robuxdesk-1a4f2eca88bfc8e88d2c800ac2907e4df81d3211/lib/types.ts

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
  remainingRobux: number;
  usdtCost: number;
  vndRate: number;
  binanceRate: number;
  unitCostTHB: number;
  status: "available" | "sold";
  soldAt?: string;
  sellingPriceTHB?: number;
  netProfit?: number;
  username?: string;
  password?: string;
}

export interface SaleRecord {
  id: string;
  createdAt: string;
  inventoryId: string;
  robuxSold: number;
  sellingPriceTHB: number;
  totalCostTHB: number;
  netProfit: number;
  customerName?: string;
}

export interface AppState {
  walletEntries: WalletEntry[];
  accounts: RobuxAccount[];
  buyRate: number;   
  sellRate: number;  
}