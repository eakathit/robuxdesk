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
  remainingRobux: number; // <-- เพิ่มบรรทัดนี้
  usdtCost: number;
  vndRate: number;        
  binanceRate: number;    
  unitCostTHB: number;    
  status: "available" | "sold";
  soldAt?: string;
  sellingPriceTHB?: number;
  netProfit?: number;
  accountInfo?: string;
}

export interface AppState {
  walletEntries: WalletEntry[];
  accounts: RobuxAccount[];
  buyRate: number;   
  sellRate: number;  
}