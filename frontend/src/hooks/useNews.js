import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { newsApi } from '../api/index'

export function useNews(ticker, limit = 20) {
  return useQuery({
    queryKey: ['news', ticker, limit],
    queryFn: () => newsApi.getLatest(ticker, limit),
    staleTime: 5 * 60_000,
    refetchInterval: 10 * 60_000,
  })
}

export function useRefreshNews() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: newsApi.refresh,
    onSuccess: () => {
      setTimeout(() => qc.invalidateQueries({ queryKey: ['news'] }), 3000)
    },
  })
}
