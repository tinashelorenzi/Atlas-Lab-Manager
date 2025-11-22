import { useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { customerService, type Customer, type CustomerCreate } from '@/services/customerService'
import { Search, Plus, X, Edit, Trash2, User, Mail, Phone, Building2, MapPin, FileText, Hash } from 'lucide-react'
import { LoadingMeter } from '@/components/ui/loading'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export function Customers() {
  const [searchQuery, setSearchQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<Customer[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [formData, setFormData] = useState<CustomerCreate>({
    full_name: '',
    email: '',
    phone: '',
    company_name: '',
    address: '',
    notes: '',
  })
  const [sendWelcomeEmail, setSendWelcomeEmail] = useState(true)
  const [creating, setCreating] = useState(false)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) {
      return
    }

    try {
      setSearching(true)
      const results = await customerService.search(searchQuery.trim())
      setSearchResults(results)
    } catch (error: any) {
      console.error('Failed to search customers:', error)
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setCreating(true)
      const newCustomer = await customerService.create(formData, sendWelcomeEmail)
      handleCloseCreateModal()
      // Search for the newly created customer
      setSearchQuery(newCustomer.customer_id)
      // Trigger search after a brief delay to ensure customer is in DB
      setTimeout(async () => {
        try {
          setSearching(true)
          const results = await customerService.search(newCustomer.customer_id)
          setSearchResults(results)
        } catch (error: any) {
          console.error('Failed to search customer:', error)
        } finally {
          setSearching(false)
        }
      }, 500)
    } catch (error) {
      console.error('Failed to create customer:', error)
    } finally {
      setCreating(false)
    }
  }

  const handleOpenCreateModal = () => {
    setFormData({
      full_name: '',
      email: '',
      phone: '',
      company_name: '',
      address: '',
      notes: '',
    })
    setSendWelcomeEmail(true)
    setShowCreateModal(true)
  }

  const handleCloseCreateModal = () => {
    setShowCreateModal(false)
    setFormData({
      full_name: '',
      email: '',
      phone: '',
      company_name: '',
      address: '',
      notes: '',
    })
  }

  const handleReset = () => {
    setSearchQuery('')
    setSearchResults([])
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Customers</h1>
          <p className="text-muted-foreground mt-1.5 text-sm">
            Search for customers by ID, name, company, or email. Supports fuzzy matching for misspelled searches.
          </p>
        </div>

        <Card className="border-border">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-semibold">Search Customers</CardTitle>
              <CardDescription className="text-sm">
                Enter a customer ID, name, company name, or email address
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
                        placeholder="e.g., A1B2C, John Doe, Acme Corp, john@example.com"
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
                      {searchResults.map((customer) => (
                        <Card key={customer.id} className="border-border hover:border-primary/50 transition-colors">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 space-y-3">
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <User className="h-4 w-4 text-muted-foreground" />
                                    <h3 className="font-semibold text-foreground text-base">
                                      {customer.full_name}
                                    </h3>
                                  </div>
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground ml-6">
                                    <Hash className="h-3.5 w-3.5" />
                                    <span className="font-mono font-medium text-foreground">
                                      {customer.customer_id}
                                    </span>
                                  </div>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 ml-6">
                                  {customer.email && (
                                    <div className="flex items-center gap-2 text-sm">
                                      <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                      <span className="text-muted-foreground truncate">{customer.email}</span>
                                    </div>
                                  )}
                                  {customer.phone && (
                                    <div className="flex items-center gap-2 text-sm">
                                      <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                      <span className="text-muted-foreground">{customer.phone}</span>
                                    </div>
                                  )}
                                  {customer.company_name && (
                                    <div className="flex items-center gap-2 text-sm">
                                      <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                      <span className="text-muted-foreground truncate">{customer.company_name}</span>
                                    </div>
                                  )}
                                  {customer.address && (
                                    <div className="flex items-start gap-2 text-sm md:col-span-2">
                                      <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                                      <span className="text-muted-foreground line-clamp-2">{customer.address}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              <div className="flex gap-2 ml-4">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setFormData({
                                      full_name: customer.full_name,
                                      email: customer.email || '',
                                      phone: customer.phone || '',
                                      company_name: customer.company_name || '',
                                      address: customer.address || '',
                                      notes: customer.notes || '',
                                    })
                                    setShowCreateModal(true)
                                  }}
                                  className="h-8"
                                >
                                  <Edit className="h-3.5 w-3.5 mr-1.5" />
                                  Edit
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {searchQuery.trim() && searchResults.length === 0 && !searching && (
                  <div className="p-6 bg-muted/30 rounded-lg border border-border text-center">
                    <p className="text-sm text-muted-foreground mb-2">
                      No customers found matching "{searchQuery}"
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Try a different search term or create a new customer
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
                    Create New Customer
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

        {/* Create Customer Dialog */}
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Customer</DialogTitle>
              <DialogDescription>
                Add a new customer to the system. A unique Customer ID will be automatically generated.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-5">
              <div>
                <Label htmlFor="dialog_full_name" className="text-sm font-medium">
                  Full Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="dialog_full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  required
                  className="mt-1.5 h-10"
                  placeholder="Enter customer's full name"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="dialog_email" className="text-sm font-medium">Email</Label>
                  <Input
                    id="dialog_email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="mt-1.5 h-10"
                    placeholder="customer@example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="dialog_phone" className="text-sm font-medium">Phone</Label>
                  <Input
                    id="dialog_phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="mt-1.5 h-10"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="dialog_company_name" className="text-sm font-medium">Company Name</Label>
                <Input
                  id="dialog_company_name"
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  className="mt-1.5 h-10"
                  placeholder="Company or organization name"
                />
              </div>

              <div>
                <Label htmlFor="dialog_address" className="text-sm font-medium">Address</Label>
                <Input
                  id="dialog_address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="mt-1.5 h-10"
                  placeholder="Street address, city, state, ZIP"
                />
              </div>

              <div>
                <Label htmlFor="dialog_notes" className="text-sm font-medium">Notes</Label>
                <textarea
                  id="dialog_notes"
                  className="w-full min-h-[100px] px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm mt-1.5 resize-y"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes or information about the customer"
                />
              </div>

              {formData.email && (
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border">
                  <div className="flex-1">
                    <Label htmlFor="dialog_send_welcome_email" className="text-sm font-medium cursor-pointer">
                      Send Welcome Email
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Send a welcome email to <span className="font-medium text-foreground">{formData.email}</span> with their Customer ID
                    </p>
                  </div>
                  <Switch
                    id="dialog_send_welcome_email"
                    checked={sendWelcomeEmail}
                    onCheckedChange={setSendWelcomeEmail}
                    className="ml-4"
                  />
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
                <Button 
                  type="submit" 
                  disabled={creating}
                  className="h-10 px-6"
                >
                  {creating ? (
                    <>
                      <LoadingMeter />
                      <span className="ml-2">Creating...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Customer
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}

export default Customers
