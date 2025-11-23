import { useState, useEffect, useRef } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { sampleService, type Sample, type SampleCreate } from '@/services/sampleService'
import { customerService, type Customer, type CustomerCreate } from '@/services/customerService'
import { projectService, type ProjectWithCustomer } from '@/services/projectService'
import { departmentService, type Department } from '@/services/departmentService'
import { sampleTypeService, type SampleType } from '@/services/sampleTypeService'
import { Search, Plus, X, Edit, Trash2, Hash, User, Building2, CheckCircle, ArrowLeft, ArrowRight, FlaskConical, Printer, Camera, Eye, Clock, UserCircle } from 'lucide-react'
import { LoadingMeter } from '@/components/ui/loading'
import { SampleSticker } from '@/components/SampleSticker'

type WizardStep = 1 | 2 | 3 | 4 | 5

export function TestSamples() {
  const [searchQuery, setSearchQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<Sample[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showStickerModal, setShowStickerModal] = useState(false)
  const [selectedSampleForSticker, setSelectedSampleForSticker] = useState<Sample | null>(null)
  const [showScanner, setShowScanner] = useState(false)
  const scannerContainerRef = useRef<HTMLDivElement>(null)
  const scannerInstanceRef = useRef<Html5Qrcode | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [selectedSampleDetails, setSelectedSampleDetails] = useState<{
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
  } | null>(null)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [wizardStep, setWizardStep] = useState<WizardStep>(1)
  
  // Step 1: Customer
  const [customerSearchQuery, setCustomerSearchQuery] = useState('')
  const [searchingCustomer, setSearchingCustomer] = useState(false)
  const [customerSearchResults, setCustomerSearchResults] = useState<Customer[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [showCreateCustomerModal, setShowCreateCustomerModal] = useState(false)
  const [newCustomerData, setNewCustomerData] = useState<CustomerCreate>({
    full_name: '',
    email: '',
    phone: '',
    company_name: '',
    address: '',
    notes: '',
  })
  
  // Step 2: Project
  const [customerProjects, setCustomerProjects] = useState<ProjectWithCustomer[]>([])
  const [selectedProject, setSelectedProject] = useState<ProjectWithCustomer | null>(null)
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false)
  const [newProjectData, setNewProjectData] = useState({
    name: '',
    project_type: '',
    details: '',
    status: 'active' as const,
  })
  
  // Step 3: Sample Details
  const [sampleTypes, setSampleTypes] = useState<SampleType[]>([])
  const [sampleFormData, setSampleFormData] = useState({
    sample_type_id: 0,
    name: '',
    volume: '',
    conditions: '',
    notes: '',
    is_batch: false,
    batch_size: 0,
  })
  
  // Step 4: Departments
  const [departments, setDepartments] = useState<Department[]>([])
  const [selectedDepartmentIds, setSelectedDepartmentIds] = useState<number[]>([])
  
  // Step 5: Test Types
  const [availableTestTypes, setAvailableTestTypes] = useState<Array<{ id: number; name: string; department_id: number; department_name: string }>>([])
  const [selectedTestTypeIds, setSelectedTestTypeIds] = useState<number[]>([])
  
  const [creating, setCreating] = useState(false)
  const [creatingCustomer, setCreatingCustomer] = useState(false)
  const [creatingProject, setCreatingProject] = useState(false)

  useEffect(() => {
    loadInitialData()
  }, [])

  useEffect(() => {
    if (selectedCustomer) {
      loadCustomerProjects()
    }
  }, [selectedCustomer])

  useEffect(() => {
    if (selectedDepartmentIds.length > 0) {
      loadAvailableTestTypes()
    } else {
      setAvailableTestTypes([])
      setSelectedTestTypeIds([])
    }
  }, [selectedDepartmentIds])

  const loadInitialData = async () => {
    try {
      const [depts, sts] = await Promise.all([
        departmentService.getAll(),
        sampleTypeService.getAll(),
      ])
      setDepartments(depts)
      setSampleTypes(sts)
    } catch (error) {
      console.error('Failed to load initial data:', error)
    }
  }

  const loadCustomerProjects = async () => {
    if (!selectedCustomer) return
    try {
      const projects = await projectService.getAll(selectedCustomer.id)
      setCustomerProjects(projects)
    } catch (error) {
      console.error('Failed to load projects:', error)
    }
  }

  const loadAvailableTestTypes = async () => {
    const allTestTypes: Array<{ id: number; name: string; department_id: number; department_name: string }> = []
    for (const deptId of selectedDepartmentIds) {
      const dept = departments.find(d => d.id === deptId)
      if (dept) {
        dept.test_types.forEach(tt => {
          if (tt.is_active) {
            allTestTypes.push({
              id: tt.id,
              name: tt.name,
              department_id: dept.id,
              department_name: dept.name,
            })
          }
        })
      }
    }
    setAvailableTestTypes(allTestTypes)
  }

  const handleCustomerSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!customerSearchQuery.trim()) return
    try {
      setSearchingCustomer(true)
      const results = await customerService.search(customerSearchQuery.trim())
      setCustomerSearchResults(results)
    } catch (error) {
      console.error('Failed to search customers:', error)
    } finally {
      setSearchingCustomer(false)
    }
  }

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setCreatingCustomer(true)
      const newCustomer = await customerService.create(newCustomerData, false)
      setSelectedCustomer(newCustomer)
      setShowCreateCustomerModal(false)
      setNewCustomerData({
        full_name: '',
        email: '',
        phone: '',
        company_name: '',
        address: '',
        notes: '',
      })
      setWizardStep(2)
    } catch (error) {
      console.error('Failed to create customer:', error)
    } finally {
      setCreatingCustomer(false)
    }
  }

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCustomer) return
    try {
      setCreatingProject(true)
      const newProject = await projectService.create({
        customer_id: selectedCustomer.id,
        ...newProjectData,
      })
      await loadCustomerProjects()
      setSelectedProject(newProject as any)
      setShowCreateProjectModal(false)
      setNewProjectData({
        name: '',
        project_type: '',
        details: '',
        status: 'active',
      })
    } catch (error) {
      console.error('Failed to create project:', error)
    } finally {
      setCreatingProject(false)
    }
  }

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!searchQuery.trim()) return
    try {
      setSearching(true)
      const results = await sampleService.search(searchQuery.trim())
      setSearchResults(results)
    } catch (error) {
      console.error('Failed to search samples:', error)
    } finally {
      setSearching(false)
    }
  }

  const handleOpenScanner = () => {
    setShowScanner(true)
  }

  const handleCloseScanner = async () => {
    // Stop scanner before closing
    if (scannerInstanceRef.current) {
      try {
        if (scannerInstanceRef.current.isScanning) {
          await scannerInstanceRef.current.stop()
        }
        scannerInstanceRef.current.clear()
        scannerInstanceRef.current = null
      } catch (err) {
        console.error('Error stopping scanner:', err)
      }
    }
    setShowScanner(false)
  }

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null

    if (showScanner) {
      // Wait a bit for the dialog to fully render
      const initScanner = async () => {
        // Check if element exists
        const element = document.getElementById('scanner-container')
        if (!element) {
          console.error('Scanner container element not found')
          return
        }

        try {
          const config = {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          }

          scannerInstanceRef.current = new Html5Qrcode('scanner-container')
          
          await scannerInstanceRef.current.start(
            { facingMode: 'environment' },
            config,
            (decodedText) => {
              // Successfully scanned
              setSearchQuery(decodedText)
              setShowScanner(false)
              // Trigger search after a short delay
              setTimeout(() => {
                handleSearch()
              }, 100)
            },
            (errorMessage) => {
              // Ignore scanning errors (they're frequent while scanning)
            }
          )
        } catch (err) {
          console.error('Unable to start scanner:', err)
          scannerInstanceRef.current = null
        }
      }

      // Small delay to ensure DOM is ready
      timer = setTimeout(() => {
        initScanner()
      }, 300)

      return () => {
        if (timer) {
          clearTimeout(timer)
        }
        const stopScanner = async () => {
          if (scannerInstanceRef.current) {
            try {
              if (scannerInstanceRef.current.isScanning) {
                await scannerInstanceRef.current.stop()
              }
              scannerInstanceRef.current.clear()
              scannerInstanceRef.current = null
            } catch (err) {
              console.error('Error stopping scanner:', err)
            }
          }
        }
        stopScanner()
      }
    } else {
      // When scanner is closed, ensure it's stopped
      if (scannerInstanceRef.current) {
        const stopScanner = async () => {
          try {
            if (scannerInstanceRef.current && scannerInstanceRef.current.isScanning) {
              await scannerInstanceRef.current.stop()
            }
            if (scannerInstanceRef.current) {
              scannerInstanceRef.current.clear()
              scannerInstanceRef.current = null
            }
          } catch (err) {
            console.error('Error stopping scanner:', err)
          }
        }
        stopScanner()
      }
    }
  }, [showScanner])

  const handleCreateSample = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCustomer || sampleFormData.sample_type_id === 0 || selectedDepartmentIds.length === 0 || selectedTestTypeIds.length === 0) {
      return
    }
    try {
      setCreating(true)
      const sampleData: SampleCreate = {
        customer_id: selectedCustomer.id,
        project_id: selectedProject?.id || null,
        sample_type_id: sampleFormData.sample_type_id,
        name: sampleFormData.name,
        volume: sampleFormData.volume || null,
        conditions: sampleFormData.conditions || null,
        notes: sampleFormData.notes || null,
        is_batch: sampleFormData.is_batch,
        batch_size: sampleFormData.is_batch ? sampleFormData.batch_size : null,
        department_ids: selectedDepartmentIds,
        test_type_ids: selectedTestTypeIds,
      }
      const newSample = await sampleService.create(sampleData)
      handleCloseCreateModal()
      // Show sticker modal after creation
      setSelectedSampleForSticker(newSample)
      setShowStickerModal(true)
      setSearchQuery(newSample.sample_id)
      setTimeout(() => handleSearch(e), 500)
    } catch (error) {
      console.error('Failed to create sample:', error)
    } finally {
      setCreating(false)
    }
  }

  const handleOpenCreateModal = () => {
    setWizardStep(1)
    setSelectedCustomer(null)
    setSelectedProject(null)
    setCustomerSearchQuery('')
    setCustomerSearchResults([])
    setCustomerProjects([])
    setSampleFormData({
      sample_type_id: 0,
      name: '',
      volume: '',
      conditions: '',
      notes: '',
      is_batch: false,
      batch_size: 0,
    })
    setSelectedDepartmentIds([])
    setSelectedTestTypeIds([])
    setShowCreateModal(true)
  }

  const handleCloseCreateModal = () => {
    setShowCreateModal(false)
    setWizardStep(1)
    setSelectedCustomer(null)
    setSelectedProject(null)
    setCustomerSearchQuery('')
    setCustomerSearchResults([])
    setCustomerProjects([])
    setSampleFormData({
      sample_type_id: 0,
      name: '',
      volume: '',
      conditions: '',
      notes: '',
      is_batch: false,
      batch_size: 0,
    })
    setSelectedDepartmentIds([])
    setSelectedTestTypeIds([])
  }

  const canProceedToNextStep = () => {
    switch (wizardStep) {
      case 1:
        return selectedCustomer !== null
      case 2:
        return true // Project is optional
      case 3:
        return sampleFormData.sample_type_id !== 0 && sampleFormData.name.trim() !== ''
      case 4:
        return selectedDepartmentIds.length > 0
      case 5:
        return selectedTestTypeIds.length > 0
      default:
        return false
    }
  }

  const handleNext = () => {
    if (canProceedToNextStep() && wizardStep < 5) {
      setWizardStep((wizardStep + 1) as WizardStep)
    }
  }

  const handleBack = () => {
    if (wizardStep > 1) {
      setWizardStep((wizardStep - 1) as WizardStep)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Test Samples</h1>
          <p className="text-muted-foreground mt-1.5 text-sm">
            Record and manage test samples in your laboratory
          </p>
        </div>

        <Card className="border-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-semibold">Search Samples</CardTitle>
            <CardDescription className="text-sm">
              Enter a sample ID, name, or customer name
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by sample ID, name, or customer"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-12 h-11"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleOpenScanner}
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-9 w-9 p-0 hover:bg-muted"
                    title="Scan QR/Barcode"
                  >
                    <Camera className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
                <Button type="submit" disabled={searching || !searchQuery.trim()} className="h-11">
                  {searching ? <LoadingMeter /> : <><Search className="h-4 w-4 mr-2" />Search</>}
                </Button>
              </div>

              {searchResults.length > 0 && (
                <div className="space-y-2">
                  {searchResults.map((sample) => (
                    <Card key={sample.id} className="border-border">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <FlaskConical className="h-4 w-4 text-muted-foreground" />
                              <span className="font-semibold">{sample.name}</span>
                              <span className="text-xs font-mono text-muted-foreground">({sample.sample_id})</span>
                            </div>
                            <div className="text-sm text-muted-foreground ml-6">
                              Customer: {sample.customer_name} | Type: {sample.sample_type_name}
                              {sample.project_name && ` | Project: ${sample.project_name}`}
                            </div>
                          </div>
                          <div className="flex gap-2 ml-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                try {
                                  setLoadingDetails(true)
                                  const details = await sampleService.getDetails(sample.id)
                                  setSelectedSampleDetails(details)
                                  setShowDetailsModal(true)
                                } catch (error) {
                                  console.error('Failed to load sample details:', error)
                                } finally {
                                  setLoadingDetails(false)
                                }
                              }}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedSampleForSticker(sample)
                                setShowStickerModal(true)
                              }}
                            >
                              <Printer className="h-4 w-4 mr-2" />
                              View Sticker
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              <div className="flex justify-end pt-2 border-t border-border">
                <Button type="button" onClick={handleOpenCreateModal} className="bg-primary hover:bg-primary/90">
                  <Plus className="h-4 w-4 mr-2" />
                  Record New Sample
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Sample Creation Wizard */}
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Record New Sample</DialogTitle>
              <DialogDescription>
                Step {wizardStep} of 5: {
                  wizardStep === 1 ? 'Select Customer' :
                  wizardStep === 2 ? 'Select Project (Optional)' :
                  wizardStep === 3 ? 'Sample Details' :
                  wizardStep === 4 ? 'Select Departments' :
                  'Select Test Types'
                }
              </DialogDescription>
            </DialogHeader>

            {/* Step Indicator */}
            <div className="flex items-center gap-2 mb-6">
              {[1, 2, 3, 4, 5].map((step) => (
                <div key={step} className="flex items-center flex-1">
                  <div className={`flex items-center gap-2 ${wizardStep >= step ? 'text-primary' : 'text-muted-foreground'}`}>
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center border-2 ${
                      wizardStep >= step ? 'border-primary bg-primary/10' : 'border-muted-foreground'
                    }`}>
                      {wizardStep > step ? <CheckCircle className="h-4 w-4" /> : <span className="text-sm font-medium">{step}</span>}
                    </div>
                    {step < 5 && (
                      <div className={`flex-1 h-0.5 ${wizardStep > step ? 'bg-primary' : 'bg-border'}`} />
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Step 1: Customer Selection */}
            {wizardStep === 1 && (
              <div className="space-y-4">
                <form onSubmit={handleCustomerSearch} className="space-y-4">
                  <div>
                    <Label>Search Customer *</Label>
                    <div className="flex gap-2 mt-1.5">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
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
                      <Button type="submit" disabled={searchingCustomer || !customerSearchQuery.trim()} className="h-10">
                        {searchingCustomer ? <LoadingMeter /> : <><Search className="h-4 w-4 mr-2" />Search</>}
                      </Button>
                    </div>
                  </div>
                </form>

                {customerSearchResults.length > 0 && (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {customerSearchResults.map((customer) => (
                      <Card
                        key={customer.id}
                        className={`border-border cursor-pointer transition-colors ${
                          selectedCustomer?.id === customer.id ? 'border-primary bg-primary/5' : 'hover:border-primary/50'
                        }`}
                        onClick={() => setSelectedCustomer(customer)}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">{customer.full_name}</span>
                              </div>
                              <div className="text-sm text-muted-foreground ml-6">
                                {customer.customer_id && <span className="font-mono">{customer.customer_id}</span>}
                                {customer.email && <span className="ml-2">{customer.email}</span>}
                              </div>
                            </div>
                            {selectedCustomer?.id === customer.id && (
                              <CheckCircle className="h-5 w-5 text-primary" />
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2 pt-2 border-t">
                  <Button type="button" variant="outline" onClick={() => setShowCreateCustomerModal(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Customer
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Project Selection */}
            {wizardStep === 2 && selectedCustomer && (
              <div className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm font-medium">Selected Customer: {selectedCustomer.full_name}</p>
                </div>

                {customerProjects.length > 0 && (
                  <div className="space-y-2">
                    <Label>Select Project (Optional)</Label>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      <Card
                        className={`border-border cursor-pointer transition-colors ${
                          selectedProject === null ? 'border-primary bg-primary/5' : 'hover:border-primary/50'
                        }`}
                        onClick={() => setSelectedProject(null)}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">No Project</span>
                            {selectedProject === null && <CheckCircle className="h-5 w-5 text-primary" />}
                          </div>
                        </CardContent>
                      </Card>
                      {customerProjects.map((project) => (
                        <Card
                          key={project.id}
                          className={`border-border cursor-pointer transition-colors ${
                            selectedProject?.id === project.id ? 'border-primary bg-primary/5' : 'hover:border-primary/50'
                          }`}
                          onClick={() => setSelectedProject(project)}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="font-medium">{project.name}</span>
                                {project.project_type && (
                                  <span className="text-sm text-muted-foreground ml-2">({project.project_type})</span>
                                )}
                              </div>
                              {selectedProject?.id === project.id && (
                                <CheckCircle className="h-5 w-5 text-primary" />
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                <Button type="button" variant="outline" onClick={() => setShowCreateProjectModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Project
                </Button>
              </div>
            )}

            {/* Step 3: Sample Details */}
            {wizardStep === 3 && (
              <form className="space-y-4">
                <div>
                  <Label htmlFor="sample_type">Sample Type *</Label>
                  <select
                    id="sample_type"
                    value={sampleFormData.sample_type_id}
                    onChange={(e) => setSampleFormData({ ...sampleFormData, sample_type_id: parseInt(e.target.value) })}
                    required
                    className="w-full mt-1.5 h-10 px-3 py-2 rounded-md border border-input bg-background text-foreground"
                  >
                    <option value="0">Select sample type...</option>
                    {sampleTypes.filter(st => st.is_active).map((st) => (
                      <option key={st.id} value={st.id}>{st.name}</option>
                    ))}
                  </select>
                  {sampleTypes.filter(st => st.is_active).length === 0 && (
                    <p className="text-xs text-muted-foreground mt-1.5">
                      No active sample types available. Please create sample types in Settings.
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="sample_name">Sample Name/Identifier *</Label>
                  <Input
                    id="sample_name"
                    value={sampleFormData.name}
                    onChange={(e) => setSampleFormData({ ...sampleFormData, name: e.target.value })}
                    required
                    className="mt-1.5 h-10"
                    placeholder="e.g., Sample-001, Batch-A"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="sample_volume">Volume</Label>
                    <Input
                      id="sample_volume"
                      value={sampleFormData.volume}
                      onChange={(e) => setSampleFormData({ ...sampleFormData, volume: e.target.value })}
                      className="mt-1.5 h-10"
                      placeholder="e.g., 500ml, 2kg"
                    />
                  </div>
                  <div>
                    <Label htmlFor="sample_conditions">Conditions/Container</Label>
                    <Input
                      id="sample_conditions"
                      value={sampleFormData.conditions}
                      onChange={(e) => setSampleFormData({ ...sampleFormData, conditions: e.target.value })}
                      className="mt-1.5 h-10"
                      placeholder="e.g., Glass bottle, Refrigerated"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="sample_notes">Notes</Label>
                  <textarea
                    id="sample_notes"
                    className="w-full min-h-[100px] px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm mt-1.5"
                    value={sampleFormData.notes}
                    onChange={(e) => setSampleFormData({ ...sampleFormData, notes: e.target.value })}
                    placeholder="Additional notes about the sample..."
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_batch"
                    checked={sampleFormData.is_batch}
                    onCheckedChange={(checked) => setSampleFormData({ ...sampleFormData, is_batch: checked })}
                  />
                  <Label htmlFor="is_batch" className="cursor-pointer">This is a batch sample</Label>
                </div>

                {sampleFormData.is_batch && (
                  <div>
                    <Label htmlFor="batch_size">Batch Size (Number of samples)</Label>
                    <Input
                      id="batch_size"
                      type="number"
                      min="1"
                      value={sampleFormData.batch_size}
                      onChange={(e) => setSampleFormData({ ...sampleFormData, batch_size: parseInt(e.target.value) || 0 })}
                      className="mt-1.5 h-10"
                    />
                  </div>
                )}
              </form>
            )}

            {/* Step 4: Department Selection */}
            {wizardStep === 4 && (
              <div className="space-y-4">
                <Label>Select Departments * (Select at least one)</Label>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {departments.map((dept) => (
                    <Card
                      key={dept.id}
                      className={`border-border cursor-pointer transition-colors ${
                        selectedDepartmentIds.includes(dept.id) ? 'border-primary bg-primary/5' : 'hover:border-primary/50'
                      }`}
                      onClick={() => {
                        if (selectedDepartmentIds.includes(dept.id)) {
                          setSelectedDepartmentIds(selectedDepartmentIds.filter(id => id !== dept.id))
                        } else {
                          setSelectedDepartmentIds([...selectedDepartmentIds, dept.id])
                        }
                      }}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-medium">{dept.name}</span>
                            {dept.description && (
                              <p className="text-sm text-muted-foreground mt-1">{dept.description}</p>
                            )}
                          </div>
                          {selectedDepartmentIds.includes(dept.id) && (
                            <CheckCircle className="h-5 w-5 text-primary" />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Step 5: Test Type Selection */}
            {wizardStep === 5 && (
              <div className="space-y-4">
                <Label>Select Test Types * (Select at least one)</Label>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {availableTestTypes.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      No test types available. Please select departments in the previous step.
                    </p>
                  ) : (
                    availableTestTypes.map((testType) => (
                      <Card
                        key={testType.id}
                        className={`border-border cursor-pointer transition-colors ${
                          selectedTestTypeIds.includes(testType.id) ? 'border-primary bg-primary/5' : 'hover:border-primary/50'
                        }`}
                        onClick={() => {
                          if (selectedTestTypeIds.includes(testType.id)) {
                            setSelectedTestTypeIds(selectedTestTypeIds.filter(id => id !== testType.id))
                          } else {
                            setSelectedTestTypeIds([...selectedTestTypeIds, testType.id])
                          }
                        }}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-medium">{testType.name}</span>
                              <p className="text-xs text-muted-foreground mt-1">Department: {testType.department_name}</p>
                            </div>
                            {selectedTestTypeIds.includes(testType.id) && (
                              <CheckCircle className="h-5 w-5 text-primary" />
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            )}

            <DialogFooter className="mt-6">
              <div className="flex items-center justify-between w-full">
                <Button type="button" variant="outline" onClick={handleBack} disabled={wizardStep === 1}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={handleCloseCreateModal}>
                    Cancel
                  </Button>
                  {wizardStep < 5 ? (
                    <Button type="button" onClick={handleNext} disabled={!canProceedToNextStep()}>
                      Next
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  ) : (
                    <Button type="button" onClick={handleCreateSample} disabled={creating || !canProceedToNextStep()}>
                      {creating ? <><LoadingMeter /> Creating...</> : <><Plus className="h-4 w-4 mr-2" />Create Sample</>}
                    </Button>
                  )}
                </div>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create Customer Modal */}
        <Dialog open={showCreateCustomerModal} onOpenChange={setShowCreateCustomerModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Customer</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateCustomer} className="space-y-4">
              <div>
                <Label htmlFor="customer_name">Full Name *</Label>
                <Input
                  id="customer_name"
                  value={newCustomerData.full_name}
                  onChange={(e) => setNewCustomerData({ ...newCustomerData, full_name: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customer_email">Email</Label>
                  <Input
                    id="customer_email"
                    type="email"
                    value={newCustomerData.email}
                    onChange={(e) => setNewCustomerData({ ...newCustomerData, email: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="customer_phone">Phone</Label>
                  <Input
                    id="customer_phone"
                    value={newCustomerData.phone}
                    onChange={(e) => setNewCustomerData({ ...newCustomerData, phone: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="customer_company">Company Name</Label>
                <Input
                  id="customer_company"
                  value={newCustomerData.company_name}
                  onChange={(e) => setNewCustomerData({ ...newCustomerData, company_name: e.target.value })}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowCreateCustomerModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={creatingCustomer}>
                  {creatingCustomer ? <LoadingMeter /> : 'Create Customer'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Create Project Modal */}
        <Dialog open={showCreateProjectModal} onOpenChange={setShowCreateProjectModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <Label htmlFor="project_name">Project Name *</Label>
                <Input
                  id="project_name"
                  value={newProjectData.name}
                  onChange={(e) => setNewProjectData({ ...newProjectData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="project_type">Project Type</Label>
                <Input
                  id="project_type"
                  value={newProjectData.project_type}
                  onChange={(e) => setNewProjectData({ ...newProjectData, project_type: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="project_details">Details</Label>
                <textarea
                  id="project_details"
                  className="w-full min-h-[100px] px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm"
                  value={newProjectData.details}
                  onChange={(e) => setNewProjectData({ ...newProjectData, details: e.target.value })}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowCreateProjectModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={creatingProject}>
                  {creatingProject ? <LoadingMeter /> : 'Create Project'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Sticker Modal */}
        <Dialog open={showStickerModal} onOpenChange={setShowStickerModal}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Sample Sticker - {selectedSampleForSticker?.sample_id}</DialogTitle>
              <DialogDescription>
                Print this sticker to attach to the sample container
              </DialogDescription>
            </DialogHeader>
            {selectedSampleForSticker && (
              <SampleSticker 
                sample={selectedSampleForSticker} 
                onClose={() => setShowStickerModal(false)}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Scanner Modal */}
        <Dialog open={showScanner} onOpenChange={setShowScanner}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Scan QR Code or Barcode</DialogTitle>
              <DialogDescription>
                Point your camera at a QR code or barcode to scan
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div
                id="scanner-container"
                ref={scannerContainerRef}
                className="w-full rounded-lg overflow-hidden bg-black"
                style={{ minHeight: '300px' }}
              ></div>
              <div className="flex justify-end">
                <Button variant="outline" onClick={handleCloseScanner}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Sample Details Modal */}
        <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Sample Details - {selectedSampleDetails?.sample.sample_id}</DialogTitle>
              <DialogDescription>
                Complete sample information and activity tracking
              </DialogDescription>
            </DialogHeader>
            {selectedSampleDetails && (
              <div className="space-y-6">
                {/* Sample Information */}
                <Card>
                  <CardHeader>
                    <CardTitle>Sample Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-muted-foreground">Sample ID</Label>
                        <p className="font-mono font-semibold">{selectedSampleDetails.sample.sample_id}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Name</Label>
                        <p>{selectedSampleDetails.sample.name}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Status</Label>
                        <p className="capitalize">{selectedSampleDetails.sample.status}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Type</Label>
                        <p>{selectedSampleDetails.sample.sample_type_name}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Volume</Label>
                        <p>{selectedSampleDetails.sample.volume || 'N/A'}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Batch</Label>
                        <p>{selectedSampleDetails.sample.is_batch ? `Yes (${selectedSampleDetails.sample.batch_size} samples)` : 'No'}</p>
                      </div>
                    </div>
                    {selectedSampleDetails.sample.conditions && (
                      <div>
                        <Label className="text-muted-foreground">Conditions</Label>
                        <p>{selectedSampleDetails.sample.conditions}</p>
                      </div>
                    )}
                    {selectedSampleDetails.sample.notes && (
                      <div>
                        <Label className="text-muted-foreground">Notes</Label>
                        <p>{selectedSampleDetails.sample.notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Customer Information */}
                <Card>
                  <CardHeader>
                    <CardTitle>Customer Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <Label className="text-muted-foreground">Customer</Label>
                      <p>{selectedSampleDetails.sample.customer_name}</p>
                    </div>
                    {selectedSampleDetails.sample.customer_email && (
                      <div>
                        <Label className="text-muted-foreground">Email</Label>
                        <p>{selectedSampleDetails.sample.customer_email}</p>
                      </div>
                    )}
                    {selectedSampleDetails.sample.customer_phone && (
                      <div>
                        <Label className="text-muted-foreground">Phone</Label>
                        <p>{selectedSampleDetails.sample.customer_phone}</p>
                      </div>
                    )}
                    {selectedSampleDetails.sample.project_name && (
                      <div>
                        <Label className="text-muted-foreground">Project</Label>
                        <p>{selectedSampleDetails.sample.project_name}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Departments & Tests */}
                <Card>
                  <CardHeader>
                    <CardTitle>Departments & Test Types</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div>
                        <Label className="text-muted-foreground">Departments</Label>
                        <p>{selectedSampleDetails.sample.department_names.join(', ') || 'None'}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Test Types</Label>
                        <p>{selectedSampleDetails.sample.test_type_names.join(', ') || 'None'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Collection Information */}
                <Card>
                  <CardHeader>
                    <CardTitle>Collection Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center gap-2">
                      <UserCircle className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <Label className="text-muted-foreground">Collected By</Label>
                        <p>{selectedSampleDetails.sample.collected_by || 'Unknown'}</p>
                      </div>
                    </div>
                    {selectedSampleDetails.sample.collected_at && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <Label className="text-muted-foreground">Collected At</Label>
                          <p>{new Date(selectedSampleDetails.sample.collected_at).toLocaleString()}</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Activity Timeline */}
                <Card>
                  <CardHeader>
                    <CardTitle>Activity Timeline</CardTitle>
                    <CardDescription>Complete history of sample activities</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {selectedSampleDetails.activities.length === 0 ? (
                        <p className="text-muted-foreground text-sm">No activities recorded</p>
                      ) : (
                        selectedSampleDetails.activities.map((activity, index) => (
                          <div key={activity.id} className="flex gap-4 pb-4 border-b border-border last:border-0">
                            <div className="flex flex-col items-center">
                              <div className="w-2 h-2 rounded-full bg-primary mt-1"></div>
                              {index < selectedSampleDetails.activities.length - 1 && (
                                <div className="w-px h-full bg-border mt-1"></div>
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <p className="font-semibold capitalize">{activity.activity_type}</p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(activity.created_at).toLocaleString()}
                                </p>
                              </div>
                              <p className="text-sm text-muted-foreground mb-1">{activity.description}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <UserCircle className="h-3 w-3" />
                                <span>{activity.user_name}</span>
                                {activity.user_email && <span>({activity.user_email})</span>}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDetailsModal(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}

export default TestSamples
