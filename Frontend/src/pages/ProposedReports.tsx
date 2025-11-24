import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { reportService, type Report, ReportStatus } from '@/services/reportService'
import { authService } from '@/services/authService'
import type { User } from '@/types/user'
import { FileCheck, Eye, CheckCircle, X, ExternalLink, FileText } from 'lucide-react'
import { LoadingMeter } from '@/components/ui/loading'

export function ProposedReports() {
  const navigate = useNavigate()
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(false)
  const [validating, setValidating] = useState<number | null>(null)
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [showViewModal, setShowViewModal] = useState(false)
  const [showValidateModal, setShowValidateModal] = useState(false)
  const [documentHtml, setDocumentHtml] = useState<string | null>(null)
  const [loadingDocument, setLoadingDocument] = useState(false)

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await authService.getCurrentUser()
        setCurrentUser(user)
        // Check if user is manager or admin
        if (user.user_type !== 'lab_administrator' && user.user_type !== 'lab_manager') {
          navigate('/dashboard')
          return
        }
      } catch (error) {
        console.error('Failed to fetch user:', error)
        navigate('/dashboard')
      }
    }
    fetchUser()
    loadReports()
  }, [navigate])

  const loadReports = async () => {
    try {
      setLoading(true)
      const data = await reportService.getProposed()
      setReports(data)
    } catch (error) {
      console.error('Failed to load proposed reports:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleValidate = async () => {
    if (!selectedReport) return
    try {
      setValidating(selectedReport.id)
      await reportService.validate(selectedReport.id)
      await loadReports()
      setShowValidateModal(false)
      setSelectedReport(null)
      alert('Report validated and finalized successfully! It is now available in the Reports page.')
    } catch (error: any) {
      console.error('Failed to validate report:', error)
      alert(error.response?.data?.detail || 'Failed to validate report')
    } finally {
      setValidating(null)
    }
  }

  const handleFinalize = async (report: Report) => {
    if (!confirm('Are you sure you want to finalize this report? This action cannot be undone.')) {
      return
    }
    try {
      setValidating(report.id)
      await reportService.finalize(report.id)
      await loadReports()
      alert('Report finalized successfully!')
    } catch (error: any) {
      console.error('Failed to finalize report:', error)
      alert(error.response?.data?.detail || 'Failed to finalize report')
    } finally {
      setValidating(null)
    }
  }

  const handleViewDocument = async (report: Report) => {
    try {
      setLoadingDocument(true)
      setSelectedReport(report)
      const html = await reportService.getDocumentHtml(report.id)
      setDocumentHtml(html)
      setShowViewModal(true)
    } catch (error) {
      console.error('Failed to load document:', error)
      alert('Failed to load report document')
    } finally {
      setLoadingDocument(false)
    }
  }

  const getStatusBadge = (status: ReportStatus) => {
    const badges = {
      [ReportStatus.PROPOSED]: 'bg-yellow-500/20 text-yellow-600',
      [ReportStatus.VALIDATED]: 'bg-blue-500/20 text-blue-600',
      [ReportStatus.FINALIZED]: 'bg-green-500/20 text-green-600',
    }
    return badges[status] || 'bg-gray-500/20 text-gray-600'
  }

  if (loading && reports.length === 0) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <LoadingMeter />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Amended Reports</h1>
          <p className="text-muted-foreground mt-1.5 text-sm">
            Review and validate amended reports before finalization
          </p>
        </div>

        {reports.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No amended reports found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {reports.map((report) => (
              <Card key={report.id} className="border-border">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">{report.report_number}</h3>
                        <span className={`text-xs px-2 py-1 rounded ${getStatusBadge(report.status)}`}>
                          {report.status === ReportStatus.PROPOSED ? 'amended' : report.status}
                        </span>
                      </div>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <div>Sample: <span className="font-medium text-foreground">{report.sample_id_code}</span> - {report.sample_name}</div>
                        <div>Customer: <span className="font-medium text-foreground">{report.customer_name}</span></div>
                        <div>Generated: <span className="font-medium text-foreground">{new Date(report.generated_at).toLocaleString()}</span> by {report.generated_by_name}</div>
                        {report.validated_at && (
                          <div>Validated: <span className="font-medium text-foreground">{new Date(report.validated_at).toLocaleString()}</span> by {report.validated_by_name}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDocument(report)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Document
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/dashboard/result-entries?sample=${report.sample_id_code}`)}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Go to Result Sheet
                      </Button>
                      {report.status === ReportStatus.PROPOSED && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => {
                            setSelectedReport(report)
                            setShowValidateModal(true)
                          }}
                          disabled={validating === report.id}
                        >
                          {validating === report.id ? (
                            <LoadingMeter />
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Validate & Finalize
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* View Document Modal */}
        <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>Report Document - {selectedReport?.report_number}</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-auto">
              {loadingDocument ? (
                <div className="flex items-center justify-center h-64">
                  <LoadingMeter />
                </div>
              ) : documentHtml ? (
                <iframe
                  srcDoc={documentHtml}
                  className="w-full h-full min-h-[600px] border-0"
                  title="Report Document"
                />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No document content available
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  const url = selectedReport ? reportService.getDocumentUrl(selectedReport.id) : ''
                  if (url) {
                    const link = document.createElement('a')
                    link.href = url
                    link.target = '_blank'
                    link.rel = 'noopener noreferrer'
                    // Add token to URL if available
                    const token = localStorage.getItem('access_token')
                    if (token) {
                      link.href = `${url}?token=${encodeURIComponent(token)}`
                    }
                    link.click()
                  }
                }}
              >
                Open in New Tab
              </Button>
              <Button variant="outline" onClick={() => setShowViewModal(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Validate Confirmation Modal */}
        <Dialog open={showValidateModal} onOpenChange={setShowValidateModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Validate & Finalize Report</DialogTitle>
              <DialogDescription>
                Are you sure you want to validate and finalize this report? Once finalized, it will be available in the Reports page and cannot be modified.
              </DialogDescription>
            </DialogHeader>
            {selectedReport && (
              <div className="space-y-2 text-sm">
                <div><strong>Report Number:</strong> {selectedReport.report_number}</div>
                <div><strong>Sample:</strong> {selectedReport.sample_id_code}</div>
                <div><strong>Customer:</strong> {selectedReport.customer_name}</div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowValidateModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleValidate} disabled={validating !== null}>
                {validating ? <LoadingMeter /> : <><CheckCircle className="h-4 w-4 mr-2" />Validate Report</>}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}

export default ProposedReports

