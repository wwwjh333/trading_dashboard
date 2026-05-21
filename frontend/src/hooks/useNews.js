import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { newsApi } from '../api/index'

const NEWS_PAGE_SIZE = 20

export function useNews(ticker, limit = 20) {
  return useQuery({
    queryKey: ['news', ticker, limit],
    queryFn: () => newsApi.getLatest(ticker, limit),
    staleTime: 5 * 60_000,
    refetchInterval: 10 * 60_000,
  })
}

export function useInfiniteNews(ticker) {
  return useInfiniteQuery({
    queryKey: ['news', 'infinite', ticker],
    queryFn: ({ pageParam }) => newsApi.getLatest(ticker, NEWS_PAGE_SIZE, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage, _allPages, lastPageParam) =>
      lastPage.length === NEWS_PAGE_SIZE ? lastPageParam + NEWS_PAGE_SIZE : undefined,
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
