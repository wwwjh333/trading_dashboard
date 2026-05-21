/**
 * Central API export.
 * Set VITE_MOCK=true in .env.local to use mock data (no backend needed).
 */
import * as mockModule from './mockClient.js'
import { macroApi as realMacro } from './macro.js'
import { stocksApi as realStocks } from './stocks.js'
import { newsApi as realNews } from './news.js'
import { optionsApi as realOptions } from './options.js'
import { catalystsApi as realCatalysts } from './catalysts.js'
import { tradesApi as realTrades, authApi as realAuth } from './trades.js'
import { basketsApi as realBaskets } from './baskets.js'
import client from './client.js'

const isMock = import.meta.env.VITE_MOCK === 'true'

const realIndustry = {
  getSupplyChain: () => client.get('/industry/supply-chain').then((r) => r.data),
  getCapex:       () => client.get('/industry/capex').then((r) => r.data),
}

export const macroApi     = isMock ? mockModule.macroApi     : realMacro
export const stocksApi    = isMock ? mockModule.stocksApi    : realStocks
export const newsApi      = isMock ? mockModule.newsApi      : realNews
export const optionsApi   = isMock ? mockModule.optionsApi   : realOptions
export const catalystsApi = isMock ? mockModule.catalystsApi : realCatalysts
export const tradesApi    = isMock ? mockModule.tradesApi    : realTrades
export const authApi      = isMock ? mockModule.authApi      : realAuth
export const industryApi  = isMock ? mockModule.industryApi  : realIndustry
export const basketsApi   = isMock ? mockModule.basketsApi   : realBaskets
