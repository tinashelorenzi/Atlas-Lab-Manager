import api from '@/lib/api'
import type { User } from '@/types/user'

export interface LoginCredentials {
  username: string
  password: string
}

export interface LoginResponse {
  access_token: string
  token_type: string
}

export const authService = {
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const formData = new FormData()
    formData.append('username', credentials.username)
    formData.append('password', credentials.password)
    
    const response = await api.post<LoginResponse>('/api/auth/login', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    
    if (response.data.access_token) {
      localStorage.setItem('access_token', response.data.access_token)
    }
    
    return response.data
  },

  async getCurrentUser(): Promise<User> {
    const response = await api.get<User>('/api/auth/me')
    return response.data
  },

  logout(): void {
    localStorage.removeItem('access_token')
  },

  isAuthenticated(): boolean {
    return !!localStorage.getItem('access_token')
  },
}

