"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Wallet,
  Package,
  TrendingUp,
  Plus,
  DollarSign,
  Activity,
  ChevronRight,
  X,
  CheckCircle,
  Trash2,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Coins,
  RefreshCw,
} from "lucide-react";
import { WalletEntry, RobuxAccount, AppState } from "@/lib/types";

const STORAGE_KEY = "robux_dashboard_v1";

const DEFAULT_STATE: AppState = {
  walletEntries: [],
  accounts: [],
  buyRate: 36.5,
  sellRate: 5.0,
};

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function fmt(n: number, decimals = 2) {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function fmtTHB(n: number) {
  return "฿" + fmt(n, 2);
}

function fmtRobux(n: number) {
  return n.toLocaleString("en-US") + " R$";
}

// ── Modal ─────────────────────────────────────────────────────────────────────
function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>
            {title}
          </h3>
          <button
            onClick={onClose}
            style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 8, padding: "6px", cursor: "pointer", display: "flex", color: "var(--text-secondary)" }}
          >
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Form Field ────────────────────────────────────────────────────────────────
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  accent?: "gold" | "green" | "red" | "blue";
}) {
  const accentMap = {
    gold: "var(--accent-gold)",
    green: "var(--accent-green)",
    red: "var(--accent-red)",
    blue: "var(--accent-blue)",
  };
  const color = accent ? accentMap[accent] : "var(--accent-gold)";

  return (
    <div
      className="card animate-fade-up"
      style={{ padding: "24px", position: "relative", overflow: "hidden" }}
    >
      {/* Background glow orb */}
      <div
        style={{
          position: "absolute",
          top: -30,
          right: -30,
          width: 100,
          height: 100,
          borderRadius: "50%",
          background: color,
          opacity: 0.04,
          filter: "blur(30px)",
        }}
      />
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: `${color}18`,
            border: `1px solid ${color}30`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color,
          }}
        >
          {icon}
        </div>
      </div>
      <p className="label" style={{ marginBottom: 4 }}>{label}</p>
      <p
        className="num"
        style={{ fontSize: 26, fontWeight: 700, color, letterSpacing: "-0.02em", lineHeight: 1 }}
      >
        {value}
      </p>
      {sub && (
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6, fontFamily: "'Space Mono', monospace" }}>
          {sub}
        </p>
      )}
    </div>
  );
}

// ── Rate Badge ────────────────────────────────────────────────────────────────
function RateBadge({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: string;
  unit: string;
  color: string;
}) {
  return (
    <div
      style={{
        background: "var(--bg-elevated)",
        border: `1px solid ${color}30`,
        borderRadius: 12,
        padding: "14px 18px",
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      <span style={{ fontSize: 11, fontFamily: "'Syne',sans-serif", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-muted)" }}>
        {label}
      </span>
      <span className="num" style={{ fontSize: 22, fontWeight: 700, color }}>
        {value}
      </span>
      <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "'Space Mono',monospace" }}>
        {unit}
      </span>
    </div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [state, setState] = useState<AppState>(DEFAULT_STATE);
  const [activeTab, setActiveTab] = useState<"overview" | "wallet" | "inventory" | "sales">("overview");
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [showSellModal, setShowSellModal] = useState<RobuxAccount | null>(null);
  const [showRateModal, setShowRateModal] = useState(false);

  // Wallet form
  const [wForm, setWForm] = useState({ thbAmount: "", usdtReceived: "", note: "" });
  // Inventory form
  const [iForm, setIForm] = useState({ robuxAmount: "", usdtCost: "", vndRate: "" });
  // Sell form
  const [sellPrice, setSellPrice] = useState("");
  // Rate form
  const [rateForm, setRateForm] = useState({ buyRate: "", sellRate: "" });

  // Load from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setState(JSON.parse(saved));
    } catch {}
  }, []);

  const save = useCallback((next: AppState) => {
    setState(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  // ── Derived stats ──────────────────────────────────────────────────────────
  const avgBinanceRate = (() => {
    if (state.walletEntries.length === 0) return state.buyRate;
    const total = state.walletEntries.reduce((s, e) => s + e.thbAmount, 0);
    const weighted = state.walletEntries.reduce(
      (s, e) => s + e.binanceRate * e.thbAmount,
      0
    );
    return total > 0 ? weighted / total : state.buyRate;
  })();

  const availableAccounts = state.accounts.filter((a) => a.status === "available");
  const soldAccounts = state.accounts.filter((a) => a.status === "sold");

  const totalInvestmentTHB = state.accounts.reduce(
    (s, a) => s + a.usdtCost * a.binanceRate,
    0
  );
  const totalRobuxStock = availableAccounts.reduce((s, a) => s + a.robuxAmount, 0);
  const totalNetProfit = soldAccounts.reduce((s, a) => s + (a.netProfit ?? 0), 0);

  // ── Wallet submit ──────────────────────────────────────────────────────────
  function handleWalletSubmit() {
    const thb = parseFloat(wForm.thbAmount);
    const usdt = parseFloat(wForm.usdtReceived);
    if (!thb || !usdt || thb <= 0 || usdt <= 0) return;
    const entry: WalletEntry = {
      id: generateId(),
      date: new Date().toISOString(),
      thbAmount: thb,
      usdtReceived: usdt,
      binanceRate: thb / usdt,
      note: wForm.note,
    };
    save({ ...state, walletEntries: [entry, ...state.walletEntries] });
    setWForm({ thbAmount: "", usdtReceived: "", note: "" });
    setShowWalletModal(false);
  }

  // ── Inventory submit ───────────────────────────────────────────────────────
  function handleInventorySubmit() {
    const robux = parseFloat(iForm.robuxAmount);
    const usdt = parseFloat(iForm.usdtCost);
    const vnd = parseFloat(iForm.vndRate);
    if (!robux || !usdt || robux <= 0 || usdt <= 0) return;
    const binRate = avgBinanceRate;
    const unitCost = (usdt * binRate) / robux;
    const acc: RobuxAccount = {
      id: generateId(),
      createdAt: new Date().toISOString(),
      robuxAmount: robux,
      usdtCost: usdt,
      vndRate: vnd || 0,
      binanceRate: binRate,
      unitCostTHB: unitCost,
      status: "available",
    };
    save({ ...state, accounts: [acc, ...state.accounts] });
    setIForm({ robuxAmount: "", usdtCost: "", vndRate: "" });
    setShowInventoryModal(false);
  }

  // ── Sell submit ────────────────────────────────────────────────────────────
  function handleSellSubmit() {
    if (!showSellModal) return;
    const price = parseFloat(sellPrice);
    if (!price || price <= 0) return;
    const netProfit = price - showSellModal.unitCostTHB * showSellModal.robuxAmount;
    const updated = state.accounts.map((a) =>
      a.id === showSellModal.id
        ? { ...a, status: "sold" as const, soldAt: new Date().toISOString(), sellingPriceTHB: price, netProfit }
        : a
    );
    save({ ...state, accounts: updated });
    setSellPrice("");
    setShowSellModal(null);
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  function deleteAccount(id: string) {
    save({ ...state, accounts: state.accounts.filter((a) => a.id !== id) });
  }
  function deleteWallet(id: string) {
    save({ ...state, walletEntries: state.walletEntries.filter((e) => e.id !== id) });
  }

  // ── Update rates ───────────────────────────────────────────────────────────
  function handleRateSubmit() {
    const buy = parseFloat(rateForm.buyRate);
    const sell = parseFloat(rateForm.sellRate);
    save({
      ...state,
      buyRate: buy > 0 ? buy : state.buyRate,
      sellRate: sell > 0 ? sell : state.sellRate,
    });
    setShowRateModal(false);
  }

  const tabs = [
    { id: "overview", label: "Overview", icon: <BarChart3 size={14} /> },
    { id: "wallet", label: "Wallet", icon: <Wallet size={14} /> },
    { id: "inventory", label: "Inventory", icon: <Package size={14} /> },
    { id: "sales", label: "Sales", icon: <TrendingUp size={14} /> },
  ] as const;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-base)" }}>
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header
        style={{
          borderBottom: "1px solid var(--border)",
          background: "var(--bg-card)",
          position: "sticky",
          top: 0,
          zIndex: 40,
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: "linear-gradient(135deg, var(--accent-gold), #e07b10)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 16,
              }}
            >
              <Coins size={16} color="#0a0b0e" />
            </div>
            <div>
              <span
                style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 15, color: "var(--text-primary)", letterSpacing: "-0.02em" }}
              >
                ROBUX
              </span>
              <span
                style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 15, color: "var(--accent-gold)", letterSpacing: "-0.02em" }}
              >
                DESK
              </span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button className="btn-ghost" onClick={() => { setRateForm({ buyRate: String(state.buyRate), sellRate: String(state.sellRate) }); setShowRateModal(true); }}>
              <RefreshCw size={13} /> Rates
            </button>
          </div>
        </div>
      </header>

      {/* ── Main ────────────────────────────────────────────────────────────── */}
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>
        {/* Rate badges */}
        <div style={{ display: "flex", gap: 12, marginBottom: 28, flexWrap: "wrap" }}>
          <RateBadge label="Buy Rate" value={fmt(state.buyRate, 2)} unit="THB / USDT" color="var(--accent-gold)" />
          <RateBadge label="Sell Rate" value={fmt(state.sellRate, 1)} unit="R$ per THB" color="var(--accent-cyan)" />
          <RateBadge label="Avg Binance Rate" value={fmt(avgBinanceRate, 2)} unit="THB / USDT (weighted)" color="var(--accent-blue)" />
        </div>

        {/* Overview cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 32 }}>
          <StatCard
            icon={<DollarSign size={18} />}
            label="Total Investment"
            value={fmtTHB(totalInvestmentTHB)}
            sub={`${state.accounts.length} accounts total`}
            accent="gold"
          />
          <StatCard
            icon={<Package size={18} />}
            label="Robux Stock"
            value={fmtRobux(totalRobuxStock)}
            sub={`${availableAccounts.length} available accounts`}
            accent="blue"
          />
          <StatCard
            icon={<TrendingUp size={18} />}
            label="Total Net Profit"
            value={fmtTHB(totalNetProfit)}
            sub={`${soldAccounts.length} accounts sold`}
            accent={totalNetProfit >= 0 ? "green" : "red"}
          />
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 6, marginBottom: 24, padding: "4px", background: "var(--bg-card)", borderRadius: 12, border: "1px solid var(--border)", width: "fit-content" }}>
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{
                fontFamily: "'Syne',sans-serif",
                fontWeight: 600,
                fontSize: 12,
                letterSpacing: "0.04em",
                padding: "8px 16px",
                borderRadius: 8,
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                transition: "all 0.15s",
                background: activeTab === t.id ? "var(--bg-elevated)" : "transparent",
                color: activeTab === t.id ? "var(--accent-gold)" : "var(--text-muted)",
                boxShadow: activeTab === t.id ? "0 1px 3px rgba(0,0,0,0.3)" : "none",
              }}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Tab Panels ──────────────────────────────────────────────────── */}

        {/* OVERVIEW TAB */}
        {activeTab === "overview" && (
          <div className="animate-fade-up" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            {/* Recent Sales */}
            <div className="card" style={{ padding: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <h3 className="section-title">Recent Sales</h3>
                <button className="btn-ghost" onClick={() => setActiveTab("sales")} style={{ fontSize: 11 }}>
                  View all <ChevronRight size={12} />
                </button>
              </div>
              {soldAccounts.length === 0 ? (
                <p style={{ color: "var(--text-muted)", fontSize: 13, textAlign: "center", padding: "24px 0" }}>No sales yet</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {soldAccounts.slice(0, 5).map((a) => (
                    <div key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", background: "var(--bg-elevated)", borderRadius: 10, border: "1px solid var(--border)" }}>
                      <div>
                        <p className="num" style={{ fontSize: 13, color: "var(--text-primary)" }}>{fmtRobux(a.robuxAmount)}</p>
                        <p style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "'Space Mono',monospace", marginTop: 2 }}>
                          {new Date(a.soldAt!).toLocaleDateString()}
                        </p>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <p className="num" style={{ fontSize: 13, color: "var(--accent-gold)" }}>{fmtTHB(a.sellingPriceTHB!)}</p>
                        <p
                          className="num"
                          style={{ fontSize: 11, color: (a.netProfit ?? 0) >= 0 ? "var(--accent-green)" : "var(--accent-red)", marginTop: 2 }}
                        >
                          {(a.netProfit ?? 0) >= 0 ? <><ArrowUpRight size={10} style={{ display: "inline" }} /></> : <><ArrowDownRight size={10} style={{ display: "inline" }} /></>}
                          {fmtTHB(a.netProfit ?? 0)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Available Accounts */}
            <div className="card" style={{ padding: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <h3 className="section-title">Stock Overview</h3>
                <button className="btn-ghost" onClick={() => setActiveTab("inventory")} style={{ fontSize: 11 }}>
                  Manage <ChevronRight size={12} />
                </button>
              </div>
              {availableAccounts.length === 0 ? (
                <p style={{ color: "var(--text-muted)", fontSize: 13, textAlign: "center", padding: "24px 0" }}>No stock available</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {availableAccounts.slice(0, 5).map((a) => (
                    <div key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", background: "var(--bg-elevated)", borderRadius: 10, border: "1px solid var(--border)" }}>
                      <div>
                        <p className="num" style={{ fontSize: 13, color: "var(--text-primary)" }}>{fmtRobux(a.robuxAmount)}</p>
                        <p style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "'Space Mono',monospace", marginTop: 2 }}>
                          Cost: {fmtTHB(a.usdtCost * a.binanceRate)}
                        </p>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <span className="badge-available">Available</span>
                        <p className="num" style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                          {fmt(a.unitCostTHB, 4)} ฿/R$
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* WALLET TAB */}
        {activeTab === "wallet" && (
          <div className="animate-fade-up">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 className="section-title">Wallet — THB → USDT Transfers</h2>
              <button className="btn-primary" onClick={() => setShowWalletModal(true)}>
                <Plus size={14} /> Log Transfer
              </button>
            </div>
            {state.walletEntries.length === 0 ? (
              <div className="card" style={{ padding: 48, textAlign: "center" }}>
                <Wallet size={32} style={{ color: "var(--text-muted)", margin: "0 auto 12px" }} />
                <p style={{ color: "var(--text-muted)", fontSize: 14 }}>No transfers logged yet</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {state.walletEntries.map((e) => (
                  <div
                    key={e.id}
                    className="card"
                    style={{ padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}
                  >
                    <div style={{ display: "flex", gap: 20, alignItems: "center", flex: 1, flexWrap: "wrap" }}>
                      <div>
                        <p className="label" style={{ marginBottom: 2 }}>Date</p>
                        <p className="num" style={{ fontSize: 12, color: "var(--text-secondary)" }}>{new Date(e.date).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="label" style={{ marginBottom: 2 }}>THB Sent</p>
                        <p className="num" style={{ fontSize: 15, color: "var(--accent-gold)" }}>{fmtTHB(e.thbAmount)}</p>
                      </div>
                      <div>
                        <p className="label" style={{ marginBottom: 2 }}>USDT Received</p>
                        <p className="num" style={{ fontSize: 15, color: "var(--accent-cyan)" }}>${fmt(e.usdtReceived)}</p>
                      </div>
                      <div>
                        <p className="label" style={{ marginBottom: 2 }}>Rate</p>
                        <p className="num" style={{ fontSize: 13, color: "var(--text-primary)" }}>{fmt(e.binanceRate, 3)} THB/USDT</p>
                      </div>
                      {e.note && (
                        <div>
                          <p className="label" style={{ marginBottom: 2 }}>Note</p>
                          <p style={{ fontSize: 12, color: "var(--text-muted)" }}>{e.note}</p>
                        </div>
                      )}
                    </div>
                    <button className="btn-danger" onClick={() => deleteWallet(e.id)}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* INVENTORY TAB */}
        {activeTab === "inventory" && (
          <div className="animate-fade-up">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 className="section-title">Inventory — Robux Accounts</h2>
              <button className="btn-primary" onClick={() => setShowInventoryModal(true)}>
                <Plus size={14} /> Add Account
              </button>
            </div>
            {availableAccounts.length === 0 ? (
              <div className="card" style={{ padding: 48, textAlign: "center" }}>
                <Package size={32} style={{ color: "var(--text-muted)", margin: "0 auto 12px" }} />
                <p style={{ color: "var(--text-muted)", fontSize: 14 }}>No available accounts</p>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)" }}>
                      {["Date", "Robux", "USDT Cost", "Binance Rate", "Unit Cost (฿/R$)", "Total Cost (THB)", "Status", "Actions"].map((h) => (
                        <th key={h} style={{ fontFamily: "'Syne',sans-serif", fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)", padding: "10px 14px", textAlign: "left" }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {availableAccounts.map((a, i) => (
                      <tr
                        key={a.id}
                        style={{ borderBottom: "1px solid var(--border)", background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)" }}
                      >
                        <td style={{ padding: "12px 14px", fontSize: 12, color: "var(--text-muted)", fontFamily: "'Space Mono',monospace" }}>
                          {new Date(a.createdAt).toLocaleDateString()}
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          <span className="num" style={{ fontSize: 14, color: "var(--accent-gold)" }}>{fmtRobux(a.robuxAmount)}</span>
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          <span className="num" style={{ fontSize: 13, color: "var(--accent-cyan)" }}>${fmt(a.usdtCost)}</span>
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          <span className="num" style={{ fontSize: 13, color: "var(--text-secondary)" }}>{fmt(a.binanceRate, 3)}</span>
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          <span className="num" style={{ fontSize: 13, color: "var(--text-primary)" }}>{fmt(a.unitCostTHB, 5)}</span>
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          <span className="num" style={{ fontSize: 13, color: "var(--accent-gold)" }}>{fmtTHB(a.usdtCost * a.binanceRate)}</span>
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          <span className="badge-available">Available</span>
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          <div style={{ display: "flex", gap: 8 }}>
                            <button className="btn-success" onClick={() => { setShowSellModal(a); setSellPrice(""); }}>
                              <CheckCircle size={11} /> Sell
                            </button>
                            <button className="btn-danger" onClick={() => deleteAccount(a.id)}>
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* SALES TAB */}
        {activeTab === "sales" && (
          <div className="animate-fade-up">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 className="section-title">Sales History</h2>
              <div className="card-elevated" style={{ padding: "10px 16px", display: "flex", gap: 20 }}>
                <div>
                  <p className="label" style={{ marginBottom: 2 }}>Total Revenue</p>
                  <p className="num" style={{ color: "var(--accent-gold)", fontSize: 15 }}>
                    {fmtTHB(soldAccounts.reduce((s, a) => s + (a.sellingPriceTHB ?? 0), 0))}
                  </p>
                </div>
                <div>
                  <p className="label" style={{ marginBottom: 2 }}>Net Profit</p>
                  <p className="num" style={{ color: totalNetProfit >= 0 ? "var(--accent-green)" : "var(--accent-red)", fontSize: 15 }}>
                    {fmtTHB(totalNetProfit)}
                  </p>
                </div>
              </div>
            </div>
            {soldAccounts.length === 0 ? (
              <div className="card" style={{ padding: 48, textAlign: "center" }}>
                <Activity size={32} style={{ color: "var(--text-muted)", margin: "0 auto 12px" }} />
                <p style={{ color: "var(--text-muted)", fontSize: 14 }}>No sales recorded yet</p>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)" }}>
                      {["Sold Date", "Robux", "Cost (THB)", "Sell Price (THB)", "Net Profit", "Margin"].map((h) => (
                        <th key={h} style={{ fontFamily: "'Syne',sans-serif", fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)", padding: "10px 14px", textAlign: "left" }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {soldAccounts.map((a, i) => {
                      const cost = a.unitCostTHB * a.robuxAmount;
                      const margin = a.sellingPriceTHB ? ((a.netProfit! / a.sellingPriceTHB!) * 100) : 0;
                      return (
                        <tr key={a.id} style={{ borderBottom: "1px solid var(--border)", background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)" }}>
                          <td style={{ padding: "12px 14px", fontSize: 12, color: "var(--text-muted)", fontFamily: "'Space Mono',monospace" }}>
                            {new Date(a.soldAt!).toLocaleDateString()}
                          </td>
                          <td style={{ padding: "12px 14px" }}>
                            <span className="num" style={{ fontSize: 14, color: "var(--accent-gold)" }}>{fmtRobux(a.robuxAmount)}</span>
                          </td>
                          <td style={{ padding: "12px 14px" }}>
                            <span className="num" style={{ fontSize: 13, color: "var(--text-secondary)" }}>{fmtTHB(cost)}</span>
                          </td>
                          <td style={{ padding: "12px 14px" }}>
                            <span className="num" style={{ fontSize: 13, color: "var(--accent-gold)" }}>{fmtTHB(a.sellingPriceTHB!)}</span>
                          </td>
                          <td style={{ padding: "12px 14px" }}>
                            <span
                              className="num"
                              style={{ fontSize: 13, color: (a.netProfit ?? 0) >= 0 ? "var(--accent-green)" : "var(--accent-red)" }}
                            >
                              {(a.netProfit ?? 0) >= 0 ? "+" : ""}{fmtTHB(a.netProfit ?? 0)}
                            </span>
                          </td>
                          <td style={{ padding: "12px 14px" }}>
                            <span
                              className="num"
                              style={{ fontSize: 12, color: margin >= 0 ? "var(--accent-green)" : "var(--accent-red)" }}
                            >
                              {margin >= 0 ? "+" : ""}{fmt(margin, 1)}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── Modals ──────────────────────────────────────────────────────────── */}

      {/* Wallet Modal */}
      {showWalletModal && (
        <Modal title="Log THB → USDT Transfer" onClose={() => setShowWalletModal(false)}>
          <Field label="THB Amount Sent">
            <input className="input-base" type="number" placeholder="e.g. 3650" value={wForm.thbAmount} onChange={(e) => setWForm((f) => ({ ...f, thbAmount: e.target.value }))} />
          </Field>
          <Field label="USDT Received">
            <input className="input-base" type="number" placeholder="e.g. 100" value={wForm.usdtReceived} onChange={(e) => setWForm((f) => ({ ...f, usdtReceived: e.target.value }))} />
          </Field>
          {wForm.thbAmount && wForm.usdtReceived && parseFloat(wForm.usdtReceived) > 0 && (
            <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 16px", marginBottom: 16 }}>
              <p className="label" style={{ marginBottom: 4 }}>Calculated Rate</p>
              <p className="num" style={{ color: "var(--accent-gold)", fontSize: 18 }}>
                {fmt(parseFloat(wForm.thbAmount) / parseFloat(wForm.usdtReceived), 4)} THB/USDT
              </p>
            </div>
          )}
          <Field label="Note (optional)">
            <input className="input-base" type="text" placeholder="e.g. Binance TH spot" value={wForm.note} onChange={(e) => setWForm((f) => ({ ...f, note: e.target.value }))} />
          </Field>
          <button className="btn-primary" style={{ width: "100%" }} onClick={handleWalletSubmit} disabled={!wForm.thbAmount || !wForm.usdtReceived}>
            <Plus size={14} /> Save Transfer
          </button>
        </Modal>
      )}

      {/* Inventory Modal */}
      {showInventoryModal && (
        <Modal title="Add Robux Account" onClose={() => setShowInventoryModal(false)}>
          <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 16px", marginBottom: 20 }}>
            <p className="label" style={{ marginBottom: 2 }}>Current Avg Binance Rate</p>
            <p className="num" style={{ color: "var(--accent-cyan)", fontSize: 16 }}>{fmt(avgBinanceRate, 4)} THB/USDT</p>
          </div>
          <Field label="Robux Amount">
            <input className="input-base" type="number" placeholder="e.g. 10000" value={iForm.robuxAmount} onChange={(e) => setIForm((f) => ({ ...f, robuxAmount: e.target.value }))} />
          </Field>
          <Field label="USDT Cost">
            <input className="input-base" type="number" placeholder="e.g. 1.75" value={iForm.usdtCost} onChange={(e) => setIForm((f) => ({ ...f, usdtCost: e.target.value }))} />
          </Field>
          <Field label="VND Rate (optional)">
            <input className="input-base" type="number" placeholder="e.g. 25000" value={iForm.vndRate} onChange={(e) => setIForm((f) => ({ ...f, vndRate: e.target.value }))} />
          </Field>
          {iForm.robuxAmount && iForm.usdtCost && parseFloat(iForm.robuxAmount) > 0 && (
            <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 16px", marginBottom: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <p className="label" style={{ marginBottom: 2 }}>Unit Cost</p>
                <p className="num" style={{ color: "var(--accent-gold)", fontSize: 15 }}>
                  {fmt((parseFloat(iForm.usdtCost) * avgBinanceRate) / parseFloat(iForm.robuxAmount), 5)} ฿/R$
                </p>
              </div>
              <div>
                <p className="label" style={{ marginBottom: 2 }}>Total Cost</p>
                <p className="num" style={{ color: "var(--accent-gold)", fontSize: 15 }}>
                  {fmtTHB(parseFloat(iForm.usdtCost) * avgBinanceRate)}
                </p>
              </div>
            </div>
          )}
          <button className="btn-primary" style={{ width: "100%" }} onClick={handleInventorySubmit} disabled={!iForm.robuxAmount || !iForm.usdtCost}>
            <Plus size={14} /> Add Account
          </button>
        </Modal>
      )}

      {/* Sell Modal */}
      {showSellModal && (
        <Modal title="Mark Account as Sold" onClose={() => setShowSellModal(null)}>
          <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 10, padding: "16px", marginBottom: 20, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <p className="label" style={{ marginBottom: 2 }}>Robux</p>
              <p className="num" style={{ color: "var(--accent-gold)", fontSize: 16 }}>{fmtRobux(showSellModal.robuxAmount)}</p>
            </div>
            <div>
              <p className="label" style={{ marginBottom: 2 }}>Cost Basis</p>
              <p className="num" style={{ color: "var(--text-primary)", fontSize: 16 }}>{fmtTHB(showSellModal.unitCostTHB * showSellModal.robuxAmount)}</p>
            </div>
            <div>
              <p className="label" style={{ marginBottom: 2 }}>Unit Cost</p>
              <p className="num" style={{ color: "var(--text-secondary)", fontSize: 13 }}>{fmt(showSellModal.unitCostTHB, 5)} ฿/R$</p>
            </div>
          </div>
          <Field label="Selling Price (THB)">
            <input
              className="input-base"
              type="number"
              placeholder="e.g. 300"
              value={sellPrice}
              onChange={(e) => setSellPrice(e.target.value)}
              autoFocus
            />
          </Field>
          {sellPrice && parseFloat(sellPrice) > 0 && (
            <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 16px", marginBottom: 16 }}>
              <p className="label" style={{ marginBottom: 4 }}>Estimated Profit</p>
              <p
                className="num"
                style={{
                  fontSize: 22,
                  color:
                    parseFloat(sellPrice) - showSellModal.unitCostTHB * showSellModal.robuxAmount >= 0
                      ? "var(--accent-green)"
                      : "var(--accent-red)",
                }}
              >
                {parseFloat(sellPrice) - showSellModal.unitCostTHB * showSellModal.robuxAmount >= 0 ? "+" : ""}
                {fmtTHB(parseFloat(sellPrice) - showSellModal.unitCostTHB * showSellModal.robuxAmount)}
              </p>
            </div>
          )}
          <button className="btn-primary" style={{ width: "100%" }} onClick={handleSellSubmit} disabled={!sellPrice}>
            <CheckCircle size={14} /> Confirm Sale
          </button>
        </Modal>
      )}

      {/* Rate Modal */}
      {showRateModal && (
        <Modal title="Update Exchange Rates" onClose={() => setShowRateModal(false)}>
          <Field label="Buy Rate (THB per USDT)">
            <input className="input-base" type="number" placeholder={String(state.buyRate)} value={rateForm.buyRate} onChange={(e) => setRateForm((r) => ({ ...r, buyRate: e.target.value }))} />
          </Field>
          <Field label="Sell Rate (R$ per THB)">
            <input className="input-base" type="number" placeholder={String(state.sellRate)} value={rateForm.sellRate} onChange={(e) => setRateForm((r) => ({ ...r, sellRate: e.target.value }))} />
          </Field>
          <button className="btn-primary" style={{ width: "100%" }} onClick={handleRateSubmit}>
            <RefreshCw size={14} /> Update Rates
          </button>
        </Modal>
      )}
    </div>
  );
}
