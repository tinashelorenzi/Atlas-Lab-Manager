import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { reportService, type Report } from '@/services/reportService'
import { Download, Search, FileText, AlertCircle } from 'lucide-react'
import { LoadingMeter } from '@/components/ui/loading'
import logo from '@/assets/logo.svg'

export function ViewReport() {
  const [searchParams] = useSearchParams()
  const [sampleId, setSampleId] = useState('')
  const [viewKey, setViewKey] = useState('')
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Pre-fill from URL parameters if available
    const urlSampleId = searchParams.get('sample_id')
    const urlViewKey = searchParams.get('view_key')
    if (urlSampleId) setSampleId(urlSampleId)
    if (urlViewKey) setViewKey(urlViewKey)
    
    // Auto-search if both are provided
    if (urlSampleId && urlViewKey) {
      handleAutoSearch(urlSampleId, urlViewKey)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const handleAutoSearch = async (sid: string, vk: string) => {
    try {
      setLoading(true)
      setError(null)
      const data = await reportService.getPublicReport(sid, vk)
      setReport(data)
    } catch (err: any) {
      console.error('Failed to load report:', err)
      setError(err.response?.data?.detail || 'Report not found. Please check your Sample ID and View Key.')
      setReport(null)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!sampleId.trim() || !viewKey.trim()) {
      setError('Please enter both Sample ID and View Key')
      return
    }

    try {
      setLoading(true)
      setError(null)
      const data = await reportService.getPublicReport(sampleId.trim(), viewKey.trim())
      setReport(data)
    } catch (err: any) {
      console.error('Failed to load report:', err)
      setError(err.response?.data?.detail || 'Report not found. Please check your Sample ID and View Key.')
      setReport(null)
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async () => {
    if (!report || !report.view_key) return
    try {
      const pdfUrl = reportService.getPublicPdfUrl(report.id, report.view_key)
      // Fetch the PDF
      const response = await fetch(pdfUrl)
      if (!response.ok) {
        throw new Error('Failed to download PDF')
      }
      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = `${report.report_number}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(downloadUrl)
    } catch (error) {
      console.error('Failed to download report:', error)
      alert('Failed to download report')
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <img src={logo} alt="Atlas Lab" className="h-12 w-12" />
            <h1 className="text-3xl font-bold text-foreground">Atlas Lab Manager</h1>
          </div>
          <p className="text-muted-foreground">View Your Test Results Report</p>
        </div>

        <Card className="border-border">
          <CardHeader>
            <CardTitle>Access Your Report</CardTitle>
            <CardDescription>
              Enter your Sample ID and View Key to view your test results report
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="space-y-4">
              <div>
                <Label htmlFor="sample_id">Sample ID *</Label>
                <Input
                  id="sample_id"
                  value={sampleId}
                  onChange={(e) => setSampleId(e.target.value)}
                  placeholder="Enter your sample ID"
                  required
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="view_key">View Key *</Label>
                <Input
                  id="view_key"
                  value={viewKey}
                  onChange={(e) => setViewKey(e.target.value)}
                  placeholder="Enter your view key"
                  required
                  className="mt-1.5 font-mono"
                />
                <p className="text-xs text-muted-foreground mt-1.5">
                  Your view key was sent to you via email along with your report.
                </p>
              </div>
              {error && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md flex items-center gap-2 text-destructive text-sm">
                  <AlertCircle className="h-4 w-4" />
                  <span>{error}</span>
                </div>
              )}
              <Button type="submit" disabled={loading || !sampleId.trim() || !viewKey.trim()} className="w-full">
                {loading ? <LoadingMeter /> : <><Search className="h-4 w-4 mr-2" />View Report</>}
              </Button>
            </form>

            {report && (
              <div className="mt-6 pt-6 border-t border-border">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">{report.report_number}</h3>
                      <p className="text-sm text-muted-foreground">
                        Sample: {report.sample_id_code} - {report.sample_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Customer: {report.customer_name}
                      </p>
                    </div>
                    <Button onClick={handleDownload} variant="default">
                      <Download className="h-4 w-4 mr-2" />
                      Download PDF
                    </Button>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">Generated:</span>{' '}
                      {new Date(report.generated_at).toLocaleString()}
                    </div>
                    {report.finalized_at && (
                      <div>
                        <span className="font-medium">Finalized:</span>{' '}
                        {new Date(report.finalized_at).toLocaleString()}
                      </div>
                    )}
                  </div>
                  {report.report_data && (
                    <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                      <h4 className="font-semibold mb-2">Test Results</h4>
                      {report.report_data.departments && report.report_data.departments.length > 0 ? (
                        <div className="space-y-4">
                          {report.report_data.departments.map((dept: any, idx: number) => (
                            <div key={idx} className="border-l-2 border-primary pl-3">
                              <h5 className="font-medium mb-2">{dept.name}</h5>
                              <div className="space-y-1 text-sm">
                                {dept.tests && dept.tests.map((test: any, testIdx: number) => (
                                  <div key={testIdx} className="flex justify-between">
                                    <span>{test.test_type}:</span>
                                    <span className="font-medium">{test.value} {test.unit || ''}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="space-y-1 text-sm">
                          {report.report_data.result_values && report.report_data.result_values.map((result: any, idx: number) => (
                            <div key={idx} className="flex justify-between">
                              <span>{result.test_type}:</span>
                              <span className="font-medium">{result.value} {result.unit || ''}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default ViewReport

