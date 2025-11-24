import api from '@/lib/api'

export interface OverviewStats {
  users: {
    total: number
    active: number
    by_type: Record<string, number>
  }
  logins: {
    total_successful: number
    total_failed: number
    successful_24h: number
    failed_24h: number
  }
  requests: {
    total: number
    last_24h: number
  }
  errors: {
    '500_internal_server_error': { total: number; last_24h: number }
    '401_unauthorized': { total: number; last_24h: number }
    '403_forbidden': { total: number; last_24h: number }
    '404_not_found': { total: number; last_24h: number }
  }
  business: {
    customers: number
    samples: number
    projects: number
    result_entries: number
    reports: number
  }
}

export interface LoginHistoryItem {
  id: number
  user_id: number | null
  user_name: string | null
  email: string
  success: boolean
  ip_address: string | null
  user_agent: string | null
  failure_reason: string | null
  created_at: string
}

export interface LoginHistoryResponse {
  total: number
  items: LoginHistoryItem[]
}

export interface SecurityTelemetry {
  period_days: number
  failed_logins: {
    total: number
    by_reason: Record<string, number>
    by_ip: Record<string, number>
    recent: Array<{
      id: number
      email: string
      ip_address: string | null
      failure_reason: string | null
      user_agent: string | null
      created_at: string
    }>
  }
  status_codes: Record<string, number>
  error_requests: Array<{
    id: number
    method: string
    path: string
    status_code: number
    user_id: number | null
    ip_address: string | null
    error_message: string | null
    created_at: string
  }>
}

export interface ChartDataPoint {
  date: string
  successful: number
  failed: number
}

export interface RequestChartDataPoint {
  date: string
  status_codes: Record<string, number>
  total: number
}

export interface UserForImpersonation {
  id: number
  email: string
  full_name: string
  user_type: string
  is_active: boolean
}

export interface ImpersonationResponse {
  access_token: string
  token_type: string
  impersonated_user: {
    id: number
    email: string
    full_name: string
    user_type: string
  }
  impersonation_id: number
}

export interface ImpersonationStatus {
  is_impersonating: boolean
  impersonation_id?: number
  impersonated_user?: {
    id: number
    email: string
    full_name: string
    user_type: string
  }
  started_at?: string
  reason?: string
}

export interface ImpersonationHistoryItem {
  id: number
  impersonated_user: {
    id: number
    email: string
    full_name: string
  }
  started_at: string
  ended_at: string | null
  reason: string | null
  duration_seconds: number | null
}

export const analyticsService = {
  async getOverviewStats(): Promise<OverviewStats> {
    const response = await api.get<OverviewStats>('/api/analytics/stats/overview')
    return response.data
  },

  async getLoginHistory(params: {
    skip?: number
    limit?: number
    success_only?: boolean
    failed_only?: boolean
    user_id?: number
    start_date?: string
    end_date?: string
  }): Promise<LoginHistoryResponse> {
    const response = await api.get<LoginHistoryResponse>('/api/analytics/logins/history', { params })
    return response.data
  },

  async getSecurityTelemetry(days: number = 7): Promise<SecurityTelemetry> {
    const response = await api.get<SecurityTelemetry>('/api/analytics/security/telemetry', {
      params: { days }
    })
    return response.data
  },

  async getLoginChartData(days: number = 7): Promise<ChartDataPoint[]> {
    const response = await api.get<ChartDataPoint[]>('/api/analytics/logins/chart', {
      params: { days }
    })
    return response.data
  },

  async getRequestsChartData(days: number = 7): Promise<RequestChartDataPoint[]> {
    const response = await api.get<RequestChartDataPoint[]>('/api/analytics/requests/chart', {
      params: { days }
    })
    return response.data
  },

  async getUsersForImpersonation(): Promise<UserForImpersonation[]> {
    const response = await api.get<UserForImpersonation[]>('/api/analytics/users/list')
    return response.data
  },

  async startImpersonation(userId: number, reason?: string): Promise<ImpersonationResponse> {
    const response = await api.post<ImpersonationResponse>(`/api/analytics/impersonate/${userId}`, {
      reason: reason || null
    })
    if (response.data.access_token) {
      localStorage.setItem('access_token', response.data.access_token)
    }
    return response.data
  },

  async endImpersonation(): Promise<{ access_token: string; token_type: string; message: string }> {
    const response = await api.post<{ access_token: string; token_type: string; message: string }>('/api/analytics/impersonate/end')
    if (response.data.access_token) {
      localStorage.setItem('access_token', response.data.access_token)
    }
    return response.data
  },

  async getImpersonationStatus(): Promise<ImpersonationStatus> {
    const response = await api.get<ImpersonationStatus>('/api/analytics/impersonate/status')
    return response.data
  },

  async getImpersonationHistory(skip: number = 0, limit: number = 50): Promise<{
    total: number
    items: ImpersonationHistoryItem[]
  }> {
    const response = await api.get('/api/analytics/impersonate/history', {
      params: { skip, limit }
    })
    return response.data
  },
}

