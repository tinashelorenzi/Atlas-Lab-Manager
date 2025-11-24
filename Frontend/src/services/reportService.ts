import api from '@/lib/api'

export enum ReportStatus {
  PROPOSED = 'proposed',
  VALIDATED = 'validated',
  FINALIZED = 'finalized',
}

export interface Report {
  id: number
  result_entry_id: number
  report_number: string
  status: ReportStatus
  generated_at: string
  generated_by_id: number
  generated_by_name: string
  amended_at: string | null
  amended_by_id: number | null
  amended_by_name: string | null
  validated_at: string | null
  validated_by_id: number | null
  validated_by_name: string | null
  finalized_at: string | null
  finalized_by_id: number | null
  finalized_by_name: string | null
  fingerprint: string | null
  view_key: string | null
  notes: string | null
  sample_id_code: string
  sample_name: string
  customer_name: string
  created_at: string
  updated_at: string
  report_data?: Record<string, any>
  result_entry?: Record<string, any>
}

export interface ReportCreate {
  result_entry_id: number
  notes?: string | null
}

export const reportService = {
  async create(report: ReportCreate): Promise<Report> {
    const response = await api.post<Report>('/api/reports/', report)
    return response.data
  },

  async getProposed(): Promise<Report[]> {
    const response = await api.get<Report[]>('/api/reports/proposed')
    return response.data
  },

  async getFinalized(): Promise<Report[]> {
    const response = await api.get<Report[]>('/api/reports/finalized')
    return response.data
  },

  async getById(id: number): Promise<Report> {
    const response = await api.get<Report>(`/api/reports/${id}`)
    return response.data
  },

  async validate(id: number): Promise<Report> {
    const response = await api.post<Report>(`/api/reports/${id}/validate`)
    return response.data
  },

  async finalize(id: number): Promise<Report> {
    const response = await api.post<Report>(`/api/reports/${id}/finalize`)
    return response.data
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/api/reports/${id}`)
  },

  getDocumentUrl(id: number): string {
    return `${api.defaults.baseURL}/api/reports/${id}/document`
  },

  async getDocumentHtml(id: number): Promise<string> {
    const response = await api.get<string>(`/api/reports/${id}/document`, {
      responseType: 'text',
      headers: {
        'Accept': 'text/html',
      },
    })
    return response.data
  },

  async getPdf(id: number): Promise<Blob> {
    const response = await api.get(`/api/reports/${id}/pdf`, {
      responseType: 'blob',
    })
    return response.data
  },

  async sendToCustomer(id: number): Promise<Report> {
    const response = await api.post<Report>(`/api/reports/${id}/send-to-customer`)
    return response.data
  },

  async getPublicReport(sampleId: string, viewKey: string): Promise<Report> {
    // Public endpoint - don't use authenticated API instance
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
    const response = await fetch(
      `${API_BASE_URL}/api/reports/public/view?sample_id=${encodeURIComponent(sampleId)}&view_key=${encodeURIComponent(viewKey)}`
    )
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Failed to fetch report' }))
      throw { response: { data: error, status: response.status } }
    }
    return response.json()
  },

  getPublicPdfUrl(reportId: number, viewKey: string): string {
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
    return `${API_BASE_URL}/api/reports/public/${reportId}/pdf?view_key=${encodeURIComponent(viewKey)}`
  },
}

