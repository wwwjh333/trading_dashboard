import client from './client'

export const macroApi = {
  getLatest: () => client.get('/macro/latest').then((r) => r.data),
  getHistory: (indicator, days = 90) =>
    client.get('/macro/history', { params: { indicator, days } }).then((r) => r.data),
}
