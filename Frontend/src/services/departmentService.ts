import api from '@/lib/api'

export interface TestType {
  id: number
  department_id: number
  name: string
  description: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Department {
  id: number
  name: string
  description: string | null
  is_active: boolean
  test_types: TestType[]
  created_at: string
  updated_at: string
}

export interface DepartmentCreate {
  name: string
  description?: string | null
}

export interface DepartmentUpdate {
  name?: string
  description?: string | null
  is_active?: boolean
}

export interface TestTypeCreate {
  name: string
  description?: string | null
}

export interface TestTypeUpdate {
  name?: string
  description?: string | null
  is_active?: boolean
}

export const departmentService = {
  async getAll(): Promise<Department[]> {
    const response = await api.get<Department[]>('/api/departments/')
    return response.data
  },

  async create(department: DepartmentCreate): Promise<Department> {
    const response = await api.post<Department>('/api/departments/', department)
    return response.data
  },

  async update(id: number, department: DepartmentUpdate): Promise<Department> {
    const response = await api.put<Department>(`/api/departments/${id}`, department)
    return response.data
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/api/departments/${id}`)
  },

  async createTestType(departmentId: number, testType: TestTypeCreate): Promise<TestType> {
    const response = await api.post<TestType>(`/api/departments/${departmentId}/test-types`, testType)
    return response.data
  },

  async updateTestType(departmentId: number, testTypeId: number, testType: TestTypeUpdate): Promise<TestType> {
    const response = await api.put<TestType>(`/api/departments/${departmentId}/test-types/${testTypeId}`, testType)
    return response.data
  },

  async deleteTestType(departmentId: number, testTypeId: number): Promise<void> {
    await api.delete(`/api/departments/${departmentId}/test-types/${testTypeId}`)
  },
}

