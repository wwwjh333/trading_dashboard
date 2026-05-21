import { useQuery } from '@tanstack/react-query'
import { industryApi } from '../api/index'

export function useIndustry() {
  return useQuery({
    queryKey: ['industry', 'supplychain'],
    queryFn: industryApi.getSupplyChain,
    staleTime: 10 * 60_000,
  })
}

export function useCapex() {
  return useQuery({
    queryKey: ['industry', 'capex'],
    queryFn: industryApi.getCapex,
    staleTime: 60 * 60_000,
  })
}
