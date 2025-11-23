import api from '@/lib/api'

export interface ResultValue {
  id: number
  result_entry_id: number
  test_type: string
  value: string
  unit: string | null
  unit_type: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface ResultEntry {
  id: number
  sample_id: number
  sample_id_code: string
  sample_name: string
  created_by_id: number
  created_by_name: string
  is_committed: boolean
  committed_at: string | null
  committed_by_id: number | null
  committed_by_name: string | null
  notes: string | null
  result_values: ResultValue[]
  created_at: string
  updated_at: string
  customer_name?: string
  project_name?: string | null
  sample_type_name?: string
}

export interface ResultEntryCreate {
  sample_id: number
  notes?: string | null
}

export interface ResultValueCreate {
  test_type: string
  value: string
  unit?: string | null
  unit_type?: string | null
  notes?: string | null
}

export interface ResultValueUpdate {
  test_type?: string
  value?: string
  unit?: string | null
  unit_type?: string | null
  notes?: string | null
}

export const resultEntryService = {
  async search(query: string): Promise<ResultEntry[]> {
    const response = await api.get<ResultEntry[]>('/api/result-entries/search', {
      params: { q: query }
    })
    return response.data
  },

  async getBySample(sampleId: number): Promise<ResultEntry | null> {
    const response = await api.get<ResultEntry | null>(`/api/result-entries/sample/${sampleId}`)
    return response.data
  },

  async getById(id: number): Promise<ResultEntry> {
    const response = await api.get<ResultEntry>(`/api/result-entries/${id}`)
    return response.data
  },

  async create(resultEntry: ResultEntryCreate): Promise<ResultEntry> {
    const response = await api.post<ResultEntry>('/api/result-entries/', resultEntry)
    return response.data
  },

  async addValue(resultEntryId: number, value: ResultValueCreate, reason?: string): Promise<ResultValue> {
    const params: any = {}
    if (reason) params.reason = reason
    const response = await api.post<ResultValue>(`/api/result-entries/${resultEntryId}/values`, value, { params })
    return response.data
  },

  async updateValue(resultEntryId: number, valueId: number, value: ResultValueUpdate, reason: string): Promise<ResultValue> {
    const response = await api.put<ResultValue>(
      `/api/result-entries/${resultEntryId}/values/${valueId}`,
      value,
      { params: { reason } }
    )
    return response.data
  },

  async deleteValue(resultEntryId: number, valueId: number, reason: string): Promise<void> {
    await api.delete(`/api/result-entries/${resultEntryId}/values/${valueId}`, {
      params: { reason }
    })
  },

  async commit(resultEntryId: number): Promise<ResultEntry> {
    const response = await api.post<ResultEntry>(`/api/result-entries/${resultEntryId}/commit`)
    return response.data
  },

  async delete(resultEntryId: number, reason: string): Promise<void> {
    await api.delete(`/api/result-entries/${resultEntryId}`, {
      params: { reason }
    })
  },
}

