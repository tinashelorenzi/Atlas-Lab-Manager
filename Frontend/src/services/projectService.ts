import api from '@/lib/api'

export interface Project {
  id: number
  project_id: string
  customer_id: number
  name: string
  project_type: string | null
  details: string | null
  status: string
  created_at: string
  updated_at: string
}

export interface ProjectWithCustomer extends Project {
  customer_name: string
  customer_email: string | null
}

export interface ProjectCreate {
  customer_id: number
  name: string
  project_type?: string | null
  details?: string | null
  status?: string
}

export interface ProjectUpdate {
  name?: string
  project_type?: string | null
  details?: string | null
  status?: string
}

export const projectService = {
  async getAll(customerId?: number): Promise<ProjectWithCustomer[]> {
    const params = customerId ? { customer_id: customerId } : {}
    const response = await api.get<ProjectWithCustomer[]>('/api/projects/', { params })
    return response.data
  },

  async getById(id: number): Promise<ProjectWithCustomer> {
    const response = await api.get<ProjectWithCustomer>(`/api/projects/${id}`)
    return response.data
  },

  async search(query: string): Promise<ProjectWithCustomer[]> {
    const response = await api.get<ProjectWithCustomer[]>('/api/projects/search', {
      params: { q: query }
    })
    return response.data
  },

  async create(project: ProjectCreate): Promise<Project> {
    const response = await api.post<Project>('/api/projects/', project)
    return response.data
  },

  async update(id: number, project: ProjectUpdate): Promise<Project> {
    const response = await api.put<Project>(`/api/projects/${id}`, project)
    return response.data
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/api/projects/${id}`)
  },
}

