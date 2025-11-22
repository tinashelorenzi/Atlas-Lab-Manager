import api from '@/lib/api'

export interface Customer {
  id: number
  customer_id: string
  full_name: string
  email: string | null
  phone: string | null
  company_name: string | null
  address: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface CustomerCreate {
  full_name: string
  email?: string | null
  phone?: string | null
  company_name?: string | null
  address?: string | null
  notes?: string | null
}

export interface CustomerUpdate {
  full_name?: string
  email?: string | null
  phone?: string | null
  company_name?: string | null
  address?: string | null
  notes?: string | null
}

export const customerService = {
  async getAll(): Promise<Customer[]> {
    const response = await api.get<Customer[]>('/api/customers/')
    return response.data
  },

  async getById(id: number): Promise<Customer> {
    const response = await api.get<Customer>(`/api/customers/${id}`)
    return response.data
  },

  async searchByCustomerId(customerId: string): Promise<Customer> {
    const response = await api.get<Customer>(`/api/customers/search/${customerId}`)
    return response.data
  },

  async search(query: string): Promise<Customer[]> {
    const response = await api.get<Customer[]>('/api/customers/search', {
      params: { q: query }
    })
    return response.data
  },

  async create(customer: CustomerCreate, sendWelcomeEmail: boolean = true): Promise<Customer> {
    const response = await api.post<Customer>('/api/customers/', customer, {
      params: { send_welcome_email: sendWelcomeEmail }
    })
    return response.data
  },

  async update(id: number, customer: CustomerUpdate): Promise<Customer> {
    const response = await api.put<Customer>(`/api/customers/${id}`, customer)
    return response.data
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/api/customers/${id}`)
  },
}

