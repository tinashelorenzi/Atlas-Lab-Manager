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
import { projectService, type ProjectWithCustomer, type ProjectCreate } from '@/services/projectService'
import { customerService, type Customer } from '@/services/customerService'
import { Search, Plus, X, Edit, Trash2, Hash, User, Building2, FileText, Tag, CheckCircle, XCircle, Clock, Mail } from 'lucide-react'
import { LoadingMeter } from '@/components/ui/loading'

export function Projects() {
  const [searchQuery, setSearchQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<ProjectWithCustomer[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [projectToDelete, setProjectToDelete] = useState<ProjectWithCustomer | null>(null)
  const [wizardStep, setWizardStep] = useState<1 | 2>(1)
  const [customerSearchQuery, setCustomerSearchQuery] = useState('')
  const [searchingCustomer, setSearchingCustomer] = useState(false)
  const [customerSearchResults, setCustomerSearchResults] = useState<Customer[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [formData, setFormData] = useState<ProjectCreate>({
    customer_id: 0,
    name: '',
    project_type: '',
    details: '',
    status: 'active',
  })
  const [creating, setCreating] = useState(false)
  const [editingProject, setEditingProject] = useState<ProjectWithCustomer | null>(null)

  const handleCustomerSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!customerSearchQuery.trim()) {
      return
    }

    try {
      setSearchingCustomer(true)
      const results = await customerService.search(customerSearchQuery.trim())
      setCustomerSearchResults(results)
    } catch (error: any) {
      console.error('Failed to search customers:', error)
      setCustomerSearchResults([])
    } finally {
      setSearchingCustomer(false)
    }
  }

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer)
    setFormData({ ...formData, customer_id: customer.id })
    setWizardStep(2)
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) {
      return
    }

    try {
      setSearching(true)
      const results = await projectService.search(searchQuery.trim())
      setSearchResults(results)
    } catch (error: any) {
      console.error('Failed to search projects:', error)
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.customer_id || formData.customer_id === 0) {
      return
    }
    try {
      setCreating(true)
      const newProject = await projectService.create(formData)
      handleCloseCreateModal()
      // Search for the newly created project
      setSearchQuery(newProject.project_id)
      setTimeout(async () => {
        try {
          setSearching(true)
          const results = await projectService.search(newProject.project_id)
          setSearchResults(results)
        } catch (error: any) {
          console.error('Failed to search project:', error)
        } finally {
          setSearching(false)
        }
      }, 500)
    } catch (error) {
      console.error('Failed to create project:', error)
    } finally {
      setCreating(false)
    }
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingProject) return
    try {
      setCreating(true)
      await projectService.update(editingProject.id, {
        name: formData.name,
        project_type: formData.project_type,
        details: formData.details,
        status: formData.status,
      })
      handleCloseCreateModal()
      // Refresh search if there's a query
      if (searchQuery.trim()) {
        await handleSearch(e)
      }
    } catch (error) {
      console.error('Failed to update project:', error)
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async () => {
    if (!projectToDelete) return
    try {
      await projectService.delete(projectToDelete.id)
      setShowDeleteDialog(false)
      setProjectToDelete(null)
      // Refresh search if there's a query
      if (searchQuery.trim()) {
        const searchEvent = new Event('submit') as any
        await handleSearch(searchEvent)
      }
    } catch (error) {
      console.error('Failed to delete project:', error)
    }
  }

  const handleOpenCreateModal = () => {
    setEditingProject(null)
    setWizardStep(1)
    setSelectedCustomer(null)
    setCustomerSearchQuery('')
    setCustomerSearchResults([])
    setFormData({
      customer_id: 0,
      name: '',
      project_type: '',
      details: '',
      status: 'active',
    })
    setShowCreateModal(true)
  }

  const handleOpenEditModal = (project: ProjectWithCustomer) => {
    setEditingProject(project)
    setWizardStep(2) // Skip customer selection for edit
    setSelectedCustomer({
      id: project.customer_id,
      customer_id: '',
      full_name: project.customer_name,
      email: project.customer_email,
      phone: null,
      company_name: null,
      address: null,
      notes: null,
      created_at: '',
      updated_at: '',
    })
    setFormData({
      customer_id: project.customer_id,
      name: project.name,
      project_type: project.project_type || '',
      details: project.details || '',
      status: project.status,
    })
    setShowCreateModal(true)
  }

  const handleCloseCreateModal = () => {
    setShowCreateModal(false)
    setEditingProject(null)
    setWizardStep(1)
    setSelectedCustomer(null)
    setCustomerSearchQuery('')
    setCustomerSearchResults([])
    setFormData({
      customer_id: 0,
      name: '',
      project_type: '',
      details: '',
      status: 'active',
    })
  }

  const handleBackToCustomerSelection = () => {
    setWizardStep(1)
    setSelectedCustomer(null)
    setFormData({ ...formData, customer_id: 0 })
  }

  const handleReset = () => {
    setSearchQuery('')
    setSearchResults([])
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-500/20 text-green-500'
      case 'completed':
        return 'bg-blue-500/20 text-blue-500'
      case 'on_hold':
        return 'bg-yellow-500/20 text-yellow-500'
      case 'cancelled':
        return 'bg-red-500/20 text-red-500'
      default:
        return 'bg-muted text-muted-foreground'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return CheckCircle
      case 'completed':
        return CheckCircle
      case 'on_hold':
        return Clock
      case 'cancelled':
        return XCircle
      default:
        return Clock
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Projects</h1>
          <p className="text-muted-foreground mt-1.5 text-sm">
            Manage ongoing projects where customers submit multiple samples continuously
          </p>
        </div>

        <Card className="border-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-semibold">Search Projects</CardTitle>
            <CardDescription className="text-sm">
              Enter a project ID, name, type, or customer name
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="search_query" className="text-sm font-medium">
                  Search Query
                </Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="search_query"
                      placeholder="e.g., A1B2C3D4, Mining Project, John Doe"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value)
                        if (e.target.value.trim() === '') {
                          setSearchResults([])
                        }
                      }}
                      className="pl-10 h-11 text-base"
                      autoFocus
                    />
                  </div>
                  <Button 
                    type="submit" 
                    disabled={searching || !searchQuery.trim()}
                    className="h-11 px-6"
                  >
                    {searching ? (
                      <>
                        <LoadingMeter />
                      </>
                    ) : (
                      <>
                        <Search className="h-4 w-4 mr-2" />
                        Search
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">
                  Supports exact matches, partial matches, and fuzzy matching for typos
                </p>
              </div>

              {searchResults.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">
                      Found {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleReset}
                      className="h-8 text-xs"
                    >
                      Clear
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {searchResults.map((project) => {
                      const StatusIcon = getStatusIcon(project.status)
                      return (
                        <Card key={project.id} className="border-border hover:border-primary/50 transition-colors">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 space-y-3">
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <Building2 className="h-4 w-4 text-muted-foreground" />
                                    <h3 className="font-semibold text-foreground text-base">
                                      {project.name}
                                    </h3>
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(project.status)}`}>
                                      <StatusIcon className="h-3 w-3 inline mr-1" />
                                      {project.status.replace('_', ' ').toUpperCase()}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-4 text-sm text-muted-foreground ml-6">
                                    <div className="flex items-center gap-1.5">
                                      <Hash className="h-3.5 w-3.5" />
                                      <span className="font-mono font-medium text-foreground">
                                        {project.project_id}
                                      </span>
                                    </div>
                                    {project.project_type && (
                                      <div className="flex items-center gap-1.5">
                                        <Tag className="h-3.5 w-3.5" />
                                        <span>{project.project_type}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                
                                <div className="ml-6 space-y-1.5">
                                  <div className="flex items-center gap-2 text-sm">
                                    <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                    <span className="text-muted-foreground">Customer: </span>
                                    <span className="text-foreground font-medium">{project.customer_name}</span>
                                    {project.customer_email && (
                                      <span className="text-muted-foreground">({project.customer_email})</span>
                                    )}
                                  </div>
                                  {project.details && (
                                    <div className="flex items-start gap-2 text-sm">
                                      <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                                      <span className="text-muted-foreground line-clamp-2">{project.details}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              <div className="flex gap-2 ml-4">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleOpenEditModal(project)}
                                  className="h-8"
                                >
                                  <Edit className="h-3.5 w-3.5 mr-1.5" />
                                  Edit
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setProjectToDelete(project)
                                    setShowDeleteDialog(true)
                                  }}
                                  className="h-8 text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                </div>
              )}

              {searchQuery.trim() && searchResults.length === 0 && !searching && (
                <div className="p-6 bg-muted/30 rounded-lg border border-border text-center">
                  <p className="text-sm text-muted-foreground mb-2">
                    No projects found matching "{searchQuery}"
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Try a different search term or create a new project
                  </p>
                </div>
              )}

              <div className="flex justify-between pt-2 border-t border-border">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleReset}
                  disabled={!searchQuery && searchResults.length === 0}
                >
                  Clear Search
                </Button>
                <Button 
                  type="button" 
                  onClick={handleOpenCreateModal}
                  className="bg-primary hover:bg-primary/90"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Project
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Create/Edit Project Dialog - Wizard */}
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingProject ? 'Edit Project' : 'Create New Project'}</DialogTitle>
              <DialogDescription>
                {editingProject 
                  ? 'Update project information'
                  : wizardStep === 1 
                    ? 'Step 1 of 2: Search and select a customer'
                    : 'Step 2 of 2: Enter project details'}
              </DialogDescription>
            </DialogHeader>

            {/* Step Indicator */}
            {!editingProject && (
              <div className="flex items-center gap-2 mb-6">
                <div className={`flex items-center gap-2 ${wizardStep >= 1 ? 'text-primary' : 'text-muted-foreground'}`}>
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center border-2 ${
                    wizardStep >= 1 ? 'border-primary bg-primary/10' : 'border-muted-foreground'
                  }`}>
                    {wizardStep > 1 ? <CheckCircle className="h-4 w-4" /> : <span className="text-sm font-medium">1</span>}
                  </div>
                  <span className="text-sm font-medium">Select Customer</span>
                </div>
                <div className="flex-1 h-0.5 bg-border">
                  <div className={`h-full transition-all ${wizardStep >= 2 ? 'bg-primary w-full' : 'bg-border w-0'}`} />
                </div>
                <div className={`flex items-center gap-2 ${wizardStep >= 2 ? 'text-primary' : 'text-muted-foreground'}`}>
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center border-2 ${
                    wizardStep >= 2 ? 'border-primary bg-primary/10' : 'border-muted-foreground'
                  }`}>
                    <span className="text-sm font-medium">2</span>
                  </div>
                  <span className="text-sm font-medium">Project Details</span>
                </div>
              </div>
            )}

            {wizardStep === 1 && !editingProject ? (
              /* Step 1: Customer Selection */
              <div className="space-y-4">
                <form onSubmit={handleCustomerSearch} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="customer_search" className="text-sm font-medium">
                      Search Customer <span className="text-destructive">*</span>
                    </Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="customer_search"
                          placeholder="Search by customer ID, name, company, or email"
                          value={customerSearchQuery}
                          onChange={(e) => {
                            setCustomerSearchQuery(e.target.value)
                            if (e.target.value.trim() === '') {
                              setCustomerSearchResults([])
                            }
                          }}
                          className="pl-10 h-10"
                          autoFocus
                        />
                      </div>
                      <Button 
                        type="submit" 
                        disabled={searchingCustomer || !customerSearchQuery.trim()}
                        className="h-10"
                      >
                        {searchingCustomer ? (
                          <LoadingMeter />
                        ) : (
                          <>
                            <Search className="h-4 w-4 mr-2" />
                            Search
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </form>

                {customerSearchResults.length > 0 && (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    <p className="text-sm font-medium text-foreground">
                      Select a customer:
                    </p>
                    {customerSearchResults.map((customer) => (
                      <Card 
                        key={customer.id} 
                        className="border-border hover:border-primary/50 cursor-pointer transition-colors"
                        onClick={() => handleSelectCustomer(customer)}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium text-foreground">{customer.full_name}</span>
                              </div>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground ml-6">
                                {customer.customer_id && (
                                  <div className="flex items-center gap-1.5">
                                    <Hash className="h-3.5 w-3.5" />
                                    <span className="font-mono">{customer.customer_id}</span>
                                  </div>
                                )}
                                {customer.email && (
                                  <div className="flex items-center gap-1.5">
                                    <Mail className="h-3.5 w-3.5" />
                                    <span>{customer.email}</span>
                                  </div>
                                )}
                                {customer.company_name && (
                                  <div className="flex items-center gap-1.5">
                                    <Building2 className="h-3.5 w-3.5" />
                                    <span>{customer.company_name}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <Button variant="ghost" size="sm" className="h-8">
                              Select
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {customerSearchQuery.trim() && customerSearchResults.length === 0 && !searchingCustomer && (
                  <div className="p-4 bg-muted/30 rounded-lg border border-border text-center">
                    <p className="text-sm text-muted-foreground">
                      No customers found matching "{customerSearchQuery}"
                    </p>
                  </div>
                )}

                <DialogFooter>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleCloseCreateModal}
                    className="h-10"
                  >
                    Cancel
                  </Button>
                </DialogFooter>
              </div>
            ) : (
              /* Step 2: Project Details */
              <form onSubmit={editingProject ? handleUpdate : handleCreate} className="space-y-5">
                {selectedCustomer && (
                  <div className="p-4 bg-muted/50 rounded-lg border border-border">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">Selected Customer</p>
                        <div className="flex items-center gap-2 mt-1">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-foreground">{selectedCustomer.full_name}</span>
                          {selectedCustomer.customer_id && (
                            <span className="text-xs text-muted-foreground font-mono">
                              ({selectedCustomer.customer_id})
                            </span>
                          )}
                        </div>
                      </div>
                      {!editingProject && (
                        <Button 
                          type="button"
                          variant="ghost" 
                          size="sm"
                          onClick={handleBackToCustomerSelection}
                          className="h-8"
                        >
                          Change
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                <div>
                  <Label htmlFor="project_name" className="text-sm font-medium">
                    Project Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="project_name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="mt-1.5 h-10"
                    placeholder="e.g., Mining Project Phase 1"
                  />
                </div>

                <div>
                  <Label htmlFor="project_type" className="text-sm font-medium">Project Type</Label>
                  <Input
                    id="project_type"
                    value={formData.project_type}
                    onChange={(e) => setFormData({ ...formData, project_type: e.target.value })}
                    className="mt-1.5 h-10"
                    placeholder="e.g., Mining, Construction, Research"
                  />
                </div>

                <div>
                  <Label htmlFor="project_status" className="text-sm font-medium">Status</Label>
                  <select
                    id="project_status"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full mt-1.5 h-10 px-3 py-2 rounded-md border border-input bg-background text-foreground"
                  >
                    <option value="active">Active</option>
                    <option value="on_hold">On Hold</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="project_details" className="text-sm font-medium">Project Details</Label>
                  <textarea
                    id="project_details"
                    className="w-full min-h-[120px] px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm mt-1.5 resize-y"
                    value={formData.details}
                    onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                    placeholder="Describe the project, its scope, timeline, and any relevant information..."
                  />
                </div>

                <DialogFooter>
                  {!editingProject && (
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={handleBackToCustomerSelection}
                      className="h-10"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Back
                    </Button>
                  )}
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleCloseCreateModal}
                    className="h-10"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={creating || (!editingProject && formData.customer_id === 0)}
                    className="h-10 px-6"
                  >
                    {creating ? (
                      <>
                        <LoadingMeter />
                        <span className="ml-2">{editingProject ? 'Updating...' : 'Creating...'}</span>
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        {editingProject ? 'Update Project' : 'Create Project'}
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Project</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete the project "{projectToDelete?.name}"? This action cannot be undone and all associated data will be permanently removed.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowDeleteDialog(false)
                  setProjectToDelete(null)
                }}
              >
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleDelete}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Project
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}

export default Projects
