import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { tradesApi } from '../api/index'

export function useTrades() {
  return useQuery({
    queryKey: ['trades'],
    queryFn: tradesApi.getAll,
    staleTime: 30_000,
  })
}

export function useTradeStats() {
  return useQuery({
    queryKey: ['trades', 'stats'],
    queryFn: tradesApi.getStats,
    staleTime: 30_000,
  })
}

export function useCreateTrade() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: tradesApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['trades'] }),
  })
}

export function useUpdateTrade() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => tradesApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['trades'] }),
  })
}

export function useDeleteTrade() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: tradesApi.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['trades'] }),
  })
}
