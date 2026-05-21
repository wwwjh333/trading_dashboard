import client from './client'

export const tradesApi = {
  getAll: () => client.get('/trades').then((r) => r.data),
  getStats: () => client.get('/trades/stats').then((r) => r.data),
  create: (data) => client.post('/trades', data).then((r) => r.data),
  update: (id, data) => client.put(`/trades/${id}`, data).then((r) => r.data),
  remove: (id) => client.delete(`/trades/${id}`),
}

export const authApi = {
  login: (username, password) =>
    client.post('/auth/login', { username, password }).then((r) => r.data),
  register: (username, password) =>
    client.post('/auth/register', { username, password }).then((r) => r.data),
}
