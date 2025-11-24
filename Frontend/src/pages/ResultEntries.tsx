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
import { resultEntryService, type ResultEntry, type ResultValue, type ResultValueCreate } from '@/services/resultEntryService'
import { sampleService, type Sample } from '@/services/sampleService'
import { reportService } from '@/services/reportService'
import { authService } from '@/services/authService'
import type { User } from '@/types/user'
import { Search, Plus, X, Edit, Trash2, Save, CheckCircle, FileText, FlaskConical, AlertCircle, Lock, FileCheck } from 'lucide-react'
import { LoadingMeter } from '@/components/ui/loading'

export function ResultEntries() {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<ResultEntry[]>([])
  const [selectedResultEntry, setSelectedResultEntry] = useState<ResultEntry | null>(null)
  const [showResultSheet, setShowResultSheet] = useState(false)
  const [showAddValueModal, setShowAddValueModal] = useState(false)
  const [showEditValueModal, setShowEditValueModal] = useState(false)
  const [showDeleteValueModal, setShowDeleteValueModal] = useState(false)
  const [showDeleteSheetModal, setShowDeleteSheetModal] = useState(false)
  const [showCreateSheetModal, setShowCreateSheetModal] = useState(false)
  const [editingValue, setEditingValue] = useState<ResultValue | null>(null)
  const [deletingValue, setDeletingValue] = useState<ResultValue | null>(null)
  const [selectedSample, setSelectedSample] = useState<Sample | null>(null)
  
  const [valueFormData, setValueFormData] = useState<ResultValueCreate>({
    test_type: '',
    value: '',
    unit: '',
    unit_type: '',
    notes: '',
  })
  
  const [editReason, setEditReason] = useState('')
  const [deleteReason, setDeleteReason] = useState('')
  const [sheetDeleteReason, setSheetDeleteReason] = useState('')
  
  const [loading, setLoading] = useState(false)
  const [committing, setCommitting] = useState(false)
  const [generatingReport, setGeneratingReport] = useState(false)

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await authService.getCurrentUser()
        setCurrentUser(user)
      } catch (error) {
        console.error('Failed to fetch user:', error)
      }
    }
    fetchUser()
  }, [])

  const isManagerOrAdmin = currentUser?.user_type === 'lab_administrator' || currentUser?.user_type === 'lab_manager'

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return
    try {
      setSearching(true)
      const results = await resultEntryService.search(searchQuery.trim())
      setSearchResults(results)
    } catch (error) {
      console.error('Failed to search result entries:', error)
    } finally {
      setSearching(false)
    }
  }

  const handleSearchSample = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return
    try {
      setSearching(true)
      // Search for samples
      const samples = await sampleService.search(searchQuery.trim())
      if (samples.length > 0) {
        const sample = samples[0]
        setSelectedSample(sample)
        // Check if result entry exists
        const resultEntry = await resultEntryService.getBySample(sample.id)
        if (resultEntry) {
          setSelectedResultEntry(resultEntry)
          setShowResultSheet(true)
        } else {
          setSelectedResultEntry(null)
          setShowCreateSheetModal(true)
        }
      } else {
        setSelectedSample(null)
        setSelectedResultEntry(null)
      }
    } catch (error) {
      console.error('Failed to search sample:', error)
    } finally {
      setSearching(false)
    }
  }

  const handleCreateSheet = async () => {
    if (!selectedSample) return
    try {
      setLoading(true)
      const newSheet = await resultEntryService.create({
        sample_id: selectedSample.id,
      })
      setSelectedResultEntry(newSheet)
      setShowCreateSheetModal(false)
      setShowResultSheet(true)
    } catch (error: any) {
      console.error('Failed to create result sheet:', error)
      alert(error.response?.data?.detail || 'Failed to create result sheet')
    } finally {
      setLoading(false)
    }
  }

  const handleAddValue = async () => {
    if (!selectedResultEntry || !valueFormData.test_type || !valueFormData.value) return
    
    // Check if sheet is committed and user is not manager/admin
    if (selectedResultEntry.is_committed && !isManagerOrAdmin) {
      alert('Cannot add values to committed result sheets. Only managers and administrators can edit committed sheets.')
      return
    }
    
    // Reason required if editing committed sheet
    const reason = selectedResultEntry.is_committed ? editReason : undefined
    if (selectedResultEntry.is_committed && !reason?.trim()) {
      alert('Reason is required when editing committed result sheets')
      return
    }

    try {
      setLoading(true)
      const newValue = await resultEntryService.addValue(
        selectedResultEntry.id,
        valueFormData,
        reason
      )
      // Refresh result entry
      const updated = await resultEntryService.getById(selectedResultEntry.id)
      setSelectedResultEntry(updated)
      setShowAddValueModal(false)
      setValueFormData({
        test_type: '',
        value: '',
        unit: '',
        unit_type: '',
        notes: '',
      })
      setEditReason('')
    } catch (error: any) {
      console.error('Failed to add result value:', error)
      alert(error.response?.data?.detail || 'Failed to add result value')
    } finally {
      setLoading(false)
    }
  }

  const handleEditValue = async () => {
    if (!selectedResultEntry || !editingValue || !editReason.trim()) return

    try {
      setLoading(true)
      await resultEntryService.updateValue(
        selectedResultEntry.id,
        editingValue.id,
        {
          test_type: valueFormData.test_type,
          value: valueFormData.value,
          unit: valueFormData.unit,
          unit_type: valueFormData.unit_type,
          notes: valueFormData.notes,
        },
        editReason
      )
      // Refresh result entry
      const updated = await resultEntryService.getById(selectedResultEntry.id)
      setSelectedResultEntry(updated)
      setShowEditValueModal(false)
      setEditingValue(null)
      setValueFormData({
        test_type: '',
        value: '',
        unit: '',
        unit_type: '',
        notes: '',
      })
      setEditReason('')
    } catch (error: any) {
      console.error('Failed to update result value:', error)
      alert(error.response?.data?.detail || 'Failed to update result value')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteValue = async () => {
    if (!selectedResultEntry || !deletingValue || !deleteReason.trim()) return

    try {
      setLoading(true)
      await resultEntryService.deleteValue(
        selectedResultEntry.id,
        deletingValue.id,
        deleteReason
      )
      // Refresh result entry
      const updated = await resultEntryService.getById(selectedResultEntry.id)
      setSelectedResultEntry(updated)
      setShowDeleteValueModal(false)
      setDeletingValue(null)
      setDeleteReason('')
    } catch (error: any) {
      console.error('Failed to delete result value:', error)
      alert(error.response?.data?.detail || 'Failed to delete result value')
    } finally {
      setLoading(false)
    }
  }

  const handleCommit = async () => {
    if (!selectedResultEntry) return

    try {
      setCommitting(true)
      const updated = await resultEntryService.commit(selectedResultEntry.id)
      setSelectedResultEntry(updated)
    } catch (error: any) {
      console.error('Failed to commit result entry:', error)
      alert(error.response?.data?.detail || 'Failed to commit result entry')
    } finally {
      setCommitting(false)
    }
  }

  const handleDeleteSheet = async () => {
    if (!selectedResultEntry || !sheetDeleteReason.trim()) return

    try {
      setLoading(true)
      await resultEntryService.delete(selectedResultEntry.id, sheetDeleteReason)
      setShowDeleteSheetModal(false)
      setShowResultSheet(false)
      setSelectedResultEntry(null)
      setSelectedSample(null)
      setSheetDeleteReason('')
      // Refresh search
      if (searchQuery.trim()) {
        handleSearchSample({ preventDefault: () => {} } as React.FormEvent)
      }
    } catch (error: any) {
      console.error('Failed to delete result sheet:', error)
      alert(error.response?.data?.detail || 'Failed to delete result sheet')
    } finally {
      setLoading(false)
    }
  }

  const openEditValueModal = (value: ResultValue) => {
    setEditingValue(value)
    setValueFormData({
      test_type: value.test_type,
      value: value.value,
      unit: value.unit || '',
      unit_type: value.unit_type || '',
      notes: value.notes || '',
    })
    setEditReason('')
    setShowEditValueModal(true)
  }

  const openDeleteValueModal = (value: ResultValue) => {
    setDeletingValue(value)
    setDeleteReason('')
    setShowDeleteValueModal(true)
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Result Entries</h1>
          <p className="text-muted-foreground mt-1.5 text-sm">
            Record and manage test results for samples
          </p>
        </div>

        <Card className="border-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-semibold">Search Sample</CardTitle>
            <CardDescription className="text-sm">
              Search for a sample to view or create result entry sheet
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearchSample} className="space-y-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by sample ID or name"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-11"
                  />
                </div>
                <Button type="submit" disabled={searching || !searchQuery.trim()} className="h-11">
                  {searching ? <LoadingMeter /> : <><Search className="h-4 w-4 mr-2" />Search</>}
                </Button>
              </div>

              {selectedSample && (
                <div className="mt-4 p-4 bg-muted/50 rounded-lg border border-border">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <FlaskConical className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold">{selectedSample.name}</span>
                        <span className="text-xs font-mono text-muted-foreground">({selectedSample.sample_id})</span>
                      </div>
                      <div className="text-sm text-muted-foreground ml-6">
                        Customer: {selectedSample.customer_name} | Type: {selectedSample.sample_type_name}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {selectedResultEntry ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowResultSheet(true)}
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            View Result Sheet
                          </Button>
                          {isManagerOrAdmin && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSheetDeleteReason('')
                                setShowDeleteSheetModal(true)
                              }}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Sheet
                            </Button>
                          )}
                        </>
                      ) : (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => setShowCreateSheetModal(true)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Create Result Sheet
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </form>
          </CardContent>
        </Card>

        {/* Result Sheet Modal */}
        <Dialog open={showResultSheet} onOpenChange={setShowResultSheet}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Result Sheet - {selectedResultEntry?.sample_id_code}
                {selectedResultEntry?.is_committed && (
                  <span className="ml-2 text-xs px-2 py-1 bg-green-500/20 text-green-500 rounded">
                    <Lock className="h-3 w-3 inline mr-1" />
                    Committed
                  </span>
                )}
              </DialogTitle>
              <DialogDescription>
                {selectedResultEntry?.sample_name} - {selectedResultEntry?.customer_name}
              </DialogDescription>
            </DialogHeader>
            {selectedResultEntry && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Created by: {selectedResultEntry.created_by_name}
                    {selectedResultEntry.committed_by_name && (
                      <> | Committed by: {selectedResultEntry.committed_by_name}</>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {!selectedResultEntry.is_committed && (
                      <Button
                        onClick={handleCommit}
                        disabled={committing || selectedResultEntry.result_values.length === 0}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {committing ? <LoadingMeter /> : <><CheckCircle className="h-4 w-4 mr-2" />Commit Results</>}
                      </Button>
                    )}
                    {selectedResultEntry.is_committed && (
                      <Button
                        onClick={async () => {
                          if (!selectedResultEntry) return
                          try {
                            setGeneratingReport(true)
                            await reportService.create({ result_entry_id: selectedResultEntry.id })
                            alert('Report generated successfully! You can view it in the Amended Reports page.')
                          } catch (error: any) {
                            console.error('Failed to generate report:', error)
                            alert(error.response?.data?.detail || 'Failed to generate report')
                          } finally {
                            setGeneratingReport(false)
                          }
                        }}
                        disabled={generatingReport}
                        variant="outline"
                        className="border-blue-500 text-blue-600 hover:bg-blue-50"
                      >
                        {generatingReport ? <LoadingMeter /> : <><FileCheck className="h-4 w-4 mr-2" />Generate Report</>}
                      </Button>
                    )}
                  </div>
                </div>

                <div className="border-t border-border pt-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">Test Results</h3>
                    {(!selectedResultEntry.is_committed || isManagerOrAdmin) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setValueFormData({
                            test_type: '',
                            value: '',
                            unit: '',
                            unit_type: '',
                            notes: '',
                          })
                          setEditReason('')
                          setShowAddValueModal(true)
                        }}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Result
                      </Button>
                    )}
                  </div>

                  {selectedResultEntry.result_values.length === 0 ? (
                    <p className="text-muted-foreground text-sm py-4 text-center">
                      No test results recorded yet. Click "Add Result" to start.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      <div className="grid grid-cols-5 gap-2 font-semibold text-sm border-b border-border pb-2">
                        <div>Test Type</div>
                        <div>Value</div>
                        <div>Unit</div>
                        <div>Unit Type</div>
                        <div className="text-right">Actions</div>
                      </div>
                      {selectedResultEntry.result_values.map((value) => (
                        <div key={value.id} className="grid grid-cols-5 gap-2 items-center py-2 border-b border-border/50">
                          <div className="font-medium">{value.test_type}</div>
                          <div>{value.value}</div>
                          <div className="text-muted-foreground">{value.unit || '-'}</div>
                          <div className="text-muted-foreground text-sm">{value.unit_type || '-'}</div>
                          <div className="flex justify-end gap-2">
                            {(!selectedResultEntry.is_committed || isManagerOrAdmin) && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openEditValueModal(value)}
                                  disabled={selectedResultEntry.is_committed && !isManagerOrAdmin}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                {isManagerOrAdmin && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => openDeleteValueModal(value)}
                                    className="text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowResultSheet(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Value Modal */}
        <Dialog open={showAddValueModal} onOpenChange={setShowAddValueModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Test Result</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="test_type">Test Type *</Label>
                <Input
                  id="test_type"
                  value={valueFormData.test_type}
                  onChange={(e) => setValueFormData({ ...valueFormData, test_type: e.target.value })}
                  required
                  className="mt-1.5"
                  placeholder="e.g., Concentration, pH, Temperature"
                />
              </div>
              <div>
                <Label htmlFor="value">Value *</Label>
                <Input
                  id="value"
                  value={valueFormData.value}
                  onChange={(e) => setValueFormData({ ...valueFormData, value: e.target.value })}
                  required
                  className="mt-1.5"
                  placeholder="e.g., 25.5, 7.2, 100"
                />
              </div>
              <div>
                <Label htmlFor="unit">Unit</Label>
                <Input
                  id="unit"
                  value={valueFormData.unit}
                  onChange={(e) => setValueFormData({ ...valueFormData, unit: e.target.value })}
                  className="mt-1.5"
                  placeholder="e.g., mg/L, %, °C, ppm"
                />
              </div>
              <div>
                <Label htmlFor="unit_type">Unit Type</Label>
                <select
                  id="unit_type"
                  value={valueFormData.unit_type || ''}
                  onChange={(e) => setValueFormData({ ...valueFormData, unit_type: e.target.value || null })}
                  className="w-full mt-1.5 h-10 px-3 py-2 rounded-md border border-input bg-background text-foreground"
                >
                  <option value="">Select unit type...</option>
                  <option value="percentage">Percentage</option>
                  <option value="SI unit">SI Unit</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <textarea
                  id="notes"
                  className="w-full min-h-[80px] px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm mt-1.5"
                  value={valueFormData.notes || ''}
                  onChange={(e) => setValueFormData({ ...valueFormData, notes: e.target.value || null })}
                  placeholder="Additional notes..."
                />
              </div>
              {selectedResultEntry?.is_committed && (
                <div>
                  <Label htmlFor="edit_reason">Reason for Adding *</Label>
                  <Input
                    id="edit_reason"
                    value={editReason}
                    onChange={(e) => setEditReason(e.target.value)}
                    required
                    className="mt-1.5"
                    placeholder="Provide a reason for adding this result to a committed sheet"
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddValueModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddValue} disabled={loading}>
                {loading ? <LoadingMeter /> : <><Plus className="h-4 w-4 mr-2" />Add Result</>}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Value Modal */}
        <Dialog open={showEditValueModal} onOpenChange={setShowEditValueModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Test Result</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit_test_type">Test Type *</Label>
                <Input
                  id="edit_test_type"
                  value={valueFormData.test_type}
                  onChange={(e) => setValueFormData({ ...valueFormData, test_type: e.target.value })}
                  required
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="edit_value">Value *</Label>
                <Input
                  id="edit_value"
                  value={valueFormData.value}
                  onChange={(e) => setValueFormData({ ...valueFormData, value: e.target.value })}
                  required
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="edit_unit">Unit</Label>
                <Input
                  id="edit_unit"
                  value={valueFormData.unit || ''}
                  onChange={(e) => setValueFormData({ ...valueFormData, unit: e.target.value || null })}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="edit_unit_type">Unit Type</Label>
                <select
                  id="edit_unit_type"
                  value={valueFormData.unit_type || ''}
                  onChange={(e) => setValueFormData({ ...valueFormData, unit_type: e.target.value || null })}
                  className="w-full mt-1.5 h-10 px-3 py-2 rounded-md border border-input bg-background text-foreground"
                >
                  <option value="">Select unit type...</option>
                  <option value="percentage">Percentage</option>
                  <option value="SI unit">SI Unit</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              <div>
                <Label htmlFor="edit_notes">Notes</Label>
                <textarea
                  id="edit_notes"
                  className="w-full min-h-[80px] px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm mt-1.5"
                  value={valueFormData.notes || ''}
                  onChange={(e) => setValueFormData({ ...valueFormData, notes: e.target.value || null })}
                />
              </div>
              <div>
                <Label htmlFor="edit_reason_required">Reason for Editing *</Label>
                <Input
                  id="edit_reason_required"
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  required
                  className="mt-1.5"
                  placeholder="Provide a reason for editing this result"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditValueModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleEditValue} disabled={loading || !editReason.trim()}>
                {loading ? <LoadingMeter /> : <><Save className="h-4 w-4 mr-2" />Update</>}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Value Modal */}
        <Dialog open={showDeleteValueModal} onOpenChange={setShowDeleteValueModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Test Result</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this result? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {deletingValue && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="font-medium">{deletingValue.test_type}: {deletingValue.value} {deletingValue.unit || ''}</p>
                </div>
              )}
              <div>
                <Label htmlFor="delete_reason">Reason for Deletion *</Label>
                <Input
                  id="delete_reason"
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  required
                  className="mt-1.5"
                  placeholder="Provide a reason for deleting this result"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteValueModal(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteValue}
                disabled={loading || !deleteReason.trim()}
              >
                {loading ? <LoadingMeter /> : <><Trash2 className="h-4 w-4 mr-2" />Delete</>}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Sheet Modal */}
        <Dialog open={showDeleteSheetModal} onOpenChange={setShowDeleteSheetModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Result Sheet</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this result sheet? This action cannot be undone and will delete all associated test results.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="sheet_delete_reason">Reason for Deletion *</Label>
                <Input
                  id="sheet_delete_reason"
                  value={sheetDeleteReason}
                  onChange={(e) => setSheetDeleteReason(e.target.value)}
                  required
                  className="mt-1.5"
                  placeholder="Provide a reason for deleting this result sheet"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteSheetModal(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteSheet}
                disabled={loading || !sheetDeleteReason.trim()}
              >
                {loading ? <LoadingMeter /> : <><Trash2 className="h-4 w-4 mr-2" />Delete Sheet</>}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create Sheet Modal */}
        <Dialog open={showCreateSheetModal} onOpenChange={setShowCreateSheetModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Result Sheet</DialogTitle>
              <DialogDescription>
                Create a new result entry sheet for {selectedSample?.sample_id}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                A new result entry sheet will be created for this sample. You can then add test results to it.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateSheetModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateSheet} disabled={loading}>
                {loading ? <LoadingMeter /> : <><Plus className="h-4 w-4 mr-2" />Create Sheet</>}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}

export default ResultEntries
