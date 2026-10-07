import axios, {
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios'

interface ApiEnvelope<T> {
  code: number
  msg?: string
  message?: string
  data: T
}

export class ApiError extends Error {
  code: number

  constructor(code: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.code = code
  }
}

const service = axios.create({
  baseURL: '/api/v1',
  timeout: 15000,
})

// 每个请求发出前，自动带上管理员 Token。
service.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('admin_token')

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

// 这里把 data 解包出来，所以页面只需要关心真正的业务数据。
service.interceptors.response.use(
  (response: AxiosResponse<ApiEnvelope<unknown>>) => {
    const result = response.data
    const successCodes = [0, 200]

    if (successCodes.includes(result.code)) {
      return result.data as never
    }

    return Promise.reject(
      new ApiError(result.code, result.message || result.msg || '请求失败'),
    )
  },
  (error) => {
    const status = error.response?.status as number | undefined
    const body = error.response?.data as
      | { code?: number; msg?: string; message?: string }
      | undefined
    const message =
      body?.msg ||
      body?.message ||
      (status === 401
        ? '登录状态已失效，请重新登录'
        : status === 404
          ? '后端还没有提供这个接口'
          : error.message || '网络请求失败')

    if (status === 401) {
      localStorage.removeItem('admin_token')
      localStorage.removeItem('admin_user')

      if (window.location.pathname !== '/admin/login') {
        const redirect = encodeURIComponent(
          `${window.location.pathname}${window.location.search}`,
        )
        window.location.assign(`/admin/login?redirect=${redirect}`)
      }
    }

    return Promise.reject(
      new ApiError(body?.code || status || -1, message),
    )
  },
)

export const request = {
  get<T>(url: string, config?: AxiosRequestConfig) {
    return service.get(url, config) as Promise<T>
  },
  post<T>(url: string, data?: unknown, config?: AxiosRequestConfig) {
    return service.post(url, data, config) as Promise<T>
  },
  put<T>(url: string, data?: unknown, config?: AxiosRequestConfig) {
    return service.put(url, data, config) as Promise<T>
  },
  patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig) {
    return service.patch(url, data, config) as Promise<T>
  },
  delete<T>(url: string, config?: AxiosRequestConfig) {
    return service.delete(url, config) as Promise<T>
  },
}
