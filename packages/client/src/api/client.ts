import axios, { type AxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/store/authStore'

interface RetryConfig extends AxiosRequestConfig {
  _retry?: boolean
}

export const apiClient = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
})

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) {
    config.headers = config.headers ?? {}
    config.headers['Authorization'] = `Bearer ${token}`
  }
  return config
})

let refreshPromise: Promise<{ accessToken: string }> | null = null

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as RetryConfig

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        if (!refreshPromise) {
          refreshPromise = axios
            .post<{ accessToken: string }>('/api/auth/refresh', {}, { withCredentials: true })
            .then((r) => r.data)
            .finally(() => {
              refreshPromise = null
            })
        }

        const data = await refreshPromise
        useAuthStore.setState({ accessToken: data.accessToken })
        originalRequest.headers = originalRequest.headers ?? {}
        originalRequest.headers['Authorization'] = `Bearer ${data.accessToken}`
        return apiClient(originalRequest)
      } catch {
        useAuthStore.getState().clearAuth()
        window.location.replace('/login')
      }
    }

    return Promise.reject(error)
  },
)
