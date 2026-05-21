import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { basketsApi } from '../api/index'

export function useBaskets() {
  return useQuery({
    queryKey: ['baskets'],
    queryFn: basketsApi.getAll,
    staleTime: 30_000,
  })
}

export function useBasketPerformance(basketId, days = 30) {
  return useQuery({
    queryKey: ['baskets', 'performance', basketId, days],
    queryFn: () => basketsApi.getPerformance(basketId, days),
    staleTime: 15 * 60_000,
    enabled: !!basketId,
  })
}

export function useCreateBasket() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: basketsApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['baskets'] }),
  })
}

export function useUpdateBasket() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => basketsApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['baskets'] }),
  })
}

export function useDeleteBasket() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: basketsApi.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['baskets'] }),
  })
}
