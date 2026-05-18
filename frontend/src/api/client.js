import axios from 'axios'

// In dev: Vite proxy forwards /api → localhost:8000
// In Docker: Nginx proxy forwards /api → backend:8000
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '' })

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export const auth = {
  register: (data) => api.post('/api/auth/register', data),
  login: (data) => api.post('/api/auth/login', data),
  me: () => api.get('/api/auth/me'),
}

export const content = {
  list: (params) => api.get('/api/content', { params }),
  get: (id) => api.get(`/api/content/${id}`),
  create: (data) => api.post('/api/content', data),
  delete: (id) => api.delete(`/api/content/${id}`),
  categories: () => api.get('/api/categories'),
}

export const recommendations = {
  get: (top_n = 10) => api.get('/api/recommendations', { params: { top_n } }),
}

export const interactions = {
  log: (data) => api.post('/api/interactions', data),
}

export const analytics = {
  get: () => api.get('/api/analytics'),
}

export const user = {
  profile: () => api.get('/api/user/profile'),
}

export default api
