import client from './client'

export const optionsApi = {
  getSnapshot: (ticker) => client.get(`/options/${ticker}`).then((r) => r.data),
  getHistory: (ticker, days = 30) =>
    client.get(`/options/${ticker}/history`, { params: { days } }).then((r) => r.data),
}
