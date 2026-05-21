import client from './client'

export const newsApi = {
  getLatest: (ticker, limit = 20, offset = 0) =>
    client.get('/news/latest', { params: { ticker, limit, offset } }).then((r) => r.data),
  refresh: () => client.post('/news/refresh').then((r) => r.data),
}
