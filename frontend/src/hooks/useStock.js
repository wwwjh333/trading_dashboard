import { useQuery, useQueries } from '@tanstack/react-query'
import { stocksApi } from '../api/index'

export function useStockList() {
  return useQuery({
    queryKey: ['stocks', 'list'],
    queryFn: stocksApi.getList,
    staleTime: 60 * 60_000,
  })
}

export function useStockPrice(ticker, days = 90) {
  return useQuery({
    queryKey: ['stocks', 'price', ticker, days],
    queryFn: () => stocksApi.getPrice(ticker, days),
    staleTime: 15 * 60_000,
    enabled: !!ticker,
  })
}

export function useStockSummary(ticker) {
  return useQuery({
    queryKey: ['stocks', 'summary', ticker],
    queryFn: () => stocksApi.getSummary(ticker),
    staleTime: 5 * 60_000,
    enabled: !!ticker,
  })
}

/**
 * Fetch summaries for multiple tickers in parallel.
 * Returns { map: Record<string, summary>, isLoading: boolean }
 */
export function useMultiStockSummary(tickers = []) {
  const results = useQueries({
    queries: tickers.map((ticker) => ({
      queryKey: ['stocks', 'summary', ticker],
      queryFn: () => stocksApi.getSummary(ticker),
      staleTime: 5 * 60_000,
      retry: false,
    })),
  })

  const map = {}
  tickers.forEach((ticker, i) => {
    if (results[i]?.data) map[ticker] = results[i].data
  })

  return {
    map,
    isLoading: results.some((r) => r.isLoading),
  }
}
