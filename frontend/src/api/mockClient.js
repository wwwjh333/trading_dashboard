/**
 * Mock API client — returns fake data without any network calls.
 * Enabled when VITE_MOCK=true in .env.local
 */
import {
  MOCK_MACRO_LATEST,
  MOCK_MACRO_HISTORY,
  MOCK_PRICE_HISTORY,
  MOCK_STOCK_LIST,
  getMockSummary,
  MOCK_NEWS,
  getMockOptions,
  MOCK_CATALYSTS,
  MOCK_CAPEX,
  MOCK_SUPPLY_CHAIN,
  MOCK_TRADES,
  MOCK_TRADE_STATS,
  MOCK_AUTH,
  MOCK_BASKETS,
  genBasketPerformance,
} from './mockData'

const delay = (ms = 200) => new Promise((r) => setTimeout(r, ms))

// ── macro ──────────────────────────────────────────────
export const macroApi = {
  getLatest: async () => { await delay(); return MOCK_MACRO_LATEST },
  getHistory: async (indicator) => { await delay(); return MOCK_MACRO_HISTORY[indicator] ?? [] },
}

// ── stocks ─────────────────────────────────────────────
let mockStockList = [...MOCK_STOCK_LIST]
let nextStockId = mockStockList.length + 1

export const stocksApi = {
  getList: async () => { await delay(); return [...mockStockList] },
  getPrice: async (ticker, days = 90) => {
    await delay()
    const all = MOCK_PRICE_HISTORY[ticker] ?? []
    return all.slice(-days)
  },
  getSummary: async (ticker) => { await delay(); return getMockSummary(ticker) },
  addStock: async (data) => {
    await delay()
    const exists = mockStockList.find((s) => s.ticker === data.ticker.toUpperCase())
    if (exists) throw { response: { data: { detail: `${data.ticker} already in watchlist` } } }
    const s = { id: nextStockId++, ticker: data.ticker.toUpperCase(), name: data.name ?? null, sector: data.sector ?? null, supply_chain_layer: data.supply_chain_layer ?? null, is_active: true, user_notes: null, created_at: new Date().toISOString() }
    mockStockList.push(s)
    return s
  },
  removeStock: async (ticker) => {
    await delay()
    mockStockList = mockStockList.filter((s) => s.ticker !== ticker.toUpperCase())
  },
}

// ── news ───────────────────────────────────────────────
export const newsApi = {
  getLatest: async (ticker, limit = 20) => {
    await delay()
    const filtered = ticker ? MOCK_NEWS.filter((n) => n.ticker === ticker) : MOCK_NEWS
    return filtered.slice(0, limit)
  },
  refresh: async () => { await delay(500); return { message: 'Mock: no real refresh in preview mode' } },
}

// ── options ────────────────────────────────────────────
export const optionsApi = {
  getSnapshot: async (ticker) => { await delay(); return getMockOptions(ticker) },
  getHistory: async (ticker) => { await delay(); return getMockOptions(ticker) },
}

// ── catalysts ──────────────────────────────────────────
let catalysts = [...MOCK_CATALYSTS]
let nextCatalystId = catalysts.length + 1

export const catalystsApi = {
  getUpcoming: async (days = 28) => {
    await delay()
    const cutoff = new Date(Date.now() + days * 86400000).toISOString().split('T')[0]
    const today  = new Date().toISOString().split('T')[0]
    return catalysts.filter((c) => c.event_date >= today && c.event_date <= cutoff)
  },
  getById: async (id) => { await delay(); return catalysts.find((c) => c.id === id) },
  create: async (data) => {
    await delay()
    const c = { ...data, id: nextCatalystId++, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
    catalysts.push(c)
    return c
  },
  updateThesis: async (id, user_thesis) => {
    await delay()
    const c = catalysts.find((c) => c.id === id)
    if (c) { c.user_thesis = user_thesis; c.updated_at = new Date().toISOString() }
    return c
  },
  updateResult: async (id, data) => {
    await delay()
    const c = catalysts.find((c) => c.id === id)
    if (c) Object.assign(c, data)
    return c
  },
}

// ── trades ─────────────────────────────────────────────
let trades = [...MOCK_TRADES]
let nextTradeId = trades.length + 1

export const tradesApi = {
  getAll: async () => { await delay(); return [...trades].reverse() },
  getStats: async () => { await delay(); return MOCK_TRADE_STATS },
  create: async (data) => {
    await delay()
    const t = { ...data, id: nextTradeId++, user_id: 1, pnl: null, pnl_pct: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
    trades.push(t)
    return t
  },
  update: async (id, data) => {
    await delay()
    const t = trades.find((t) => t.id === id)
    if (t) {
      Object.assign(t, data)
      if (t.exit_price && t.entry_price) {
        const e = parseFloat(t.entry_price), x = parseFloat(t.exit_price), s = parseFloat(t.position_size)
        t.pnl = t.direction === 'long' ? (x - e) * s : (e - x) * s
        t.pnl_pct = (t.pnl / (e * s)) * 100
      }
    }
    return t
  },
  remove: async (id) => { await delay(); trades = trades.filter((t) => t.id !== id) },
}

// ── industry ────────────────────────────────────────────
export const industryApi = {
  getSupplyChain: async () => { await delay(); return MOCK_SUPPLY_CHAIN },
  getCapex: async () => { await delay(); return MOCK_CAPEX },
}

// ── baskets ─────────────────────────────────────────────
let mockBaskets = [...MOCK_BASKETS]
let nextBasketId = mockBaskets.length + 1

export const basketsApi = {
  getAll: async () => { await delay(); return [...mockBaskets] },
  create: async (data) => {
    await delay()
    const b = { id: nextBasketId++, user_id: 1, tickers: [], color: null, ...data, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
    mockBaskets.push(b)
    return b
  },
  update: async (id, data) => {
    await delay()
    const b = mockBaskets.find((x) => x.id === id)
    if (!b) throw new Error('Not found')
    Object.assign(b, data, { updated_at: new Date().toISOString() })
    return b
  },
  remove: async (id) => { await delay(); mockBaskets = mockBaskets.filter((b) => b.id !== id) },
  getPerformance: async (id, days = 30) => {
    await delay(300)
    const basket = mockBaskets.find((b) => b.id === id)
    if (!basket) throw new Error('Not found')
    return genBasketPerformance(basket, days)
  },
}

// ── auth ───────────────────────────────────────────────
export const authApi = {
  login: async () => { await delay(300); return MOCK_AUTH },
  register: async () => { await delay(300); return MOCK_AUTH },
}
