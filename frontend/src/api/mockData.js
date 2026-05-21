import dayjs from 'dayjs'

// ── 宏观数据 ──────────────────────────────────────────
export const MOCK_MACRO_LATEST = [
  { indicator: 'DGS10', date: '2026-05-20', value: 4.42, change: 0.03 },
  { indicator: 'DGS2',  date: '2026-05-20', value: 4.81, change: -0.02 },
  { indicator: 'VIXCLS',date: '2026-05-19', value: 18.4, change: -1.2 },
  { indicator: 'SOX',   date: '2026-05-20', value: 5312, change: 87 },
  { indicator: 'DXY',   date: '2026-05-20', value: 104.3, change: -0.4 },
]

function buildMacroHistory(indicator, baseValue, days = 90) {
  const rows = []
  let v = baseValue
  for (let i = days; i >= 0; i--) {
    v = v + (Math.random() - 0.49) * baseValue * 0.008
    rows.push({ id: i, indicator, date: dayjs().subtract(i, 'day').format('YYYY-MM-DD'), value: parseFloat(v.toFixed(4)) })
  }
  return rows
}

export const MOCK_MACRO_HISTORY = {
  DGS10:  buildMacroHistory('DGS10', 4.4, 90),
  DGS2:   buildMacroHistory('DGS2', 4.8, 90),
  VIXCLS: buildMacroHistory('VIXCLS', 18, 90),
  SOX:    buildMacroHistory('SOX', 5200, 90),
  DXY:    buildMacroHistory('DXY', 104, 90),
}

// ── 股票价格 ──────────────────────────────────────────
const STOCK_INFO = {
  // Cloud / Hyperscaler
  MSFT:  { name: 'Microsoft',           sector: 'cloud',        layer: 'cloud',     base: 420 },
  AMZN:  { name: 'Amazon',              sector: 'cloud',        layer: 'cloud',     base: 190 },
  GOOG:  { name: 'Alphabet',            sector: 'cloud',        layer: 'cloud',     base: 175 },
  // Server
  SMCI:  { name: 'Super Micro Computer',sector: 'server',       layer: 'server',    base: 42 },
  DELL:  { name: 'Dell Technologies',   sector: 'server',       layer: 'server',    base: 135 },
  // Chip Design
  NVDA:  { name: 'NVIDIA Corp',         sector: 'chip',         layer: 'chip',      base: 875 },
  AMD:   { name: 'Advanced Micro Devices', sector: 'chip',      layer: 'chip',      base: 155 },
  QCOM:  { name: 'Qualcomm',            sector: 'chip',         layer: 'chip',      base: 155 },
  INTC:  { name: 'Intel Corp',          sector: 'chip',         layer: 'chip',      base: 21 },
  // Memory / HBM
  MU:    { name: 'Micron Technology',   sector: 'memory',       layer: 'memory',    base: 115 },
  // Foundry / Packaging
  TSM:   { name: 'Taiwan Semiconductor',sector: 'foundry',      layer: 'foundry',   base: 175 },
  AMKR:  { name: 'Amkor Technology',    sector: 'foundry',      layer: 'foundry',   base: 28 },
  // Equipment
  ASML:  { name: 'ASML Holding',        sector: 'equipment',    layer: 'equipment', base: 820 },
  LRCX:  { name: 'Lam Research',        sector: 'equipment',    layer: 'equipment', base: 880 },
  AMAT:  { name: 'Applied Materials',   sector: 'equipment',    layer: 'equipment', base: 185 },
  KLAC:  { name: 'KLA Corp',            sector: 'equipment',    layer: 'equipment', base: 720 },
  // Materials
  ENTG:  { name: 'Entegris',            sector: 'materials',    layer: 'materials', base: 110 },
  CMCSA: { name: 'CMC Materials',       sector: 'materials',    layer: 'materials', base: 90 },
}

function buildPriceHistory(ticker, days = 90) {
  const base = STOCK_INFO[ticker]?.base ?? 100
  const rows = []
  let close = base
  for (let i = days; i >= 0; i--) {
    const change = (Math.random() - 0.48) * close * 0.025
    const open = close
    close = Math.max(close + change, 1)
    const high = Math.max(open, close) * (1 + Math.random() * 0.01)
    const low  = Math.min(open, close) * (1 - Math.random() * 0.01)
    const volume = Math.floor(30e6 + Math.random() * 80e6)
    // Simple RSI approximation
    const rsi = 40 + Math.sin(i / 8) * 20 + Math.random() * 10
    rows.push({
      id: i,
      ticker,
      date: dayjs().subtract(i, 'day').format('YYYY-MM-DD'),
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low:  parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
      volume,
      rsi_14: parseFloat(rsi.toFixed(2)),
      macd: parseFloat(((Math.random() - 0.5) * close * 0.01).toFixed(4)),
      macd_signal: parseFloat(((Math.random() - 0.5) * close * 0.008).toFixed(4)),
      macd_hist:  parseFloat(((Math.random() - 0.5) * close * 0.003).toFixed(4)),
      bb_upper: parseFloat((close * 1.04).toFixed(2)),
      bb_middle: parseFloat(close.toFixed(2)),
      bb_lower: parseFloat((close * 0.96).toFixed(2)),
      sma_50:  parseFloat((close * (0.95 + Math.random() * 0.1)).toFixed(2)),
      sma_200: parseFloat((base * (0.9 + Math.random() * 0.05)).toFixed(2)),
    })
  }
  return rows
}

export const MOCK_PRICE_HISTORY = Object.fromEntries(
  Object.keys(STOCK_INFO).map((t) => [t, buildPriceHistory(t, 90)])
)

export function getMockSummary(ticker) {
  const info = STOCK_INFO[ticker]
  const prices = MOCK_PRICE_HISTORY[ticker] ?? []
  const latest = prices[prices.length - 1]
  const prev   = prices[prices.length - 2]
  const change = latest && prev ? ((latest.close - prev.close) / prev.close) * 100 : 0
  return {
    ticker,
    name: info?.name,
    sector: info?.sector,
    supply_chain_layer: info?.layer,
    latest_price: latest?.close,
    price_change_pct: parseFloat(change.toFixed(2)),
    rsi_14: latest?.rsi_14,
    volume: latest?.volume,
    user_notes: null,
  }
}

export const MOCK_STOCK_LIST = Object.keys(STOCK_INFO).map((ticker) => ({
  id: Object.keys(STOCK_INFO).indexOf(ticker) + 1,
  ticker,
  name: STOCK_INFO[ticker].name,
  sector: STOCK_INFO[ticker].sector,
  supply_chain_layer: STOCK_INFO[ticker].layer,
  is_active: true,
  user_notes: null,
  created_at: '2026-01-01T00:00:00Z',
}))

// ── 新闻 ──────────────────────────────────────────────
export const MOCK_NEWS = [
  { id: 1,  ticker: 'NVDA', title: 'NVIDIA 发布 Blackwell Ultra GPU，AI 训练性能提升3倍', url: '#', source: 'Reuters', published_at: dayjs().subtract(2, 'hour').toISOString(), summary: 'NVIDIA新一代GPU大幅提升AI训练效率，预计2026Q3量产', sentiment: 'bullish', impact_level: 'high', time_horizon: 'medium', key_point: '性能提升3倍，预计 Q3 量产', llm_processed: true, created_at: dayjs().toISOString() },
  { id: 2,  ticker: 'AMD',  title: 'AMD MI400 系列规格曝光，直接对标 NVIDIA H200', url: '#', source: 'AnandTech', published_at: dayjs().subtract(5, 'hour').toISOString(), summary: 'AMD下一代AI加速器规格浮出水面，竞争格局加剧', sentiment: 'bullish', impact_level: 'medium', time_horizon: 'long', key_point: '192GB HBM4，目标2027年量产', llm_processed: true, created_at: dayjs().toISOString() },
  { id: 3,  ticker: 'TSM',  title: '台积电 2nm 良率突破 70%，提前实现量产目标', url: '#', source: 'DigiTimes', published_at: dayjs().subtract(8, 'hour').toISOString(), summary: '2nm工艺良率提升超预期，Q4量产计划维持', sentiment: 'bullish', impact_level: 'high', time_horizon: 'medium', key_point: '良率70%，超原定60%目标', llm_processed: true, created_at: dayjs().toISOString() },
  { id: 4,  ticker: null,   title: '美联储官员暗示2026年可能降息两次，利率路径明朗', url: '#', source: 'Bloomberg', published_at: dayjs().subtract(10, 'hour').toISOString(), summary: '美联储鸽派信号增强，科技股估值压力缓解', sentiment: 'bullish', impact_level: 'high', time_horizon: 'medium', key_point: '2026年降息2次，概率升至65%', llm_processed: true, created_at: dayjs().toISOString() },
  { id: 5,  ticker: 'ASML', title: 'ASML Q1 订单量超预期，EUV 积压订单创历史新高', url: '#', source: 'FT', published_at: dayjs().subtract(1, 'day').toISOString(), summary: 'ASML季度新增订单超分析师预期40%', sentiment: 'bullish', impact_level: 'high', time_horizon: 'long', key_point: '新订单 €78亿，超预期 €56亿', llm_processed: true, created_at: dayjs().toISOString() },
  { id: 6,  ticker: 'INTC', title: 'Intel 18A 工艺客户流失，与 TSMC 差距拉大', url: '#', source: 'WSJ', published_at: dayjs().subtract(1, 'day').toISOString(), summary: 'Intel代工业务受挫，主要客户转向台积电', sentiment: 'bearish', impact_level: 'high', time_horizon: 'medium', key_point: '两家大客户取消 18A 试产订单', llm_processed: true, created_at: dayjs().toISOString() },
  { id: 7,  ticker: 'SMCI', title: 'Super Micro 财报延迟问题解决，审计恢复正常', url: '#', source: 'MarketWatch', published_at: dayjs().subtract(2, 'day').toISOString(), summary: 'SMCI合规问题基本解决，股票有望重新纳入指数', sentiment: 'bullish', impact_level: 'medium', time_horizon: 'short', key_point: '审计委员会已完成独立审查', llm_processed: true, created_at: dayjs().toISOString() },
  { id: 8,  ticker: null,   title: 'VIX 跌破 18，市场风险偏好回升至今年高点', url: '#', source: 'CNBC', published_at: dayjs().subtract(3, 'day').toISOString(), summary: '市场波动率显著下降，投资者情绪明显改善', sentiment: 'bullish', impact_level: 'medium', time_horizon: 'short', key_point: 'VIX 17.8，年内新低', llm_processed: true, created_at: dayjs().toISOString() },
  { id: 9,  ticker: 'NVDA', title: 'Jensen Huang：数据中心AI基建投资将持续10年', url: '#', source: 'NVIDIA IR', published_at: dayjs().subtract(3, 'day').toISOString(), summary: 'CEO 维持对AI长期需求的强烈看好，预期不变', sentiment: 'bullish', impact_level: 'medium', time_horizon: 'long', key_point: '预计未来10年AI基建投资超$10万亿', llm_processed: true, created_at: dayjs().toISOString() },
  { id: 10, ticker: 'LRCX', title: 'Lam Research 预警中国出口管制影响，Q2营收指引低于预期', url: '#', source: 'Seeking Alpha', published_at: dayjs().subtract(4, 'day').toISOString(), summary: '出口管制收紧对设备商收入产生短期压力', sentiment: 'bearish', impact_level: 'medium', time_horizon: 'short', key_point: 'Q2 指引营收 $43亿，低于预期 $47亿', llm_processed: true, created_at: dayjs().toISOString() },
]

// ── 期权数据 ──────────────────────────────────────────
export function getMockOptions(ticker) {
  const base = STOCK_INFO[ticker]?.base ?? 100
  return [
    {
      id: 1, ticker, snapshot_date: dayjs().format('YYYY-MM-DD'),
      expiry_date: dayjs().add(14, 'day').format('YYYY-MM-DD'),
      iv_atm: 0.52, iv_rank: 68.4, iv_percentile: 71.2,
      put_call_ratio: 0.87, implied_move: 7.3,
      created_at: dayjs().toISOString(),
    },
    {
      id: 2, ticker, snapshot_date: dayjs().format('YYYY-MM-DD'),
      expiry_date: dayjs().add(42, 'day').format('YYYY-MM-DD'),
      iv_atm: 0.48, iv_rank: 61.0, iv_percentile: 64.5,
      put_call_ratio: 0.92, implied_move: 10.1,
      created_at: dayjs().toISOString(),
    },
  ]
}

// ── 催化剂 ─────────────────────────────────────────────
export const MOCK_CATALYSTS = [
  { id: 1, ticker: 'NVDA', catalyst_type: 'earnings', event_name: 'NVIDIA Q2 FY2027 财报', event_date: dayjs().add(8, 'day').format('YYYY-MM-DD'), eps_estimate: 0.89, revenue_estimate: 44.5e9, implied_move: 0.089, user_thesis: '预计数据中心营收超指引，Blackwell 供给约束解除是关键看点', actual_eps: null, actual_revenue: null, price_reaction: null, created_at: dayjs().toISOString(), updated_at: dayjs().toISOString() },
  { id: 2, ticker: 'AMD',  catalyst_type: 'earnings', event_name: 'AMD Q2 2026 财报',    event_date: dayjs().add(12, 'day').format('YYYY-MM-DD'), eps_estimate: 0.72, revenue_estimate: 7.8e9,  implied_move: 0.072, user_thesis: null, actual_eps: null, actual_revenue: null, price_reaction: null, created_at: dayjs().toISOString(), updated_at: dayjs().toISOString() },
  { id: 3, ticker: null,   catalyst_type: 'macro',    event_name: 'FOMC 利率决议',         event_date: dayjs().add(3, 'day').format('YYYY-MM-DD'),  eps_estimate: null, revenue_estimate: null, implied_move: null, user_thesis: '预期维持不变，但点阵图可能下修，关注鲍威尔新闻发布会措辞', actual_eps: null, actual_revenue: null, price_reaction: null, created_at: dayjs().toISOString(), updated_at: dayjs().toISOString() },
  { id: 4, ticker: 'TSM',  catalyst_type: 'earnings', event_name: 'TSMC Q2 2026 法说会',  event_date: dayjs().add(18, 'day').format('YYYY-MM-DD'), eps_estimate: 2.14, revenue_estimate: 28.5e9, implied_move: 0.054, user_thesis: null, actual_eps: null, actual_revenue: null, price_reaction: null, created_at: dayjs().toISOString(), updated_at: dayjs().toISOString() },
  { id: 5, ticker: 'ASML', catalyst_type: 'earnings', event_name: 'ASML Q2 2026 财报',   event_date: dayjs().add(22, 'day').format('YYYY-MM-DD'), eps_estimate: 6.4,  revenue_estimate: 8.2e9,  implied_move: 0.062, user_thesis: null, actual_eps: null, actual_revenue: null, price_reaction: null, created_at: dayjs().toISOString(), updated_at: dayjs().toISOString() },
  { id: 6, ticker: null,   catalyst_type: 'macro',    event_name: 'CPI 通胀数据公布',      event_date: dayjs().add(5, 'day').format('YYYY-MM-DD'),  eps_estimate: null, revenue_estimate: null, implied_move: null, user_thesis: null, actual_eps: null, actual_revenue: null, price_reaction: null, created_at: dayjs().toISOString(), updated_at: dayjs().toISOString() },
]

// ── Capex 数据 ─────────────────────────────────────────
export const MOCK_CAPEX = [
  { id: 1, company: 'MSFT', fiscal_quarter: 'Q3 2025', capex_billion: 21.4, yoy_growth: 0.78, notes: null },
  { id: 2, company: 'GOOG', fiscal_quarter: 'Q3 2025', capex_billion: 17.2, yoy_growth: 0.91, notes: null },
  { id: 3, company: 'META', fiscal_quarter: 'Q3 2025', capex_billion: 10.9, yoy_growth: 1.12, notes: null },
  { id: 4, company: 'AMZN', fiscal_quarter: 'Q3 2025', capex_billion: 26.3, yoy_growth: 0.64, notes: null },
  { id: 5, company: 'MSFT', fiscal_quarter: 'Q4 2025', capex_billion: 24.1, yoy_growth: 0.82, notes: null },
  { id: 6, company: 'GOOG', fiscal_quarter: 'Q4 2025', capex_billion: 19.8, yoy_growth: 0.95, notes: null },
  { id: 7, company: 'META', fiscal_quarter: 'Q4 2025', capex_billion: 13.7, yoy_growth: 1.21, notes: null },
  { id: 8, company: 'AMZN', fiscal_quarter: 'Q4 2025', capex_billion: 29.4, yoy_growth: 0.71, notes: null },
  { id: 9, company: 'MSFT', fiscal_quarter: 'Q1 2026', capex_billion: 28.0, yoy_growth: 0.87, notes: null },
  { id: 10,company: 'GOOG', fiscal_quarter: 'Q1 2026', capex_billion: 22.5, yoy_growth: 1.01, notes: null },
  { id: 11,company: 'META', fiscal_quarter: 'Q1 2026', capex_billion: 16.1, yoy_growth: 1.35, notes: null },
  { id: 12,company: 'AMZN', fiscal_quarter: 'Q1 2026', capex_billion: 33.0, yoy_growth: 0.79, notes: null },
]

// ── 交易记录 ──────────────────────────────────────────
export const MOCK_TRADES = [
  { id: 1, user_id: 1, ticker: 'NVDA', direction: 'long', instrument: 'call', option_strike: 850, option_expiry: '2026-06-20', entry_date: '2026-04-15', entry_price: 28.5, position_size: 5, exit_date: '2026-05-01', exit_price: 52.0, pnl: 117.5, pnl_pct: 82.5, catalyst_type: 'earnings', thesis: '财报前IV低，Blackwell出货预期强，买虚值Call，目标财报当天平仓', tech_signals: ['rsi_oversold', 'volume_spike'], macro_context: 'FOMC已过，利率预期稳定，风险偏好回升', outcome_notes: '财报超预期，股价当天涨12%，期权涨幅超预期', lesson: '期权时间价值在催化剂前2周买入最优，太早会被IV crush吃掉', rating: 5, created_at: '2026-04-15T10:00:00Z', updated_at: '2026-05-01T16:30:00Z' },
  { id: 2, user_id: 1, ticker: 'INTC', direction: 'short', instrument: 'stock', option_strike: null, option_expiry: null, entry_date: '2026-03-20', entry_price: 24.5, position_size: 200, exit_date: '2026-04-10', exit_price: 21.8, pnl: 540, pnl_pct: 11.0, catalyst_type: 'industry', thesis: '18A工艺客户流失消息未被市场充分定价，基本面持续恶化，做空', tech_signals: ['breakout', 'macd_cross'], macro_context: '设备股走强反衬Intel相对弱势', outcome_notes: '客户流失新闻在进场2周后才被WSJ报道，判断正确但timing运气成分大', lesson: '做空要更严格控制仓位，止损纪律很重要', rating: 3, created_at: '2026-03-20T09:00:00Z', updated_at: '2026-04-10T15:00:00Z' },
  { id: 3, user_id: 1, ticker: 'TSM', direction: 'long', instrument: 'stock', option_strike: null, option_expiry: null, entry_date: '2026-05-10', entry_price: 168.5, position_size: 50, exit_date: null, exit_price: null, pnl: null, pnl_pct: null, catalyst_type: 'earnings', thesis: '2nm良率超预期消息，Q2法说会前布局，持有到财报', tech_signals: ['support_bounce', 'volume_spike'], macro_context: 'DXY走弱利好台股ADR', outcome_notes: null, lesson: null, rating: null, created_at: '2026-05-10T10:00:00Z', updated_at: '2026-05-10T10:00:00Z' },
]

export const MOCK_TRADE_STATS = {
  total_trades: 3,
  open_trades: 1,
  closed_trades: 2,
  win_rate: 100,
  avg_pnl: 328.75,
  total_pnl: 657.5,
  best_trade_pnl: 540,
  worst_trade_pnl: 117.5,
  avg_rating: 4.0,
}

// ── 供应链 ─────────────────────────────────────────────
// 平铺数组，supply_chain_layer 字段与 SupplyChainMap 组件匹配
export const MOCK_SUPPLY_CHAIN = [
  { ticker: 'MSFT', name: 'Microsoft',         supply_chain_layer: 'cloud',     description: 'Azure云平台，AI服务' },
  { ticker: 'AMZN', name: 'Amazon',            supply_chain_layer: 'cloud',     description: 'AWS云平台，AI推理' },
  { ticker: 'GOOG', name: 'Alphabet',          supply_chain_layer: 'cloud',     description: 'Google Cloud，TPU自研' },
  { ticker: 'NVDA', name: 'NVIDIA',            supply_chain_layer: 'chips',     description: 'GPU加速器，AI训练/推理首选' },
  { ticker: 'AMD',  name: 'AMD',               supply_chain_layer: 'chips',     description: 'CPU/GPU (MI300系列)' },
  { ticker: 'INTC', name: 'Intel',             supply_chain_layer: 'chips',     description: 'CPU、代工服务(18A工艺)' },
  { ticker: 'QCOM', name: 'Qualcomm',          supply_chain_layer: 'chips',     description: '移动SoC、边缘AI芯片' },
  { ticker: 'TSM',  name: 'TSMC',              supply_chain_layer: 'materials', description: '全球领先晶圆代工，占AI芯片90%+' },
  { ticker: 'ASML', name: 'ASML',              supply_chain_layer: 'equipment', description: 'EUV光刻机，技术垄断' },
  { ticker: 'AMAT', name: 'Applied Materials', supply_chain_layer: 'equipment', description: '沉积、刻蚀、CMP设备' },
  { ticker: 'LRCX', name: 'Lam Research',      supply_chain_layer: 'equipment', description: '刻蚀和薄膜沉积设备' },
  { ticker: 'KLAC', name: 'KLA Corp',          supply_chain_layer: 'equipment', description: '工艺控制和良率管理' },
]

// ── Baskets ───────────────────────────────────────────
export const MOCK_BASKETS = [
  { id: 1, user_id: 1, name: 'AI算力基础设施', description: 'AI compute infrastructure', tickers: ['NVDA', 'AMD', 'MSFT', 'AMZN'], color: '#3b82f6', created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
  { id: 2, user_id: 1, name: '半导体设备', description: 'Semiconductor equipment', tickers: ['ASML', 'AMAT', 'LRCX'], color: '#10b981', created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
]

export function genBasketPerformance(basket, days = 30) {
  const tickers = basket.tickers ?? []
  return {
    basket_id: basket.id,
    basket_name: basket.name,
    days,
    items: tickers.map((ticker) => {
      const changeBase = (Math.random() - 0.4) * 40
      const dates = []
      const normalized = []
      for (let i = 0; i < days; i++) {
        const d = new Date(); d.setDate(d.getDate() - (days - i))
        dates.push(d.toISOString().slice(0, 10))
        normalized.push(parseFloat((100 + changeBase * (i / days) + (Math.random() - 0.5) * 5).toFixed(2)))
      }
      const change_pct = parseFloat((normalized[normalized.length - 1] - 100).toFixed(2))
      return { ticker, dates, normalized, latest_price: parseFloat((100 + Math.random() * 400).toFixed(2)), change_pct, relative_strength: null }
    }),
  }
}

// ── Auth ──────────────────────────────────────────────
export const MOCK_AUTH = {
  access_token: 'mock-jwt-token-for-ui-preview',
  token_type: 'bearer',
  user_id: 1,
  username: 'demo',
}
