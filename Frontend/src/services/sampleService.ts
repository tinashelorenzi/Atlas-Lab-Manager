import api from '@/lib/api'

export interface Sample {
  id: number
  sample_id: string
  customer_id: number
  project_id: number | null
  sample_type_id: number
  name: string
  volume: string | null
  conditions: string | null
  notes: string | null
  is_batch: boolean
  batch_size: number | null
  status: string
  created_at: string
  updated_at: string
  customer_name: string
  customer_email: string | null
  customer_phone: string | null
  project_name: string | null
  sample_type_name: string
  department_names: string[]
  test_type_names: string[]
}

export interface SampleCreate {
  customer_id: number
  project_id?: number | null
  sample_type_id: number
  name: string
  volume?: string | null
  conditions?: string | null
  notes?: string | null
  is_batch: boolean
  batch_size?: number | null
  department_ids: number[]
  test_type_ids: number[]
}

export interface SampleUpdate {
  name?: string
  volume?: string | null
  conditions?: string | null
  notes?: string | null
  status?: string
  department_ids?: number[]
  test_type_ids?: number[]
}

export const sampleService = {
  async getAll(customerId?: number, projectId?: number): Promise<Sample[]> {
    const params: any = {}
    if (customerId) params.customer_id = customerId
    if (projectId) params.project_id = projectId
    const response = await api.get<Sample[]>('/api/samples/', { params })
    return response.data
  },

  async getById(id: number): Promise<Sample> {
    const response = await api.get<Sample>(`/api/samples/${id}`)
    return response.data
  },

  async getDetails(id: number): Promise<{
    sample: Sample & { collected_by: string | null; collected_at: string | null }
    activities: Array<{
      id: number
      activity_type: string
      description: string
      activity_data: Record<string, any>
      user_name: string
      user_email: string | null
      created_at: string
    }>
  }> {
    const response = await api.get(`/api/samples/${id}/details`)
    return response.data
  },

  async search(query: string): Promise<Sample[]> {
    const response = await api.get<Sample[]>('/api/samples/search', {
      params: { q: query }
    })
    return response.data
  },

  async create(sample: SampleCreate): Promise<Sample> {
    const response = await api.post<Sample>('/api/samples/', sample)
    return response.data
  },

  async update(id: number, sample: SampleUpdate): Promise<Sample> {
    const response = await api.put<Sample>(`/api/samples/${id}`, sample)
    return response.data
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/api/samples/${id}`)
  },
}

