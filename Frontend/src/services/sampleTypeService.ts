import api from '@/lib/api'

export interface SampleType {
  id: number
  name: string
  description: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface SampleTypeCreate {
  name: string
  description?: string | null
}

export interface SampleTypeUpdate {
  name?: string
  description?: string | null
  is_active?: boolean
}

export const sampleTypeService = {
  async getAll(): Promise<SampleType[]> {
    const response = await api.get<SampleType[]>('/api/sample-types/')
    return response.data
  },

  async create(sampleType: SampleTypeCreate): Promise<SampleType> {
    const response = await api.post<SampleType>('/api/sample-types/', sampleType)
    return response.data
  },

  async update(id: number, sampleType: SampleTypeUpdate): Promise<SampleType> {
    const response = await api.put<SampleType>(`/api/sample-types/${id}`, sampleType)
    return response.data
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/api/sample-types/${id}`)
  },
}

