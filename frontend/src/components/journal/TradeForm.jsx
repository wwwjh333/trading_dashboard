import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useCreateTrade, useUpdateTrade } from '../../hooks/useTrades'

const TECH_SIGNAL_KEYS = [
  'rsi_oversold',
  'rsi_overbought',
  'volume_spike',
  'breakout',
  'macd_cross',
  'bb_squeeze',
  'support_bounce',
  'trend_reversal',
]

export default function TradeForm({ onClose, existingTrade = null }) {
  const { t } = useTranslation()
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
          <label className="text-xs text-gray-400 block mb-1">{t('trades.ticker')} *</label>
          <input {...register('ticker', { required: true })} placeholder="NVDA" className="input-field uppercase" />
        </div>
        <div>
          <label className="text-xs text-gray-400 block mb-1">{t('trades.direction')} *</label>
          <select {...register('direction')} className="input-field">
            <option value="long">{t('trades.long')}</option>
            <option value="short">{t('trades.short')}</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-400 block mb-1">{t('trades.instrument')} *</label>
          <select {...register('instrument')} className="input-field">
            <option value="stock">{t('trades.stock')}</option>
            <option value="call">{t('trades.call')}</option>
            <option value="put">{t('trades.put')}</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-400 block mb-1">{t('trades.catalystType')}</label>
          <select {...register('catalyst_type')} className="input-field">
            <option value="">{t('common.none')}</option>
            <option value="earnings">{t('trades.earnings')}</option>
            <option value="macro">{t('trades.macro')}</option>
            <option value="industry">{t('trades.industry')}</option>
            <option value="technical">{t('trades.technical')}</option>
          </select>
        </div>
      </div>

      {instrument !== 'stock' && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-400 block mb-1">{t('trades.strike')}</label>
            <input {...register('option_strike')} type="number" step="0.5" placeholder="150.00" className="input-field" />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">{t('trades.expiry')}</label>
            <input {...register('option_expiry')} type="date" className="input-field" />
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-xs text-gray-400 block mb-1">{t('trades.entryDate')} *</label>
          <input {...register('entry_date', { required: true })} type="date" className="input-field" />
        </div>
        <div>
          <label className="text-xs text-gray-400 block mb-1">{t('trades.entryPrice')} *</label>
          <input {...register('entry_price', { required: true })} type="number" step="0.01" placeholder="500.00" className="input-field" />
        </div>
        <div>
          <label className="text-xs text-gray-400 block mb-1">{t('trades.positionSize')} *</label>
          <input {...register('position_size', { required: true })} type="number" step="1" placeholder="100" className="input-field" />
        </div>
      </div>

      <div>
        <label className="text-xs text-gray-400 block mb-1">{t('trades.thesis')} *</label>
        <textarea
          {...register('thesis', { required: true })}
          rows={3}
          placeholder={t('trades.thesisPlaceholder')}
          className="input-field resize-none"
        />
        {errors.thesis && <p className="text-accent-red text-xs mt-1">{t('trades.thesisRequired')}</p>}
      </div>

      <div>
        <label className="text-xs text-gray-400 block mb-2">{t('trades.techSignals')}</label>
        <div className="flex flex-wrap gap-2">
          {TECH_SIGNAL_KEYS.map((key) => (
            <label key={key} className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" value={key} {...register('tech_signals')} className="accent-accent-blue" />
              <span className="text-xs text-gray-300">{t(`trades.techSignalLabels.${key}`)}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs text-gray-400 block mb-1">{t('trades.macroContext')}</label>
        <input {...register('macro_context')} placeholder={t('trades.macroPlaceholder')} className="input-field" />
      </div>

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
          {isSubmitting ? t('common.submitting') : existingTrade ? t('trades.update') : t('trades.logTrade')}
        </button>
        <button type="button" onClick={onClose} className="btn-secondary">
          {t('common.cancel')}
        </button>
      </div>
    </form>
  )
}
