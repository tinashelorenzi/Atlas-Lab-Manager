import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { settingsService, type Organization, type Integration, type UserCreate } from '@/services/settingsService'
import { emailTemplateService, type EmailTemplate } from '@/services/emailTemplateService'
import { departmentService, type Department, type DepartmentCreate, type TestType, type TestTypeCreate } from '@/services/departmentService'
import { sampleTypeService, type SampleType, type SampleTypeCreate } from '@/services/sampleTypeService'
import { authService } from '@/services/authService'
import type { User } from '@/types/user'
import { User as UserIcon, Building2, Plug, Users, Save, Plus, Trash2, Ban, CheckCircle, Upload, Globe, Clock, Phone, Mail, AlertCircle, CheckCircle2, XCircle, FileText, TestTube, Layers, Edit } from 'lucide-react'
import { LoadingMeter } from '@/components/ui/loading'
import { Switch } from '@/components/ui/switch'

export function Settings() {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [activeTab, setActiveTab] = useState('account')
  const [loading, setLoading] = useState(true)
  
  // Account
  const [account, setAccount] = useState<User | null>(null)
  
  // Organization
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [orgFormData, setOrgFormData] = useState<Partial<Organization>>({})
  
  // Integrations
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [integrationConfigs, setIntegrationConfigs] = useState<Record<string, any>>({})
  
  // User Management
  const [users, setUsers] = useState<User[]>([])
  const [showUserModal, setShowUserModal] = useState(false)
  const [userFormData, setUserFormData] = useState<UserCreate>({
    email: '',
    full_name: '',
    user_type: 'lab_analyst',
  })

  // Email Templates
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([])
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null)
  const [templateFormData, setTemplateFormData] = useState<{ subject: string; body: string }>({
    subject: '',
    body: '',
  })

  // Departments
  const [departments, setDepartments] = useState<Department[]>([])
  const [showDepartmentModal, setShowDepartmentModal] = useState(false)
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null)
  const [departmentFormData, setDepartmentFormData] = useState<DepartmentCreate>({
    name: '',
    description: '',
  })
  const [selectedDepartmentForTestType, setSelectedDepartmentForTestType] = useState<Department | null>(null)
  const [showTestTypeModal, setShowTestTypeModal] = useState(false)
  const [editingTestType, setEditingTestType] = useState<TestType | null>(null)
  const [testTypeFormData, setTestTypeFormData] = useState<TestTypeCreate>({
    name: '',
    description: '',
  })

  // Sample Types
  const [sampleTypes, setSampleTypes] = useState<SampleType[]>([])
  const [showSampleTypeModal, setShowSampleTypeModal] = useState(false)
  const [editingSampleType, setEditingSampleType] = useState<SampleType | null>(null)
  const [sampleTypeFormData, setSampleTypeFormData] = useState<SampleTypeCreate>({
    name: '',
    description: '',
  })

  // Dialog states
  const [dialogState, setDialogState] = useState<{
    open: boolean
    type: 'success' | 'error' | 'confirm' | null
    title: string
    message: string
    onConfirm?: () => void
  }>({
    open: false,
    type: null,
    title: '',
    message: '',
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const user = await authService.getCurrentUser()
      setCurrentUser(user)
      setAccount(user)
      
      // Load organization and integrations only if user is lab admin or manager
      if (user.user_type === 'lab_administrator' || user.user_type === 'lab_manager') {
        try {
          const org = await settingsService.getOrganization()
          setOrganization(org)
          setOrgFormData(org)
        } catch (error) {
          console.error('Failed to load organization:', error)
        }
        
        try {
          const ints = await settingsService.getIntegrations()
          setIntegrations(ints)
          const configs: Record<string, any> = {}
          ints.forEach(int => {
            const config = int.config || {}
            // Ensure boolean values for TLS/SSL are properly set
            if (int.name === 'smtp') {
              config.use_tls = config.use_tls === true || config.use_tls === 'true' || false
              config.use_ssl = config.use_ssl === true || config.use_ssl === 'true' || false
            }
            configs[int.name] = config
            // Store enabled state for easy access
            configs[`${int.name}_enabled`] = int.enabled ?? false
          })
          setIntegrationConfigs(configs)
        } catch (error) {
          console.error('Failed to load integrations:', error)
        }
        
        try {
          const userList = await settingsService.getUsers()
          setUsers(userList)
        } catch (error) {
          console.error('Failed to load users:', error)
        }

        try {
          const templates = await emailTemplateService.getAll()
          setEmailTemplates(templates)
        } catch (error) {
          console.error('Failed to load email templates:', error)
        }

        try {
          const depts = await departmentService.getAll()
          setDepartments(depts)
        } catch (error) {
          console.error('Failed to load departments:', error)
        }

        try {
          const sts = await sampleTypeService.getAll()
          setSampleTypes(sts)
        } catch (error) {
          console.error('Failed to load sample types:', error)
        }
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const canAccessAdminSettings = currentUser?.user_type === 'lab_administrator' || currentUser?.user_type === 'lab_manager'

  const showSuccessDialog = (message: string) => {
    setDialogState({
      open: true,
      type: 'success',
      title: 'Success',
      message,
    })
  }

  const showErrorDialog = (message: string) => {
    setDialogState({
      open: true,
      type: 'error',
      title: 'Error',
      message,
    })
  }

  const showConfirmDialog = (title: string, message: string, onConfirm: () => void) => {
    setDialogState({
      open: true,
      type: 'confirm',
      title,
      message,
      onConfirm,
    })
  }

  const handleSaveOrganization = async () => {
    try {
      const updated = await settingsService.updateOrganization(orgFormData)
      setOrganization(updated)
      setOrgFormData(updated)
      showSuccessDialog('Organization settings saved successfully!')
    } catch (error) {
      console.error('Failed to save organization:', error)
      showErrorDialog('Failed to save organization settings.')
    }
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      showErrorDialog('Please select an image file')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      showErrorDialog('File size must be less than 5MB')
      return
    }

    try {
      const updated = await settingsService.uploadLogo(file)
      setOrganization(updated)
      setOrgFormData(updated)
      showSuccessDialog('Logo uploaded successfully!')
    } catch (error: any) {
      console.error('Failed to upload logo:', error)
      showErrorDialog(error.response?.data?.detail || 'Failed to upload logo.')
    }
  }

  const handleSaveIntegration = async (integrationName: string) => {
    try {
      const config = integrationConfigs[integrationName] || {}
      // Get enabled state from the stored value
      const enabled = integrationConfigs[`${integrationName}_enabled`] ?? false
      
      await settingsService.updateIntegration(integrationName, {
        enabled,
        config,
      })
      await loadData()
      showSuccessDialog('Integration settings saved successfully!')
    } catch (error) {
      console.error('Failed to save integration:', error)
      showErrorDialog('Failed to save integration settings.')
    }
  }

  const handleToggleIntegration = async (integrationName: string, enabled: boolean) => {
    // Optimistically update UI
    setIntegrationConfigs({
      ...integrationConfigs,
      [`${integrationName}_enabled`]: enabled,
    })
    
    // Save to backend
    try {
      const config = integrationConfigs[integrationName] || {}
      await settingsService.updateIntegration(integrationName, {
        enabled,
        config,
      })
      await loadData()
    } catch (error) {
      console.error('Failed to toggle integration:', error)
      showErrorDialog('Failed to update integration status.')
      // Revert the toggle on error
      setIntegrationConfigs({
        ...integrationConfigs,
        [`${integrationName}_enabled`]: !enabled,
      })
    }
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await settingsService.createUser(userFormData)
      await loadData()
      setShowUserModal(false)
      setUserFormData({
        email: '',
        full_name: '',
        user_type: 'lab_analyst',
      })
      showSuccessDialog('User created successfully! A temporary password has been sent to their email.')
    } catch (error: any) {
      console.error('Failed to create user:', error)
      showErrorDialog(error.response?.data?.detail || 'Failed to create user.')
    }
  }

  const handleSuspendUser = async (userId: number) => {
    const user = users.find(u => u.id === userId)
    showConfirmDialog(
      'Suspend User',
      `Are you sure you want to suspend ${user?.full_name || 'this user'}? They will not be able to access the system until reactivated.`,
      async () => {
        try {
          await settingsService.suspendUser(userId)
          await loadData()
          setDialogState({ open: false, type: null, title: '', message: '' })
          showSuccessDialog('User suspended successfully.')
        } catch (error: any) {
          setDialogState({ open: false, type: null, title: '', message: '' })
          showErrorDialog(error.response?.data?.detail || 'Failed to suspend user.')
        }
      }
    )
  }

  const handleActivateUser = async (userId: number) => {
    try {
      await settingsService.activateUser(userId)
      await loadData()
      showSuccessDialog('User activated successfully.')
    } catch (error: any) {
      showErrorDialog(error.response?.data?.detail || 'Failed to activate user.')
    }
  }

  const handleDeleteUser = async (userId: number) => {
    const user = users.find(u => u.id === userId)
    showConfirmDialog(
      'Delete User',
      `Are you sure you want to delete ${user?.full_name || 'this user'}? This action cannot be undone and all associated data will be permanently removed.`,
      async () => {
        try {
          await settingsService.deleteUser(userId)
          await loadData()
          setDialogState({ open: false, type: null, title: '', message: '' })
          showSuccessDialog('User deleted successfully.')
        } catch (error: any) {
          setDialogState({ open: false, type: null, title: '', message: '' })
          showErrorDialog(error.response?.data?.detail || 'Failed to delete user.')
        }
      }
    )
  }

  if (loading) {
    return (
      <DashboardLayout>
        <LoadingMeter />
      </DashboardLayout>
    )
  }

  const handleSaveTemplate = async (templateName: string) => {
    try {
      await emailTemplateService.update(templateName, templateFormData)
      await loadData()
      setEditingTemplate(null)
      showSuccessDialog('Email template saved successfully!')
    } catch (error) {
      console.error('Failed to save template:', error)
      showErrorDialog('Failed to save email template.')
    }
  }

  // Department handlers
  const handleOpenDepartmentModal = async (dept?: Department) => {
    if (dept) {
      // Reload department with test types
      try {
        const departments = await departmentService.getAll()
        const fullDept = departments.find(d => d.id === dept.id)
        if (fullDept) {
          setEditingDepartment(fullDept)
          setDepartmentFormData({ name: fullDept.name, description: fullDept.description || '' })
        } else {
          setEditingDepartment(dept)
          setDepartmentFormData({ name: dept.name, description: dept.description || '' })
        }
      } catch (error) {
        setEditingDepartment(dept)
        setDepartmentFormData({ name: dept.name, description: dept.description || '' })
      }
    } else {
      setEditingDepartment(null)
      setDepartmentFormData({ name: '', description: '' })
    }
    setShowDepartmentModal(true)
  }

  const handleSaveDepartment = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingDepartment) {
        await departmentService.update(editingDepartment.id, departmentFormData)
        showSuccessDialog('Department updated successfully!')
      } else {
        await departmentService.create(departmentFormData)
        showSuccessDialog('Department created successfully!')
      }
      await loadData()
      setShowDepartmentModal(false)
      setEditingDepartment(null)
      setDepartmentFormData({ name: '', description: '' })
    } catch (error: any) {
      showErrorDialog(error.response?.data?.detail || 'Failed to save department.')
    }
  }

  const handleDeleteDepartment = (id: number, name: string) => {
    showConfirmDialog(
      'Confirm Deletion',
      `Are you sure you want to delete department "${name}"?`,
      async () => {
        try {
          await departmentService.delete(id)
          await loadData()
          showSuccessDialog(`Department "${name}" deleted successfully.`)
        } catch (error: any) {
          showErrorDialog(error.response?.data?.detail || 'Failed to delete department.')
        } finally {
          setDialogState({ open: false, type: null, title: '', message: '' })
        }
      }
    )
  }

  // Test Type handlers
  const handleOpenTestTypeModal = (dept: Department, testType?: TestType) => {
    setSelectedDepartmentForTestType(dept)
    if (testType) {
      setEditingTestType(testType)
      setTestTypeFormData({ name: testType.name, description: testType.description || '' })
    } else {
      setEditingTestType(null)
      setTestTypeFormData({ name: '', description: '' })
    }
    setShowTestTypeModal(true)
  }

  const handleSaveTestType = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedDepartmentForTestType) return
    try {
      if (editingTestType) {
        await departmentService.updateTestType(selectedDepartmentForTestType.id, editingTestType.id, testTypeFormData)
        showSuccessDialog('Test type updated successfully!')
      } else {
        await departmentService.createTestType(selectedDepartmentForTestType.id, testTypeFormData)
        showSuccessDialog('Test type created successfully!')
      }
      await loadData()
      // Reload the editing department if it exists
      if (editingDepartment && selectedDepartmentForTestType.id === editingDepartment.id) {
        const departments = await departmentService.getAll()
        const updated = departments.find(d => d.id === editingDepartment.id)
        if (updated) {
          setEditingDepartment(updated)
        }
      }
      setShowTestTypeModal(false)
      setEditingTestType(null)
      setSelectedDepartmentForTestType(null)
      setTestTypeFormData({ name: '', description: '' })
    } catch (error: any) {
      showErrorDialog(error.response?.data?.detail || 'Failed to save test type.')
    }
  }

  const handleDeleteTestType = (deptId: number, testTypeId: number, name: string) => {
    showConfirmDialog(
      'Confirm Deletion',
      `Are you sure you want to delete test type "${name}"?`,
      async () => {
        try {
          await departmentService.deleteTestType(deptId, testTypeId)
          await loadData()
          showSuccessDialog(`Test type "${name}" deleted successfully.`)
        } catch (error: any) {
          showErrorDialog(error.response?.data?.detail || 'Failed to delete test type.')
        } finally {
          setDialogState({ open: false, type: null, title: '', message: '' })
        }
      }
    )
  }

  // Sample Type handlers
  const handleOpenSampleTypeModal = (sampleType?: SampleType) => {
    if (sampleType) {
      setEditingSampleType(sampleType)
      setSampleTypeFormData({ name: sampleType.name, description: sampleType.description || '' })
    } else {
      setEditingSampleType(null)
      setSampleTypeFormData({ name: '', description: '' })
    }
    setShowSampleTypeModal(true)
  }

  const handleSaveSampleType = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingSampleType) {
        await sampleTypeService.update(editingSampleType.id, sampleTypeFormData)
        showSuccessDialog('Sample type updated successfully!')
      } else {
        await sampleTypeService.create(sampleTypeFormData)
        showSuccessDialog('Sample type created successfully!')
      }
      await loadData()
      setShowSampleTypeModal(false)
      setEditingSampleType(null)
      setSampleTypeFormData({ name: '', description: '' })
    } catch (error: any) {
      showErrorDialog(error.response?.data?.detail || 'Failed to save sample type.')
    }
  }

  const handleDeleteSampleType = (id: number, name: string) => {
    showConfirmDialog(
      'Confirm Deletion',
      `Are you sure you want to delete sample type "${name}"?`,
      async () => {
        try {
          await sampleTypeService.delete(id)
          await loadData()
          showSuccessDialog(`Sample type "${name}" deleted successfully.`)
        } catch (error: any) {
          showErrorDialog(error.response?.data?.detail || 'Failed to delete sample type.')
        } finally {
          setDialogState({ open: false, type: null, title: '', message: '' })
        }
      }
    )
  }

  const handleEditTemplate = (template: EmailTemplate) => {
    setEditingTemplate(template)
    setTemplateFormData({
      subject: template.subject,
      body: template.body,
    })
  }

  const tabs = [
    { id: 'account', label: 'Account', icon: UserIcon },
    ...(canAccessAdminSettings ? [
      { id: 'organization', label: 'Organization', icon: Building2 },
      { id: 'departments', label: 'Departments', icon: TestTube },
      { id: 'sample-types', label: 'Sample Types', icon: Layers },
      { id: 'integrations', label: 'Integrations', icon: Plug },
      { id: 'users', label: 'User Management', icon: Users },
      { id: 'templates', label: 'Templates', icon: FileText },
    ] : []),
  ]

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-1">
            Configure your laboratory management preferences
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-border">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Account Tab */}
        {activeTab === 'account' && account && (
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>Your personal account details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Full Name</Label>
                <Input value={account.full_name} disabled />
              </div>
              <div>
                <Label>Email</Label>
                <Input value={account.email} disabled />
              </div>
              <div>
                <Label>User Type</Label>
                <Input value={account.user_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} disabled />
              </div>
              <div>
                <Label>Status</Label>
                <Input value={account.is_active ? 'Active' : 'Suspended'} disabled />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Organization Tab */}
        {activeTab === 'organization' && canAccessAdminSettings && (
          <Card>
            <CardHeader>
              <CardTitle>Organization Settings</CardTitle>
              <CardDescription>Configure your laboratory organization details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="org_name">Organization Name *</Label>
                <Input
                  id="org_name"
                  value={orgFormData.name || ''}
                  onChange={(e) => setOrgFormData({ ...orgFormData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="tagline">Tagline</Label>
                <Input
                  id="tagline"
                  value={orgFormData.tagline || ''}
                  onChange={(e) => setOrgFormData({ ...orgFormData, tagline: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="address">Address</Label>
                <textarea
                  id="address"
                  className="w-full min-h-[100px] px-3 py-2 rounded-md border border-input bg-background text-foreground"
                  value={orgFormData.address || ''}
                  onChange={(e) => setOrgFormData({ ...orgFormData, address: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="vat">VAT Tax Number</Label>
                <Input
                  id="vat"
                  value={orgFormData.vat_tax_number || ''}
                  onChange={(e) => setOrgFormData({ ...orgFormData, vat_tax_number: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="website">
                  <Globe className="inline h-4 w-4 mr-1" />
                  Website
                </Label>
                <Input
                  id="website"
                  type="url"
                  value={orgFormData.website || ''}
                  onChange={(e) => setOrgFormData({ ...orgFormData, website: e.target.value })}
                  placeholder="https://example.com"
                />
              </div>
              <div>
                <Label htmlFor="timezone">
                  <Clock className="inline h-4 w-4 mr-1" />
                  Timezone
                </Label>
                <Input
                  id="timezone"
                  value={orgFormData.timezone || 'UTC'}
                  onChange={(e) => setOrgFormData({ ...orgFormData, timezone: e.target.value })}
                  placeholder="UTC"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">
                    <Phone className="inline h-4 w-4 mr-1" />
                    Phone
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={orgFormData.phone || ''}
                    onChange={(e) => setOrgFormData({ ...orgFormData, phone: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="org_email">
                    <Mail className="inline h-4 w-4 mr-1" />
                    Email
                  </Label>
                  <Input
                    id="org_email"
                    type="email"
                    value={orgFormData.email || ''}
                    onChange={(e) => setOrgFormData({ ...orgFormData, email: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="logo_upload">
                  <Upload className="inline h-4 w-4 mr-1" />
                  Logo
                </Label>
                <div className="space-y-2">
                  {orgFormData.logo_url && (
                    <div className="flex items-center gap-4">
                      <img
                        src={`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}${orgFormData.logo_url}`}
                        alt="Organization logo"
                        className="h-20 w-20 object-contain border border-border rounded"
                      />
                      <span className="text-sm text-muted-foreground">Current logo</span>
                    </div>
                  )}
                  <Input
                    id="logo_upload"
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="cursor-pointer"
                  />
                  <p className="text-xs text-muted-foreground">
                    Upload a logo image (PNG, JPG, GIF, WebP). Max 5MB. Recommended: 512x512px
                  </p>
                </div>
              </div>
              <Button onClick={handleSaveOrganization}>
                <Save className="h-4 w-4 mr-2" />
                Save Organization Settings
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Integrations Tab */}
        {activeTab === 'integrations' && canAccessAdminSettings && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Cloudflare Turnstile</CardTitle>
                    <CardDescription>Configure Cloudflare Turnstile for bot protection</CardDescription>
                  </div>
                  <div className="flex items-center gap-3">
                    <Label htmlFor="turnstile_enabled" className="text-sm font-normal cursor-pointer">
                      {integrationConfigs['cloudflare_turnstile_enabled'] ?? integrations.find(i => i.name === 'cloudflare_turnstile')?.enabled ?? false ? 'Enabled' : 'Disabled'}
                    </Label>
                    <Switch
                      id="turnstile_enabled"
                      checked={integrationConfigs['cloudflare_turnstile_enabled'] ?? integrations.find(i => i.name === 'cloudflare_turnstile')?.enabled ?? false}
                      onCheckedChange={(checked) => handleToggleIntegration('cloudflare_turnstile', checked)}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="turnstile_site_key">Site Key</Label>
                  <Input
                    id="turnstile_site_key"
                    value={integrationConfigs['cloudflare_turnstile']?.site_key || ''}
                    onChange={(e) => setIntegrationConfigs({
                      ...integrationConfigs,
                      cloudflare_turnstile: {
                        ...integrationConfigs['cloudflare_turnstile'],
                        site_key: e.target.value,
                      },
                    })}
                  />
                </div>
                <div>
                  <Label htmlFor="turnstile_secret_key">Secret Key</Label>
                  <Input
                    id="turnstile_secret_key"
                    type="password"
                    value={integrationConfigs['cloudflare_turnstile']?.secret_key || ''}
                    onChange={(e) => setIntegrationConfigs({
                      ...integrationConfigs,
                      cloudflare_turnstile: {
                        ...integrationConfigs['cloudflare_turnstile'],
                        secret_key: e.target.value,
                      },
                    })}
                  />
                </div>
                <Button onClick={() => handleSaveIntegration('cloudflare_turnstile')}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Turnstile Settings
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>SMTP Email Configuration</CardTitle>
                    <CardDescription>Configure SMTP settings for sending emails</CardDescription>
                  </div>
                  <div className="flex items-center gap-3">
                    <Label htmlFor="smtp_enabled" className="text-sm font-normal cursor-pointer">
                      {integrationConfigs['smtp_enabled'] ?? integrations.find(i => i.name === 'smtp')?.enabled ?? false ? 'Enabled' : 'Disabled'}
                    </Label>
                    <Switch
                      id="smtp_enabled"
                      checked={integrationConfigs['smtp_enabled'] ?? integrations.find(i => i.name === 'smtp')?.enabled ?? false}
                      onCheckedChange={(checked) => handleToggleIntegration('smtp', checked)}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="smtp_host">SMTP Host</Label>
                    <Input
                      id="smtp_host"
                      value={integrationConfigs['smtp']?.host || ''}
                      onChange={(e) => setIntegrationConfigs({
                        ...integrationConfigs,
                        smtp: {
                          ...integrationConfigs['smtp'],
                          host: e.target.value,
                        },
                      })}
                    />
                  </div>
                <div>
                  <Label htmlFor="smtp_port">SMTP Port</Label>
                  <Input
                    id="smtp_port"
                    type="number"
                    value={integrationConfigs['smtp']?.port || ''}
                    onChange={(e) => setIntegrationConfigs({
                      ...integrationConfigs,
                      smtp: {
                        ...integrationConfigs['smtp'],
                        port: e.target.value,
                      },
                    })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="smtp_use_tls">Use TLS</Label>
                  <select
                    id="smtp_use_tls"
                    className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground"
                    value={integrationConfigs['smtp']?.use_tls === true || integrationConfigs['smtp']?.use_tls === 'true' ? 'true' : 'false'}
                    onChange={(e) => setIntegrationConfigs({
                      ...integrationConfigs,
                      smtp: {
                        ...integrationConfigs['smtp'],
                        use_tls: e.target.value === 'true',
                        use_ssl: e.target.value === 'true' ? false : integrationConfigs['smtp']?.use_ssl,
                      },
                    })}
                  >
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="smtp_use_ssl">Use SSL</Label>
                  <select
                    id="smtp_use_ssl"
                    className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground"
                    value={integrationConfigs['smtp']?.use_ssl === true || integrationConfigs['smtp']?.use_ssl === 'true' ? 'true' : 'false'}
                    onChange={(e) => setIntegrationConfigs({
                      ...integrationConfigs,
                      smtp: {
                        ...integrationConfigs['smtp'],
                        use_ssl: e.target.value === 'true',
                        use_tls: e.target.value === 'true' ? false : integrationConfigs['smtp']?.use_tls,
                      },
                    })}
                  >
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                </div>
              </div>
                <div>
                  <Label htmlFor="smtp_username">Username</Label>
                  <Input
                    id="smtp_username"
                    value={integrationConfigs['smtp']?.username || ''}
                    onChange={(e) => setIntegrationConfigs({
                      ...integrationConfigs,
                      smtp: {
                        ...integrationConfigs['smtp'],
                        username: e.target.value,
                      },
                    })}
                  />
                </div>
                <div>
                  <Label htmlFor="smtp_password">Password</Label>
                  <Input
                    id="smtp_password"
                    type="password"
                    value={integrationConfigs['smtp']?.password || ''}
                    onChange={(e) => setIntegrationConfigs({
                      ...integrationConfigs,
                      smtp: {
                        ...integrationConfigs['smtp'],
                        password: e.target.value,
                      },
                    })}
                  />
                </div>
                <div>
                  <Label htmlFor="smtp_from_email">From Email</Label>
                  <Input
                    id="smtp_from_email"
                    type="email"
                    value={integrationConfigs['smtp']?.from_email || ''}
                    onChange={(e) => setIntegrationConfigs({
                      ...integrationConfigs,
                      smtp: {
                        ...integrationConfigs['smtp'],
                        from_email: e.target.value,
                      },
                    })}
                  />
                </div>
                <Button onClick={() => handleSaveIntegration('smtp')}>
                  <Save className="h-4 w-4 mr-2" />
                  Save SMTP Settings
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* User Management Tab */}
        {activeTab === 'users' && canAccessAdminSettings && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>User Management</CardTitle>
                    <CardDescription>Manage system users and permissions</CardDescription>
                  </div>
                  <Button onClick={() => setShowUserModal(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add User
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left p-3 text-sm font-medium text-muted-foreground">Name</th>
                        <th className="text-left p-3 text-sm font-medium text-muted-foreground">Email</th>
                        <th className="text-left p-3 text-sm font-medium text-muted-foreground">Type</th>
                        <th className="text-left p-3 text-sm font-medium text-muted-foreground">Status</th>
                        <th className="text-right p-3 text-sm font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr key={user.id} className="border-b border-border hover:bg-muted/50">
                          <td className="p-3 font-medium text-foreground">{user.full_name}</td>
                          <td className="p-3 text-muted-foreground">{user.email}</td>
                          <td className="p-3 text-muted-foreground">
                            {user.user_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-1 rounded text-xs ${
                              user.is_active ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
                            }`}>
                              {user.is_active ? 'Active' : 'Suspended'}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center justify-end gap-2">
                              {user.is_active ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleSuspendUser(user.id)}
                                  disabled={user.user_type === 'lab_administrator'}
                                >
                                  <Ban className="h-4 w-4" />
                                </Button>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleActivateUser(user.id)}
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteUser(user.id)}
                                disabled={user.user_type === 'lab_administrator'}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Add User Modal */}
            {showUserModal && (
              <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <Card className="w-full max-w-md">
                  <CardHeader>
                    <CardTitle>Add New User</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleCreateUser} className="space-y-4">
                      <div>
                        <Label htmlFor="user_email">Email *</Label>
                        <Input
                          id="user_email"
                          type="email"
                          value={userFormData.email}
                          onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="user_name">Full Name *</Label>
                        <Input
                          id="user_name"
                          value={userFormData.full_name}
                          onChange={(e) => setUserFormData({ ...userFormData, full_name: e.target.value })}
                          required
                        />
                      </div>
                      <div className="p-3 bg-muted/50 rounded-md text-sm text-muted-foreground">
                        A temporary password will be automatically generated and sent to the user's email address.
                      </div>
                      <div>
                        <Label htmlFor="user_type">User Type *</Label>
                        <select
                          id="user_type"
                          className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground"
                          value={userFormData.user_type}
                          onChange={(e) => setUserFormData({ ...userFormData, user_type: e.target.value })}
                          required
                        >
                          <option value="lab_analyst">Lab Analyst</option>
                          <option value="lab_manager">Lab Manager</option>
                        </select>
                      </div>
                      <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={() => setShowUserModal(false)}>
                          Cancel
                        </Button>
                        <Button type="submit">Create User</Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )}

        {/* Departments Tab */}
        {activeTab === 'departments' && canAccessAdminSettings && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-foreground">Departments</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Manage departments and their test types
                </p>
              </div>
              <Button onClick={() => handleOpenDepartmentModal()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Department
              </Button>
            </div>

            <div className="space-y-4">
              {departments.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    No departments found. Create your first department to get started.
                  </CardContent>
                </Card>
              ) : (
                departments.map((dept) => (
                  <Card 
                    key={dept.id}
                    className="cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => handleOpenDepartmentModal(dept)}
                  >
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <CardTitle>{dept.name}</CardTitle>
                          {dept.description && (
                            <CardDescription className="mt-1">{dept.description}</CardDescription>
                          )}
                          {dept.test_types && dept.test_types.length > 0 && (
                            <p className="text-sm text-muted-foreground mt-2">
                              {dept.test_types.filter(tt => tt.is_active).length} active test type{dept.test_types.filter(tt => tt.is_active).length !== 1 ? 's' : ''}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenDepartmentModal(dept)}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Manage
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteDepartment(dept.id, dept.name)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                ))
              )}
            </div>

            {/* Department Modal */}
            <Dialog open={showDepartmentModal} onOpenChange={setShowDepartmentModal}>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingDepartment ? 'Edit Department' : 'Create Department'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingDepartment 
                      ? 'Update department information and manage test types'
                      : 'Create a new department and add test types to it'}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSaveDepartment} className="space-y-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="dept_name">Name *</Label>
                      <Input
                        id="dept_name"
                        value={departmentFormData.name}
                        onChange={(e) => setDepartmentFormData({ ...departmentFormData, name: e.target.value })}
                        required
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <Label htmlFor="dept_description">Description</Label>
                      <textarea
                        id="dept_description"
                        className="w-full min-h-[100px] px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm mt-1.5"
                        value={departmentFormData.description}
                        onChange={(e) => setDepartmentFormData({ ...departmentFormData, description: e.target.value })}
                        placeholder="Describe the department and its purpose..."
                      />
                    </div>
                  </div>

                  {/* Test Types Section - Only show when editing existing department */}
                  {editingDepartment && (
                    <div className="space-y-4 pt-4 border-t border-border">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-base font-semibold">Test Types</Label>
                          <p className="text-sm text-muted-foreground mt-1">
                            Manage test types for this department
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedDepartmentForTestType(editingDepartment)
                            handleOpenTestTypeModal(editingDepartment)
                          }}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Test Type
                        </Button>
                      </div>
                      
                      {editingDepartment.test_types && editingDepartment.test_types.length > 0 ? (
                        <div className="space-y-2 max-h-[300px] overflow-y-auto">
                          {editingDepartment.test_types.map((testType) => (
                            <div
                              key={testType.id}
                              className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border"
                            >
                              <div className="flex-1">
                                <p className="font-medium text-sm">{testType.name}</p>
                                {testType.description && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {testType.description}
                                  </p>
                                )}
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedDepartmentForTestType(editingDepartment)
                                    handleOpenTestTypeModal(editingDepartment, testType)
                                  }}
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteTestType(editingDepartment.id, testType.id, testType.name)}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-4 bg-muted/30 rounded-lg border border-border text-center">
                          <p className="text-sm text-muted-foreground">
                            No test types defined. Click "Add Test Type" to add test types to this department.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setShowDepartmentModal(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">
                      <Save className="h-4 w-4 mr-2" />
                      {editingDepartment ? 'Update Department' : 'Create Department'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            {/* Test Type Modal */}
            <Dialog open={showTestTypeModal} onOpenChange={setShowTestTypeModal}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingTestType ? 'Edit Test Type' : 'Create Test Type'}
                    {selectedDepartmentForTestType && ` - ${selectedDepartmentForTestType.name}`}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSaveTestType} className="space-y-4">
                  <div>
                    <Label htmlFor="test_type_name">Name *</Label>
                    <Input
                      id="test_type_name"
                      value={testTypeFormData.name}
                      onChange={(e) => setTestTypeFormData({ ...testTypeFormData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="test_type_description">Description</Label>
                    <textarea
                      id="test_type_description"
                      className="w-full min-h-[100px] px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm"
                      value={testTypeFormData.description}
                      onChange={(e) => setTestTypeFormData({ ...testTypeFormData, description: e.target.value })}
                      placeholder="e.g., Concentration of Mg, ICP Elements, etc."
                    />
                  </div>
                  {editingTestType && (
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="test_type_active"
                        checked={editingTestType.is_active}
                        onCheckedChange={async (checked) => {
                          try {
                            await departmentService.updateTestType(
                              selectedDepartmentForTestType!.id,
                              editingTestType.id,
                              { is_active: checked }
                            )
                            await loadData()
                            if (editingDepartment && selectedDepartmentForTestType!.id === editingDepartment.id) {
                              const departments = await departmentService.getAll()
                              const updated = departments.find(d => d.id === editingDepartment.id)
                              if (updated) {
                                setEditingDepartment(updated)
                                setEditingTestType({ ...editingTestType, is_active: checked })
                              }
                            }
                          } catch (error: any) {
                            showErrorDialog(error.response?.data?.detail || 'Failed to update test type status.')
                          }
                        }}
                      />
                      <Label htmlFor="test_type_active" className="cursor-pointer">
                        Active
                      </Label>
                    </div>
                  )}
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setShowTestTypeModal(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">
                      <Save className="h-4 w-4 mr-2" />
                      {editingTestType ? 'Update' : 'Create'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {/* Sample Types Tab */}
        {activeTab === 'sample-types' && canAccessAdminSettings && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-foreground">Sample Types</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Manage sample types that can be used when recording samples
                </p>
              </div>
              <Button onClick={() => handleOpenSampleTypeModal()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Sample Type
              </Button>
            </div>

            <div className="space-y-4">
              {sampleTypes.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    No sample types found. Create your first sample type to get started.
                  </CardContent>
                </Card>
              ) : (
                sampleTypes.map((sampleType) => (
                  <Card 
                    key={sampleType.id}
                    className={`${!sampleType.is_active ? 'opacity-60' : ''}`}
                  >
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <CardTitle>{sampleType.name}</CardTitle>
                            {!sampleType.is_active && (
                              <span className="text-xs px-2 py-0.5 bg-yellow-500/20 text-yellow-500 rounded">
                                Inactive
                              </span>
                            )}
                          </div>
                          {sampleType.description && (
                            <CardDescription className="mt-1">{sampleType.description}</CardDescription>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenSampleTypeModal(sampleType)}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteSampleType(sampleType.id, sampleType.name)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                ))
              )}
            </div>

            {/* Sample Type Modal */}
            <Dialog open={showSampleTypeModal} onOpenChange={setShowSampleTypeModal}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingSampleType ? 'Edit Sample Type' : 'Create Sample Type'}
                  </DialogTitle>
                  <DialogDescription>
                    Define sample types that can be selected when recording new samples
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSaveSampleType} className="space-y-4">
                  <div>
                    <Label htmlFor="sample_type_name">Name *</Label>
                    <Input
                      id="sample_type_name"
                      value={sampleTypeFormData.name}
                      onChange={(e) => setSampleTypeFormData({ ...sampleTypeFormData, name: e.target.value })}
                      required
                      className="mt-1.5"
                      placeholder="e.g., Water, Soil, Air, Blood, etc."
                    />
                  </div>
                  <div>
                    <Label htmlFor="sample_type_description">Description</Label>
                    <textarea
                      id="sample_type_description"
                      className="w-full min-h-[100px] px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm mt-1.5"
                      value={sampleTypeFormData.description}
                      onChange={(e) => setSampleTypeFormData({ ...sampleTypeFormData, description: e.target.value })}
                      placeholder="Describe the sample type and any relevant information..."
                    />
                  </div>
                  {editingSampleType && (
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="sample_type_active"
                        checked={editingSampleType.is_active}
                        onCheckedChange={async (checked) => {
                          try {
                            await sampleTypeService.update(editingSampleType.id, { is_active: checked })
                            await loadData()
                            setEditingSampleType({ ...editingSampleType, is_active: checked })
                          } catch (error: any) {
                            showErrorDialog(error.response?.data?.detail || 'Failed to update sample type status.')
                          }
                        }}
                      />
                      <Label htmlFor="sample_type_active" className="cursor-pointer">
                        Active
                      </Label>
                    </div>
                  )}
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setShowSampleTypeModal(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">
                      <Save className="h-4 w-4 mr-2" />
                      {editingSampleType ? 'Update' : 'Create'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {/* Templates Tab */}
        {activeTab === 'templates' && canAccessAdminSettings && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Email Templates</CardTitle>
                <CardDescription>Customize email templates for user and customer communications</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {emailTemplates.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No email templates found. Default templates will be used.
                    </div>
                  ) : (
                    emailTemplates.map((template) => (
                      <Card key={template.id}>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle className="text-lg capitalize">
                                {template.name.replace('_', ' ')}
                              </CardTitle>
                              <CardDescription className="mt-1">
                                Subject: {template.subject}
                              </CardDescription>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditTemplate(template)}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </Button>
                          </div>
                        </CardHeader>
                      </Card>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Edit Template Dialog */}
            {editingTemplate && (
              <Dialog open={!!editingTemplate} onOpenChange={(open) => {
                if (!open) {
                  setEditingTemplate(null)
                  setTemplateFormData({ subject: '', body: '' })
                }
              }}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      Edit Template: {editingTemplate.name.replace('_', ' ')}
                    </DialogTitle>
                    <DialogDescription>
                      Use placeholders: {editingTemplate.name === 'user_welcome' 
                        ? '{{full_name}}, {{email}}, {{temp_password}}, {{login_url}}'
                        : '{{full_name}}, {{customer_id}}'}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label htmlFor="template_subject">Subject</Label>
                      <Input
                        id="template_subject"
                        value={templateFormData.subject}
                        onChange={(e) => setTemplateFormData({ ...templateFormData, subject: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="template_body">Body (HTML)</Label>
                      <textarea
                        id="template_body"
                        className="w-full min-h-[400px] px-3 py-2 rounded-md border border-input bg-background text-foreground font-mono text-sm"
                        value={templateFormData.body}
                        onChange={(e) => setTemplateFormData({ ...templateFormData, body: e.target.value })}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditingTemplate(null)
                        setTemplateFormData({ subject: '', body: '' })
                      }}
                    >
                      Cancel
                    </Button>
                    <Button onClick={() => handleSaveTemplate(editingTemplate.name)}>
                      <Save className="h-4 w-4 mr-2" />
                      Save Template
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        )}

        {/* Success/Error/Confirm Dialog */}
        <Dialog open={dialogState.open} onOpenChange={(open) => {
          if (!open) {
            setDialogState({ open: false, type: null, title: '', message: '' })
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <div className="flex items-center gap-3">
                {dialogState.type === 'success' && (
                  <div className="h-10 w-10 rounded-full bg-green-500/20 flex items-center justify-center">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  </div>
                )}
                {dialogState.type === 'error' && (
                  <div className="h-10 w-10 rounded-full bg-red-500/20 flex items-center justify-center">
                    <XCircle className="h-5 w-5 text-red-500" />
                  </div>
                )}
                {dialogState.type === 'confirm' && (
                  <div className="h-10 w-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                    <AlertCircle className="h-5 w-5 text-yellow-500" />
                  </div>
                )}
                <DialogTitle>{dialogState.title}</DialogTitle>
              </div>
            </DialogHeader>
            <DialogDescription className="pt-2">
              {dialogState.message}
            </DialogDescription>
            <DialogFooter>
              {dialogState.type === 'confirm' ? (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setDialogState({ open: false, type: null, title: '', message: '' })}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      if (dialogState.onConfirm) {
                        dialogState.onConfirm()
                      }
                    }}
                  >
                    Confirm
                  </Button>
                </>
              ) : (
                <Button onClick={() => setDialogState({ open: false, type: null, title: '', message: '' })}>
                  OK
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}

export default Settings
