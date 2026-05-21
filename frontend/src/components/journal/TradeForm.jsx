import { useForm } from 'react-hook-form'
import { useCreateTrade, useUpdateTrade } from '../../hooks/useTrades'

const TECH_SIGNAL_OPTIONS = [
  { value: 'rsi_oversold', label: 'RSI超卖' },
  { value: 'rsi_overbought', label: 'RSI超买' },
  { value: 'volume_spike', label: '成交量异常' },
  { value: 'breakout', label: '突破关键位' },
  { value: 'macd_cross', label: 'MACD金叉/死叉' },
  { value: 'bb_squeeze', label: 'BB收窄' },
  { value: 'support_bounce', label: '支撑位反弹' },
  { value: 'trend_reversal', label: '趋势逆转' },
]

export default function TradeForm({ onClose, existingTrade = null }) {
  const createTrade = useCreateTrade()
  const updateTrade = useUpdateTrade()

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: existingTrade
      ? {
          ticker: existingTrade.ticker,
          direction: existingTrade.direction,
          instrument: existingTrade.instrument,
          entry_date: existingTrade.entry_date,
          entry_price: existingTrade.entry_price,
          position_size: existingTrade.position_size,
          catalyst_type: existingTrade.catalyst_type ?? '',
          thesis: existingTrade.thesis,
          macro_context: existingTrade.macro_context ?? '',
        }
      : {
          direction: 'long',
          instrument: 'stock',
          entry_date: new Date().toISOString().split('T')[0],
        },
  })

  const instrument = watch('instrument')

  const onSubmit = async (data) => {
    const payload = {
      ...data,
      entry_price: parseFloat(data.entry_price),
      position_size: parseFloat(data.position_size),
      ticker: data.ticker.toUpperCase(),
      tech_signals: data.tech_signals ?? [],
    }
    if (instrument !== 'stock') {
      payload.option_strike = data.option_strike ? parseFloat(data.option_strike) : undefined
      payload.option_expiry = data.option_expiry || undefined
    }

    try {
      if (existingTrade) {
        await updateTrade.mutateAsync({ id: existingTrade.id, data: payload })
      } else {
        await createTrade.mutateAsync(payload)
      }
      onClose()
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-400 block mb-1">标的 *</label>
          <input {...register('ticker', { required: true })} placeholder="NVDA" className="input-field uppercase" />
        </div>
        <div>
          <label className="text-xs text-gray-400 block mb-1">方向 *</label>
          <select {...register('direction')} className="input-field">
            <option value="long">做多 Long</option>
            <option value="short">做空 Short</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-400 block mb-1">工具 *</label>
          <select {...register('instrument')} className="input-field">
            <option value="stock">股票</option>
            <option value="call">Call期权</option>
            <option value="put">Put期权</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-400 block mb-1">催化剂类型</label>
          <select {...register('catalyst_type')} className="input-field">
            <option value="">无</option>
            <option value="earnings">财报</option>
            <option value="macro">宏观</option>
            <option value="industry">行业</option>
            <option value="technical">技术</option>
          </select>
        </div>
      </div>

      {instrument !== 'stock' && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-400 block mb-1">行权价</label>
            <input {...register('option_strike')} type="number" step="0.5" placeholder="150.00" className="input-field" />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">到期日</label>
            <input {...register('option_expiry')} type="date" className="input-field" />
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-xs text-gray-400 block mb-1">进场日期 *</label>
          <input {...register('entry_date', { required: true })} type="date" className="input-field" />
        </div>
        <div>
          <label className="text-xs text-gray-400 block mb-1">进场价格 *</label>
          <input {...register('entry_price', { required: true })} type="number" step="0.01" placeholder="500.00" className="input-field" />
        </div>
        <div>
          <label className="text-xs text-gray-400 block mb-1">仓位大小 *</label>
          <input {...register('position_size', { required: true })} type="number" step="1" placeholder="100" className="input-field" />
        </div>
      </div>

      <div>
        <label className="text-xs text-gray-400 block mb-1">进场逻辑 * (必填)</label>
        <textarea
          {...register('thesis', { required: true })}
          rows={3}
          placeholder="为什么进场？催化剂是什么？预期目标价？"
          className="input-field resize-none"
        />
        {errors.thesis && <p className="text-accent-red text-xs mt-1">进场逻辑为必填项</p>}
      </div>

      <div>
        <label className="text-xs text-gray-400 block mb-2">技术信号（可多选）</label>
        <div className="flex flex-wrap gap-2">
          {TECH_SIGNAL_OPTIONS.map((opt) => (
            <label key={opt.value} className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" value={opt.value} {...register('tech_signals')} className="accent-accent-blue" />
              <span className="text-xs text-gray-300">{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs text-gray-400 block mb-1">宏观背景</label>
        <input {...register('macro_context')} placeholder="当前市场环境简述…" className="input-field" />
      </div>

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
          {isSubmitting ? '提交中…' : existingTrade ? '更新' : '记录交易'}
        </button>
        <button type="button" onClick={onClose} className="btn-secondary">
          取消
        </button>
      </div>
    </form>
  )
}
