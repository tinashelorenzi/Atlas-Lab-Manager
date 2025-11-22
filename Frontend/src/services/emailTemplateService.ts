import api from '@/lib/api'

export interface EmailTemplate {
  id: number
  name: string
  subject: string
  body: string
  created_at: string
  updated_at: string
}

export interface EmailTemplateUpdate {
  subject?: string
  body?: string
}

export const emailTemplateService = {
  async getAll(): Promise<EmailTemplate[]> {
    const response = await api.get<EmailTemplate[]>('/api/email-templates/')
    return response.data
  },

  async getByName(name: string): Promise<EmailTemplate> {
    const response = await api.get<EmailTemplate>(`/api/email-templates/${name}`)
    return response.data
  },

  async update(name: string, template: EmailTemplateUpdate): Promise<EmailTemplate> {
    const response = await api.put<EmailTemplate>(`/api/email-templates/${name}`, template)
    return response.data
  },
}

