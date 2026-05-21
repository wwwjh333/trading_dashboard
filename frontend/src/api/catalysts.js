import client from './client'

export const catalystsApi = {
  getUpcoming: (days = 60, lookback = 30) =>
    client.get('/catalysts/upcoming', { params: { days, lookback } }).then((r) => r.data),
  getById: (id) => client.get(`/catalysts/${id}`).then((r) => r.data),
  create: (data) => client.post('/catalysts', data).then((r) => r.data),
  updateThesis: (id, user_thesis) =>
    client.put(`/catalysts/${id}/thesis`, { user_thesis }).then((r) => r.data),
  updateResult: (id, data) =>
    client.put(`/catalysts/${id}/result`, data).then((r) => r.data),
}
