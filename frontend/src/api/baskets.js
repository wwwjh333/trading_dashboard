import client from './client'

export const basketsApi = {
  getAll: () => client.get('/baskets').then((r) => r.data),
  create: (data) => client.post('/baskets', data).then((r) => r.data),
  update: (id, data) => client.put(`/baskets/${id}`, data).then((r) => r.data),
  remove: (id) => client.delete(`/baskets/${id}`),
  getPerformance: (id, days = 30) =>
    client.get(`/baskets/${id}/performance`, { params: { days } }).then((r) => r.data),
}
