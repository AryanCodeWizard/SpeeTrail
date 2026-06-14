import axios from 'axios'

const base = (typeof import !== 'undefined' && typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || 'http://localhost:4000'
const api = axios.create({
  baseURL: `${base.replace(/\/$/, '')}/api`
})

// Attach JWT to every request automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// If token expires, redirect to login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api