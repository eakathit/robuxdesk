import { supabase } from './supabase'

// ── Wallets ────────────────────────────────────────────────────────────────
export async function getWallets() {
  const { data, error } = await supabase
    .from('wallets')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function addWallet(thbAmount: number, usdtReceived: number, note?: string) {
  const { data, error } = await supabase
    .from('wallets')
    .insert({ thb_amount: thbAmount, usdt_received: usdtReceived, note })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteWallet(id: string) {
  const { error } = await supabase.from('wallets').delete().eq('id', id)
  if (error) throw error
}

// ── Inventory ──────────────────────────────────────────────────────────────
export async function getInventory() {
  const { data, error } = await supabase
    .from('inventory')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function addInventory(payload: {
  robuxAmount: number
  usdtCost: number
  vndRate: number
  binanceRate: number
  unitCostTHB: number
  username?: string
  password?: string
}) {
  const { data, error } = await supabase
    .from('inventory')
    .insert({
      robux_amount:   payload.robuxAmount,
      remaining_robux: payload.robuxAmount,
      usdt_cost:      payload.usdtCost,
      vnd_rate:       payload.vndRate,
      binance_rate:   payload.binanceRate,
      unit_cost_thb:  payload.unitCostTHB,
      username:       payload.username ?? null,
      password:       payload.password ?? null,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function recordSale(payload: {
  inventoryId: string
  robuxSold: number
  sellingPriceTHB: number
  totalCostTHB: number
  netProfit: number
  customerName?: string
  newRemainingRobux: number
}) {
  // 1. บันทึก sales record
  const { data: sale, error: saleErr } = await supabase
    .from('sales')
    .insert({
      inventory_id:      payload.inventoryId,
      robux_sold:        payload.robuxSold,
      selling_price_thb: payload.sellingPriceTHB,
      total_cost_thb:    payload.totalCostTHB,
      net_profit:        payload.netProfit,
      customer_name:     payload.customerName ?? null,
    })
    .select()
    .single()
  if (saleErr) throw saleErr

  // 2. ตัดสต็อก + เปลี่ยน status ถ้าหมด
  const newStatus = payload.newRemainingRobux <= 0 ? 'sold' : 'available'
  const { error: invErr } = await supabase
    .from('inventory')
    .update({ remaining_robux: payload.newRemainingRobux, status: newStatus })
    .eq('id', payload.inventoryId)
  if (invErr) throw invErr

  return sale
}

export async function deleteInventory(id: string) {
  const { error } = await supabase.from('inventory').delete().eq('id', id)
  if (error) throw error
}

// ── Sales ──────────────────────────────────────────────────────────────────
export async function getSales() {
  const { data, error } = await supabase
    .from('sales')
    .select('*, inventory(*)')   // join ดึง robux_amount มาด้วย
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

// ── Settings ───────────────────────────────────────────────────────────────
export async function getSettings() {
  const { data, error } = await supabase.from('app_settings').select('*')
  if (error) throw error
  const result: Record<string, number> = {}
  data.forEach((row) => { result[row.key] = row.value })
  return result
}

export async function updateSetting(key: string, value: number) {
  const { error } = await supabase
    .from('app_settings')
    .update({ value, updated_at: new Date().toISOString() })
    .eq('key', key)
  if (error) throw error
}

// ── Avg Binance Rate (คำนวณจาก DB) ────────────────────────────────────────
export async function getAvgBinanceRate(): Promise<number> {
  const { data, error } = await supabase
    .from('wallets')
    .select('thb_amount, binance_rate')
  if (error || !data || data.length === 0) return 36.5

  const totalTHB = data.reduce((s, r) => s + r.thb_amount, 0)
  const weighted = data.reduce((s, r) => s + r.binance_rate * r.thb_amount, 0)
  return totalTHB > 0 ? weighted / totalTHB : 36.5
}