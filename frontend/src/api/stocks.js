import client from './client'

export const stocksApi = {
  getList: () => client.get('/stocks/list').then((r) => r.data),
  getPrice: (ticker, days = 90) =>
    client.get(`/stocks/${ticker}/price`, { params: { days } }).then((r) => r.data),
  getSummary: (ticker) =>
    client.get(`/stocks/${ticker}/summary`).then((r) => r.data),
  addStock: (data) => client.post('/stocks', data).then((r) => r.data),
  removeStock: (ticker) => client.delete(`/stocks/${ticker}`),
  search: (q) => client.get('/stocks/search', { params: { q } }).then((r) => r.data),
}
