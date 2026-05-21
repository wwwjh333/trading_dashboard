import { useQuery } from '@tanstack/react-query'
import { macroApi } from '../api/index'

export function useMacroLatest() {
  return useQuery({
    queryKey: ['macro', 'latest'],
    queryFn: macroApi.getLatest,
    staleTime: 5 * 60_000,
    refetchInterval: 5 * 60_000,
  })
}

export function useMacroHistory(indicator, days = 90) {
  return useQuery({
    queryKey: ['macro', 'history', indicator, days],
    queryFn: () => macroApi.getHistory(indicator, days),
    staleTime: 30 * 60_000,
    enabled: !!indicator,
  })
}
