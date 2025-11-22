import api from '@/lib/api'
import type { User } from '@/types/user'

export interface Organization {
  id: number
  name: string
  tagline: string | null
  address: string | null
  vat_tax_number: string | null
  website: string | null
  timezone: string | null
  phone: string | null
  email: string | null
  logo_url: string | null
  created_at: string
  updated_at: string
}

export interface OrganizationUpdate {
  name?: string
  tagline?: string | null
  address?: string | null
  vat_tax_number?: string | null
  website?: string | null
  timezone?: string | null
  phone?: string | null
  email?: string | null
  logo_url?: string | null
}

export interface Integration {
  id: number
  name: string
  enabled: boolean
  config: Record<string, any> | null
  created_at: string
  updated_at: string
}

export interface IntegrationUpdate {
  enabled?: boolean
  config?: Record<string, any> | null
}

export interface UserCreate {
  email: string
  full_name: string
  user_type: string
  // Password is auto-generated, not required
}

export const settingsService = {
  // Account
  async getAccount(): Promise<User> {
    const response = await api.get<User>('/api/settings/account')
    return response.data
  },

  // Organization
  async getOrganization(): Promise<Organization> {
    const response = await api.get<Organization>('/api/settings/organization')
    return response.data
  },

  async updateOrganization(data: OrganizationUpdate): Promise<Organization> {
    const response = await api.put<Organization>('/api/settings/organization', data)
    return response.data
  },

  // Integrations
  async getIntegrations(): Promise<Integration[]> {
    const response = await api.get<Integration[]>('/api/settings/integrations')
    return response.data
  },

  async getIntegration(name: string): Promise<Integration> {
    const response = await api.get<Integration>(`/api/settings/integrations/${name}`)
    return response.data
  },

  async updateIntegration(name: string, data: IntegrationUpdate): Promise<Integration> {
    const response = await api.put<Integration>(`/api/settings/integrations/${name}`, data)
    return response.data
  },

  // User Management
  async getUsers(): Promise<User[]> {
    const response = await api.get<User[]>('/api/settings/users')
    return response.data
  },

  async createUser(user: UserCreate): Promise<User> {
    const response = await api.post<User>('/api/settings/users', user)
    return response.data
  },

  async suspendUser(userId: number): Promise<User> {
    const response = await api.put<User>(`/api/settings/users/${userId}/suspend`)
    return response.data
  },

  async activateUser(userId: number): Promise<User> {
    const response = await api.put<User>(`/api/settings/users/${userId}/activate`)
    return response.data
  },

  async deleteUser(userId: number): Promise<void> {
    await api.delete(`/api/settings/users/${userId}`)
  },

  // Logo upload
  async uploadLogo(file: File): Promise<Organization> {
    const formData = new FormData()
    formData.append('file', file)
    const response = await api.post<Organization>('/api/organization/logo', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },
}

