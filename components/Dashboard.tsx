"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Wallet, Package, TrendingUp, Plus, DollarSign,
  Activity, ChevronRight, X, CheckCircle, Trash2,
  BarChart3, ArrowUpRight, ArrowDownRight, Coins, RefreshCw, LogOut,
  Key, Copy, Save // <-- เพิ่มไอคอนใหม่
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

// ── Types ──────────────────────────────────────────────────────────────────
interface WalletEntry {
  id: string;
  created_at: string;
  thb_amount: number;
  usdt_received: number;
  binance_rate: number;
  note?: string;
}

interface InventoryItem {
  id: string;
  created_at: string;
  robux_amount: number;
  remaining_robux: number;
  usdt_cost: number;
  vnd_rate: number;
  binance_rate: number;
  unit_cost_thb: number;
  status: "available" | "sold";
  account_info?: string; // <-- เพิ่มคอลัมน์ใหม่
}

interface SaleItem {
  id: string;
  created_at: string;
  inventory_id: string;
  robux_sold: number;
  selling_price_thb: number;
  total_cost_thb: number;
  net_profit: number;
  customer_name?: string;
  inventory: InventoryItem;
}

interface Settings {
  buy_rate: number;
  sell_rate: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────
function fmt(n: number, decimals = 2) {
  return n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}
function fmtTHB(n: number) { return "฿" + fmt(n, 2); }
function fmtRobux(n: number) { return n.toLocaleString("en-US") + " R$"; }

// ── Modal & UI Components ──────────────────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>{title}</h3>
          <button onClick={onClose} style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 8, padding: 6, cursor: "pointer", display: "flex", color: "var(--text-secondary)" }}>
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}

function StatCard({ icon, label, value, sub, accent }: { icon: React.ReactNode; label: string; value: string; sub?: string; accent?: "gold" | "green" | "red" | "blue" }) {
  const accentMap = { gold: "var(--accent-gold)", green: "var(--accent-green)", red: "var(--accent-red)", blue: "var(--accent-blue)" };
  const color = accent ? accentMap[accent] : "var(--accent-gold)";
  return (
    <div className="card animate-fade-up" style={{ padding: 24, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: -30, right: -30, width: 100, height: 100, borderRadius: "50%", background: color, opacity: 0.04, filter: "blur(30px)" }} />
      <div style={{ width: 40, height: 40, borderRadius: 10, background: `${color}18`, border: `1px solid ${color}30`, display: "flex", alignItems: "center", justifyContent: "center", color, marginBottom: 16 }}>{icon}</div>
      <p className="label" style={{ marginBottom: 4 }}>{label}</p>
      <p className="num" style={{ fontSize: 26, fontWeight: 700, color, letterSpacing: "-0.02em", lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6, fontFamily: "'Space Mono', monospace" }}>{sub}</p>}
    </div>
  );
}

function RateBadge({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <div style={{ background: "var(--bg-elevated)", border: `1px solid ${color}30`, borderRadius: 12, padding: "14px 18px", display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 11, fontFamily: "'Syne',sans-serif", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "var(--text-muted)" }}>{label}</span>
      <span className="num" style={{ fontSize: 22, fontWeight: 700, color }}>{value}</span>
      <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "'Space Mono',monospace" }}>{unit}</span>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-base)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 40, height: 40, border: "3px solid var(--border)", borderTop: "3px solid var(--accent-gold)", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
        <p style={{ color: "var(--text-muted)", fontSize: 13, fontFamily: "'Space Mono',monospace" }}>กำลังโหลด...</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────
export default function Dashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [wallets, setWallets] = useState<WalletEntry[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [sales, setSales] = useState<SaleItem[]>([]);
  const [settings, setSettings] = useState<Settings>({ buy_rate: 36.5, sell_rate: 5.0 });
  const [activeTab, setActiveTab] = useState<"overview" | "wallet" | "inventory" | "sales">("overview");

  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [showSellModal, setShowSellModal] = useState<InventoryItem | null>(null);
  const [showRateModal, setShowRateModal] = useState(false);
  
  // State ใหม่สำหรับข้อมูลบัญชี
  const [showAccountModal, setShowAccountModal] = useState<InventoryItem | null>(null);
  const [accountInfoText, setAccountInfoText] = useState("");
  const [copied, setCopied] = useState(false);

  const [wForm, setWForm] = useState({ thbAmount: "", usdtReceived: "", note: "" });
  const [iForm, setIForm] = useState({ robuxAmount: "", usdtCost: "", vndRate: "", accountInfo: "" }); // เพิ่ม accountInfo ในฟอร์มเพิ่มสินค้า
  const [sellPrice, setSellPrice] = useState("");
  const [sellRobuxAmount, setSellRobuxAmount] = useState(""); 
  const [customerName, setCustomerName] = useState("");
  const [rateForm, setRateForm] = useState({ buyRate: "", sellRate: "" });
  const [submitting, setSubmitting] = useState(false);

  // ── Fetch all data ─────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [w, inv, s, cfg] = await Promise.all([
        supabase.from("wallets").select("*").order("created_at", { ascending: false }),
        supabase.from("inventory").select("*").order("created_at", { ascending: false }),
        supabase.from("sales").select("*, inventory(*)").order("created_at", { ascending: false }),
        supabase.from("app_settings").select("*"),
      ]);

      if (w.data) setWallets(w.data);
      if (inv.data) setInventory(inv.data);
      if (s.data) setSales(s.data as SaleItem[]);
      if (cfg.data) {
        const s: Settings = { buy_rate: 36.5, sell_rate: 5.0 };
        cfg.data.forEach((r: { key: string; value: number }) => {
          if (r.key === "buy_rate") s.buy_rate = r.value;
          if (r.key === "sell_rate") s.sell_rate = r.value;
        });
        setSettings(s);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Derived ────────────────────────────────────────────────────────────
  const avgBinanceRate = (() => {
    if (wallets.length === 0) return settings.buy_rate;
    const totalTHB = wallets.reduce((s, e) => s + e.thb_amount, 0);
    const weighted = wallets.reduce((s, e) => s + e.binance_rate * e.thb_amount, 0);
    return totalTHB > 0 ? weighted / totalTHB : settings.buy_rate;
  })();

  const availableAccounts = inventory.filter((a) => a.status === "available" && a.remaining_robux > 0);
  const soldAccounts = inventory.filter((a) => a.status === "sold" || a.remaining_robux === 0);
  const totalInvestmentTHB = availableAccounts.reduce((s, a) => s + a.usdt_cost * a.binance_rate, 0);
  const totalRobuxStock = availableAccounts.reduce((s, a) => s + (a.remaining_robux || 0), 0);
  const totalNetProfit = sales.reduce((s, a) => s + (a.net_profit ?? 0), 0);

  // ── Handlers ───────────────────────────────────────────────────────────
  async function handleWalletSubmit() {
    const thb = parseFloat(wForm.thbAmount);
    const usdt = parseFloat(wForm.usdtReceived);
    if (!thb || !usdt || thb <= 0 || usdt <= 0) return;
    setSubmitting(true);
    await supabase.from("wallets").insert({ thb_amount: thb, usdt_received: usdt, note: wForm.note || null });
    setWForm({ thbAmount: "", usdtReceived: "", note: "" });
    setShowWalletModal(false);
    setSubmitting(false);
    fetchAll();
  }

  async function handleInventorySubmit() {
    const robux = parseFloat(iForm.robuxAmount);
    const usdt = parseFloat(iForm.usdtCost);
    const vnd = parseFloat(iForm.vndRate) || 0;
    if (!robux || !usdt || robux <= 0 || usdt <= 0) return;
    const unitCost = (usdt * avgBinanceRate) / robux;
    setSubmitting(true);
    
    await supabase.from("inventory").insert({
      robux_amount: robux,
      remaining_robux: robux, 
      usdt_cost: usdt,
      vnd_rate: vnd,
      binance_rate: avgBinanceRate,
      unit_cost_thb: unitCost,
      account_info: iForm.accountInfo || null // ส่งข้อมูลบัญชีไปด้วย
    });
    
    setIForm({ robuxAmount: "", usdtCost: "", vndRate: "", accountInfo: "" });
    setShowInventoryModal(false);
    setSubmitting(false);
    fetchAll();
  }

  async function handleSellSubmit() {
    if (!showSellModal) return;
    const price = parseFloat(sellPrice);
    const amountToSell = parseFloat(sellRobuxAmount);
    
    if (!price || price <= 0 || !amountToSell || amountToSell <= 0) return;
    if (amountToSell > showSellModal.remaining_robux) {
      alert("ยอดที่ต้องการขาย มากกว่ายอดคงเหลือ!");
      return;
    }

    const totalCost = showSellModal.unit_cost_thb * amountToSell;
    setSubmitting(true);
    
    await supabase.from("sales").insert({
      inventory_id: showSellModal.id,
      robux_sold: amountToSell, 
      selling_price_thb: price,
      total_cost_thb: totalCost, 
      customer_name: customerName || null,
    });

    const newRemaining = showSellModal.remaining_robux - amountToSell;
    const newStatus = newRemaining <= 0 ? "sold" : "available";

    await supabase.from("inventory").update({ 
      remaining_robux: newRemaining,
      status: newStatus 
    }).eq("id", showSellModal.id);

    setSellPrice("");
    setSellRobuxAmount("");
    setCustomerName("");
    setShowSellModal(null);
    setSubmitting(false);
    fetchAll();
  }
  
  // ── Handlers สำหรับจัดการ Account Info ──
  async function handleSaveAccountInfo() {
    if (!showAccountModal) return;
    setSubmitting(true);
    await supabase.from("inventory").update({ 
      account_info: accountInfoText || null 
    }).eq("id", showAccountModal.id);
    
    setSubmitting(false);
    setShowAccountModal(null);
    fetchAll();
  }

  function handleCopyAccountInfo() {
    if (!accountInfoText) return;
    navigator.clipboard.writeText(accountInfoText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleDeleteWallet(id: string) {
    await supabase.from("wallets").delete().eq("id", id);
    fetchAll();
  }

  async function handleDeleteInventory(id: string) {
    await supabase.from("inventory").delete().eq("id", id);
    fetchAll();
  }

  async function handleRateSubmit() {
    const buy = parseFloat(rateForm.buyRate);
    const sell = parseFloat(rateForm.sellRate);
    if (buy > 0) await supabase.from("app_settings").update({ value: buy, updated_at: new Date().toISOString() }).eq("key", "buy_rate");
    if (sell > 0) await supabase.from("app_settings").update({ value: sell, updated_at: new Date().toISOString() }).eq("key", "sell_rate");
    setShowRateModal(false);
    fetchAll();
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (loading) return <LoadingScreen />;

  const tabs = [
    { id: "overview", label: "Overview", icon: <BarChart3 size={14} /> },
    { id: "wallet", label: "Wallet", icon: <Wallet size={14} /> },
    { id: "inventory", label: "Inventory", icon: <Package size={14} /> },
    { id: "sales", label: "Sales", icon: <TrendingUp size={14} /> },
  ] as const;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-base)" }}>
      {/* Header */}
      <header style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-card)", position: "sticky", top: 0, zIndex: 40 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg, var(--accent-gold), #e07b10)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Coins size={16} color="#0a0b0e" />
            </div>
            <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 15, color: "var(--text-primary)" }}>ROBUX</span>
            <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 15, color: "var(--accent-gold)" }}>DESK</span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn-ghost" onClick={() => { setRateForm({ buyRate: String(settings.buy_rate), sellRate: String(settings.sell_rate) }); setShowRateModal(true); }}>
              <RefreshCw size={13} /> Rates
            </button>
            <button className="btn-ghost" onClick={handleLogout} style={{ color: "var(--accent-red)", borderColor: "rgba(239,68,68,0.2)" }}>
              <LogOut size={13} /> ออกจากระบบ
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>
        {/* Rate Badges & Stat Cards & Tabs เหมือนเดิม... */}
        <div style={{ display: "flex", gap: 12, marginBottom: 28, flexWrap: "wrap" as const }}>
          <RateBadge label="Buy Rate" value={fmt(settings.buy_rate, 2)} unit="THB / USDT" color="var(--accent-gold)" />
          <RateBadge label="Sell Rate" value={fmt(settings.sell_rate, 1)} unit="R$ per THB" color="var(--accent-cyan)" />
          <RateBadge label="Avg Binance Rate" value={fmt(avgBinanceRate, 4)} unit="THB / USDT (weighted)" color="var(--accent-blue)" />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 32 }}>
          <StatCard icon={<DollarSign size={18} />} label="ลงทุนทั้งหมด" value={fmtTHB(totalInvestmentTHB)} sub={`${inventory.length} บัญชีทั้งหมด`} accent="gold" />
          <StatCard icon={<Package size={18} />} label="Robux คงเหลือ" value={fmtRobux(totalRobuxStock)} sub={`${availableAccounts.length} บัญชีมีสต็อก`} accent="blue" />
          <StatCard icon={<TrendingUp size={18} />} label="กำไรสุทธิรวม" value={fmtTHB(totalNetProfit)} sub={`${sales.length} รายการขาย`} accent={totalNetProfit >= 0 ? "green" : "red"} />
        </div>

        <div style={{ display: "flex", gap: 6, marginBottom: 24, padding: 4, background: "var(--bg-card)", borderRadius: 12, border: "1px solid var(--border)", width: "fit-content" }}>
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} style={{ fontFamily: "'Syne',sans-serif", fontWeight: 600, fontSize: 12, letterSpacing: "0.04em", padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, transition: "all 0.15s", background: activeTab === t.id ? "var(--bg-elevated)" : "transparent", color: activeTab === t.id ? "var(--accent-gold)" : "var(--text-muted)" }}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW ── */}
        {activeTab === "overview" && (
           // โค้ด Overview
           <div className="animate-fade-up" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div className="card" style={{ padding: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <h3 className="section-title">ประวัติการขายล่าสุด</h3>
                <button className="btn-ghost" onClick={() => setActiveTab("sales")} style={{ fontSize: 11 }}>ดูทั้งหมด <ChevronRight size={12} /></button>
              </div>
              {sales.length === 0 ? (
                <p style={{ color: "var(--text-muted)", fontSize: 13, textAlign: "center", padding: "24px 0" }}>ยังไม่มีการขาย</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {sales.slice(0, 5).map((s) => (
                    <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", background: "var(--bg-elevated)", borderRadius: 10, border: "1px solid var(--border)" }}>
                      <div>
                        <p className="num" style={{ fontSize: 13, color: "var(--text-primary)" }}>{fmtRobux(s.robux_sold ?? s.inventory?.robux_amount ?? 0)}</p>
                        <p style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "'Space Mono',monospace", marginTop: 2 }}>{new Date(s.created_at).toLocaleDateString("th-TH")}</p>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <p className="num" style={{ fontSize: 13, color: "var(--accent-gold)" }}>{fmtTHB(s.selling_price_thb)}</p>
                        <p className="num" style={{ fontSize: 11, color: s.net_profit >= 0 ? "var(--accent-green)" : "var(--accent-red)", marginTop: 2 }}>
                          {s.net_profit >= 0 ? <ArrowUpRight size={10} style={{ display: "inline" }} /> : <ArrowDownRight size={10} style={{ display: "inline" }} />}
                          {fmtTHB(s.net_profit)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card" style={{ padding: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <h3 className="section-title">สต็อกคงเหลือ</h3>
                <button className="btn-ghost" onClick={() => setActiveTab("inventory")} style={{ fontSize: 11 }}>จัดการ <ChevronRight size={12} /></button>
              </div>
              {availableAccounts.length === 0 ? (
                <p style={{ color: "var(--text-muted)", fontSize: 13, textAlign: "center", padding: "24px 0" }}>ไม่มีสต็อก</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {availableAccounts.slice(0, 5).map((a) => (
                    <div key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", background: "var(--bg-elevated)", borderRadius: 10, border: "1px solid var(--border)" }}>
                      <div>
                        <p className="num" style={{ fontSize: 13, color: "var(--text-primary)" }}>เหลือ: {fmtRobux(a.remaining_robux)} <span style={{fontSize: 10, color: "var(--text-muted)"}}>จาก {fmtRobux(a.robux_amount)}</span></p>
                        <p style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "'Space Mono',monospace", marginTop: 2 }}>ต้นทุน: {fmtTHB(a.usdt_cost * a.binance_rate)}</p>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <span className="badge-available">พร้อมขาย</span>
                        <p className="num" style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>{fmt(a.unit_cost_thb, 5)} ฿/R$</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── WALLET ── */}
        {activeTab === "wallet" && (
          // โค้ด Wallet
          <div className="animate-fade-up">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 className="section-title">Wallet — โอน THB → USDT</h2>
              <button className="btn-primary" onClick={() => setShowWalletModal(true)}><Plus size={14} /> บันทึกการโอน</button>
            </div>
            {wallets.length === 0 ? (
              <div className="card" style={{ padding: 48, textAlign: "center" }}>
                <Wallet size={32} style={{ color: "var(--text-muted)", margin: "0 auto 12px" }} />
                <p style={{ color: "var(--text-muted)", fontSize: 14 }}>ยังไม่มีรายการโอน</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {wallets.map((e) => (
                  <div key={e.id} className="card" style={{ padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
                    <div style={{ display: "flex", gap: 20, alignItems: "center", flex: 1, flexWrap: "wrap" as const }}>
                      <div><p className="label" style={{ marginBottom: 2 }}>วันที่</p><p className="num" style={{ fontSize: 12, color: "var(--text-secondary)" }}>{new Date(e.created_at).toLocaleDateString("th-TH")}</p></div>
                      <div><p className="label" style={{ marginBottom: 2 }}>THB ที่โอน</p><p className="num" style={{ fontSize: 15, color: "var(--accent-gold)" }}>{fmtTHB(e.thb_amount)}</p></div>
                      <div><p className="label" style={{ marginBottom: 2 }}>USDT ที่ได้</p><p className="num" style={{ fontSize: 15, color: "var(--accent-cyan)" }}>${fmt(e.usdt_received)}</p></div>
                      <div><p className="label" style={{ marginBottom: 2 }}>เรต</p><p className="num" style={{ fontSize: 13, color: "var(--text-primary)" }}>{fmt(e.binance_rate, 4)} THB/USDT</p></div>
                      {e.note && <div><p className="label" style={{ marginBottom: 2 }}>หมายเหตุ</p><p style={{ fontSize: 12, color: "var(--text-muted)" }}>{e.note}</p></div>}
                    </div>
                    <button className="btn-danger" onClick={() => handleDeleteWallet(e.id)}><Trash2 size={12} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── INVENTORY ── */}
        {activeTab === "inventory" && (
          <div className="animate-fade-up">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 className="section-title">คลัง — บัญชี Robux</h2>
              <button className="btn-primary" onClick={() => setShowInventoryModal(true)}><Plus size={14} /> เพิ่มบัญชี</button>
            </div>
            {availableAccounts.length === 0 ? (
              <div className="card" style={{ padding: 48, textAlign: "center" }}>
                <Package size={32} style={{ color: "var(--text-muted)", margin: "0 auto 12px" }} />
                <p style={{ color: "var(--text-muted)", fontSize: 14 }}>ไม่มีบัญชีที่พร้อมขาย</p>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)" }}>
                      {["วันที่", "คงเหลือ / รวม", "ต้นทุน USDT", "เรต Binance", "สถานะ", "จัดการ"].map((h) => (
                        <th key={h} style={{ fontFamily: "'Syne',sans-serif", fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "var(--text-muted)", padding: "10px 14px", textAlign: "left" as const }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {availableAccounts.map((a, i) => (
                      <tr key={a.id} style={{ borderBottom: "1px solid var(--border)", background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)" }}>
                        <td style={{ padding: "12px 14px", fontSize: 12, color: "var(--text-muted)", fontFamily: "'Space Mono',monospace" }}>{new Date(a.created_at).toLocaleDateString("th-TH")}</td>
                        <td style={{ padding: "12px 14px" }}>
                          <span className="num" style={{ fontSize: 14, color: "var(--accent-gold)" }}>{fmtRobux(a.remaining_robux)}</span>
                          <span className="num" style={{ fontSize: 10, color: "var(--text-muted)", marginLeft: 6 }}>/ {fmtRobux(a.robux_amount)}</span>
                        </td>
                        <td style={{ padding: "12px 14px" }}><span className="num" style={{ fontSize: 13, color: "var(--accent-cyan)" }}>${fmt(a.usdt_cost)}</span></td>
                        <td style={{ padding: "12px 14px" }}><span className="num" style={{ fontSize: 13, color: "var(--text-secondary)" }}>{fmt(a.binance_rate, 4)}</span></td>
                        <td style={{ padding: "12px 14px" }}>
                           {a.remaining_robux < a.robux_amount ? <span className="badge-available" style={{background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.2)'}}>แบ่งขายแล้ว</span> : <span className="badge-available">พร้อมขาย</span>}
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          <div style={{ display: "flex", gap: 8 }}>
                            {/* ปุ่มดูข้อมูลบัญชี (รูปกุญแจ) */}
                            <button className="btn-ghost" style={{ padding: "6px 8px" }} onClick={() => { 
                              setShowAccountModal(a); 
                              setAccountInfoText(a.account_info || ""); 
                            }}>
                              <Key size={13} style={{ color: a.account_info ? "var(--text-primary)" : "var(--text-muted)" }} />
                            </button>
                            <button className="btn-success" onClick={() => { 
                              setShowSellModal(a); 
                              setSellPrice(""); 
                              setSellRobuxAmount(String(a.remaining_robux));
                              setCustomerName(""); 
                            }}><CheckCircle size={11} /> ขาย</button>
                            <button className="btn-danger" onClick={() => handleDeleteInventory(a.id)}><Trash2 size={11} /></button>
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

        {/* ── SALES ── */}
        {activeTab === "sales" && (
           // โค้ด Sales
          <div className="animate-fade-up">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 className="section-title">ประวัติการขาย</h2>
              <div className="card-elevated" style={{ padding: "10px 16px", display: "flex", gap: 20 }}>
                <div>
                  <p className="label" style={{ marginBottom: 2 }}>รายได้รวม</p>
                  <p className="num" style={{ color: "var(--accent-gold)", fontSize: 15 }}>{fmtTHB(sales.reduce((s, a) => s + a.selling_price_thb, 0))}</p>
                </div>
                <div>
                  <p className="label" style={{ marginBottom: 2 }}>กำไรสุทธิ</p>
                  <p className="num" style={{ color: totalNetProfit >= 0 ? "var(--accent-green)" : "var(--accent-red)", fontSize: 15 }}>{fmtTHB(totalNetProfit)}</p>
                </div>
              </div>
            </div>
            {sales.length === 0 ? (
              <div className="card" style={{ padding: 48, textAlign: "center" }}>
                <Activity size={32} style={{ color: "var(--text-muted)", margin: "0 auto 12px" }} />
                <p style={{ color: "var(--text-muted)", fontSize: 14 }}>ยังไม่มีประวัติการขาย</p>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)" }}>
                      {["วันที่ขาย", "จำนวนขาย (R$)", "ลูกค้า", "ต้นทุนส่วนที่ขาย", "ราคาขาย (THB)", "กำไรสุทธิ", "Margin"].map((h) => (
                        <th key={h} style={{ fontFamily: "'Syne',sans-serif", fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "var(--text-muted)", padding: "10px 14px", textAlign: "left" as const }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sales.map((s, i) => {
                      const margin = s.selling_price_thb > 0 ? (s.net_profit / s.selling_price_thb) * 100 : 0;
                      return (
                        <tr key={s.id} style={{ borderBottom: "1px solid var(--border)", background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)" }}>
                          <td style={{ padding: "12px 14px", fontSize: 12, color: "var(--text-muted)", fontFamily: "'Space Mono',monospace" }}>{new Date(s.created_at).toLocaleDateString("th-TH")}</td>
                          <td style={{ padding: "12px 14px" }}><span className="num" style={{ fontSize: 14, color: "var(--accent-gold)" }}>{fmtRobux(s.robux_sold ?? s.inventory?.robux_amount ?? 0)}</span></td>
                          <td style={{ padding: "12px 14px" }}><span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{s.customer_name || "-"}</span></td>
                          <td style={{ padding: "12px 14px" }}><span className="num" style={{ fontSize: 13, color: "var(--text-secondary)" }}>{fmtTHB(s.total_cost_thb)}</span></td>
                          <td style={{ padding: "12px 14px" }}><span className="num" style={{ fontSize: 13, color: "var(--accent-gold)" }}>{fmtTHB(s.selling_price_thb)}</span></td>
                          <td style={{ padding: "12px 14px" }}><span className="num" style={{ fontSize: 13, color: s.net_profit >= 0 ? "var(--accent-green)" : "var(--accent-red)" }}>{s.net_profit >= 0 ? "+" : ""}{fmtTHB(s.net_profit)}</span></td>
                          <td style={{ padding: "12px 14px" }}><span className="num" style={{ fontSize: 12, color: margin >= 0 ? "var(--accent-green)" : "var(--accent-red)" }}>{margin >= 0 ? "+" : ""}{fmt(margin, 1)}%</span></td>
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

      {/* ── Modals ── */}
      
      {/* Modal จัดการข้อมูลบัญชี (Credentials) */}
      {showAccountModal && (
        <Modal title="ข้อมูลบัญชี (Credentials)" onClose={() => setShowAccountModal(null)}>
          <div style={{ marginBottom: 16 }}>
            <p className="label" style={{ marginBottom: 8 }}>รายละเอียด Username / Password / Pin</p>
            <textarea 
              className="input-base" 
              style={{ 
                minHeight: 120, 
                resize: "vertical", 
                fontFamily: "'Space Mono', monospace", 
                fontSize: 13, 
                lineHeight: 1.5 
              }} 
              placeholder="Username: robux_seller&#10;Password: MyPass123&#10;Pin: 1234" 
              value={accountInfoText} 
              onChange={(e) => setAccountInfoText(e.target.value)} 
            />
          </div>
          
          <div style={{ display: "flex", gap: 10 }}>
            <button 
              className="btn-ghost" 
              style={{ flex: 1, display: "flex", justifyContent: "center", border: "1px solid var(--border)" }} 
              onClick={handleCopyAccountInfo}
              disabled={!accountInfoText}
            >
              {copied ? <><CheckCircle size={14} color="var(--accent-green)" /> คัดลอกแล้ว!</> : <><Copy size={14} /> คัดลอก</>}
            </button>
            <button 
              className="btn-primary" 
              style={{ flex: 1, display: "flex", justifyContent: "center" }} 
              onClick={handleSaveAccountInfo}
              disabled={submitting}
            >
              {submitting ? "กำลังบันทึก..." : <><Save size={14} /> บันทึกแก้ไข</>}
            </button>
          </div>
        </Modal>
      )}

      {/* Modal เพิ่มบัญชี */}
      {showInventoryModal && (
        <Modal title="เพิ่มบัญชี Robux" onClose={() => setShowInventoryModal(false)}>
          <Field label="จำนวน Robux"><input className="input-base" type="number" placeholder="เช่น 10000" value={iForm.robuxAmount} onChange={(e) => setIForm((f) => ({ ...f, robuxAmount: e.target.value }))} /></Field>
          <Field label="ต้นทุน USDT"><input className="input-base" type="number" placeholder="เช่น 1.75" value={iForm.usdtCost} onChange={(e) => setIForm((f) => ({ ...f, usdtCost: e.target.value }))} /></Field>
          
          <Field label="ข้อมูลบัญชี User/Pass (ไม่บังคับ)">
            <textarea 
              className="input-base" 
              style={{ minHeight: 80, resize: "vertical", fontFamily: "'Space Mono', monospace", fontSize: 13 }} 
              placeholder="Username: xxx&#10;Password: yyy" 
              value={iForm.accountInfo} 
              onChange={(e) => setIForm((f) => ({ ...f, accountInfo: e.target.value }))} 
            />
          </Field>
          
          <button className="btn-primary" style={{ width: "100%", marginTop: 16 }} onClick={handleInventorySubmit} disabled={submitting || !iForm.robuxAmount || !iForm.usdtCost}>
            {submitting ? "กำลังบันทึก..." : <><Plus size={14} /> เพิ่มบัญชี</>}
          </button>
        </Modal>
      )}

      {/* โมเดลอื่นๆ ยังคงเหมือนเดิม */}
      {showWalletModal && (
         <Modal title="บันทึกการโอน THB → USDT" onClose={() => setShowWalletModal(false)}>
           <Field label="จำนวน THB ที่โอน"><input className="input-base" type="number" placeholder="เช่น 3650" value={wForm.thbAmount} onChange={(e) => setWForm((f) => ({ ...f, thbAmount: e.target.value }))} /></Field>
           <Field label="USDT ที่ได้รับ"><input className="input-base" type="number" placeholder="เช่น 100" value={wForm.usdtReceived} onChange={(e) => setWForm((f) => ({ ...f, usdtReceived: e.target.value }))} /></Field>
           <button className="btn-primary" style={{ width: "100%", marginTop: 16 }} onClick={handleWalletSubmit} disabled={submitting || !wForm.thbAmount || !wForm.usdtReceived}>
             {submitting ? "กำลังบันทึก..." : <><Plus size={14} /> บันทึก</>}
           </button>
         </Modal>
      )}

      {showSellModal && (
        <Modal title="บันทึกการขาย (แบ่งขายได้)" onClose={() => setShowSellModal(null)}>
          <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 10, padding: 16, marginBottom: 20, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><p className="label" style={{ marginBottom: 2 }}>Robux คงเหลือ</p><p className="num" style={{ color: "var(--accent-gold)", fontSize: 16 }}>{fmtRobux(showSellModal.remaining_robux)}</p></div>
            <div><p className="label" style={{ marginBottom: 2 }}>ต้นทุน/R$</p><p className="num" style={{ color: "var(--text-primary)", fontSize: 16 }}>{fmt(showSellModal.unit_cost_thb, 5)} ฿</p></div>
          </div>
          
          <Field label="จำนวน Robux ที่ต้องการขาย">
            <input className="input-base" type="number" placeholder={`สูงสุด ${showSellModal.remaining_robux}`} value={sellRobuxAmount} onChange={(e) => setSellRobuxAmount(e.target.value)} autoFocus />
          </Field>

          <Field label="ราคาขายรวม (THB)">
            <input className="input-base" type="number" placeholder="เช่น 300" value={sellPrice} onChange={(e) => setSellPrice(e.target.value)} />
          </Field>

          <Field label="ชื่อลูกค้า (ไม่บังคับ)">
            <input className="input-base" type="text" placeholder="เช่น คุณสมชาย" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
          </Field>

          {sellPrice && sellRobuxAmount && parseFloat(sellPrice) > 0 && parseFloat(sellRobuxAmount) > 0 && (
            <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 16px", marginBottom: 16 }}>
              <p className="label" style={{ marginBottom: 4 }}>กำไรประมาณ (เฉพาะส่วนที่ขาย)</p>
              <p className="num" style={{ fontSize: 22, color: parseFloat(sellPrice) - (showSellModal.unit_cost_thb * parseFloat(sellRobuxAmount)) >= 0 ? "var(--accent-green)" : "var(--accent-red)" }}>
                {parseFloat(sellPrice) - (showSellModal.unit_cost_thb * parseFloat(sellRobuxAmount)) >= 0 ? "+" : ""}
                {fmtTHB(parseFloat(sellPrice) - (showSellModal.unit_cost_thb * parseFloat(sellRobuxAmount)))}
              </p>
            </div>
          )}
          <button className="btn-primary" style={{ width: "100%" }} onClick={handleSellSubmit} disabled={submitting || !sellPrice || !sellRobuxAmount}>
            {submitting ? "กำลังบันทึก..." : <><CheckCircle size={14} /> ยืนยันการขาย</>}
          </button>
        </Modal>
      )}

      {showRateModal && (
        <Modal title="อัปเดตอัตราแลกเปลี่ยน" onClose={() => setShowRateModal(false)}>
          <Field label="Buy Rate (THB ต่อ USDT)"><input className="input-base" type="number" placeholder={String(settings.buy_rate)} value={rateForm.buyRate} onChange={(e) => setRateForm((r) => ({ ...r, buyRate: e.target.value }))} /></Field>
          <Field label="Sell Rate (R$ ต่อ THB)"><input className="input-base" type="number" placeholder={String(settings.sell_rate)} value={rateForm.sellRate} onChange={(e) => setRateForm((r) => ({ ...r, sellRate: e.target.value }))} /></Field>
          <button className="btn-primary" style={{ width: "100%" }} onClick={handleRateSubmit}>
            <RefreshCw size={14} /> อัปเดต
          </button>
        </Modal>
      )}
    </div>
  );
}