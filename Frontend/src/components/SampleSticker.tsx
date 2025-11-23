import { useRef, useEffect, useState } from 'react'
import QRCode from 'qrcode'
import JsBarcode from 'jsbarcode'
import type { Sample } from '@/services/sampleService'
import { settingsService } from '@/services/settingsService'

interface SampleStickerProps {
  sample: Sample
  onClose?: () => void
}

export function SampleSticker({ sample, onClose }: SampleStickerProps) {
  const barcodeRef = useRef<SVGSVGElement>(null)
  const qrCodeRef = useRef<HTMLCanvasElement>(null)
  const printRef = useRef<HTMLDivElement>(null)
  const [organizationName, setOrganizationName] = useState<string>('Lab')

  useEffect(() => {
    const fetchOrganization = async () => {
      try {
        const org = await settingsService.getOrganization()
        setOrganizationName(org.name || 'Lab')
      } catch (error) {
        console.error('Failed to load organization:', error)
        setOrganizationName('Lab')
      }
    }
    fetchOrganization()
  }, [])

  useEffect(() => {
    if (barcodeRef.current) {
      try {
        JsBarcode(barcodeRef.current, sample.sample_id, {
          format: 'CODE128',
          width: 2,
          height: 60,
          displayValue: true,
          fontSize: 14,
          margin: 10,
        })
      } catch (error) {
        console.error('Failed to generate barcode:', error)
      }
    }
  }, [sample.sample_id])

  useEffect(() => {
    if (qrCodeRef.current) {
      QRCode.toCanvas(qrCodeRef.current, sample.sample_id, {
        width: 80,
        margin: 1,
      }).catch((error) => {
        console.error('Failed to generate QR code:', error)
      })
    }
  }, [sample.sample_id])

  const handlePrint = () => {
    if (printRef.current && barcodeRef.current && qrCodeRef.current) {
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        // Get SVG and canvas as data URLs
        const barcodeSVG = barcodeRef.current.outerHTML
        const qrCodeDataURL = qrCodeRef.current.toDataURL('image/png')
        const orgName = organizationName || 'Lab'
        
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Sample Sticker - ${sample.sample_id}</title>
              <style>
                @media print {
                  @page {
                    size: 4in 3in;
                    margin: 0.1in;
                  }
                  body {
                    margin: 0;
                    padding: 0;
                  }
                }
                body {
                  font-family: Arial, sans-serif;
                  margin: 0;
                  padding: 10px;
                  width: 4in;
                  height: 3in;
                  box-sizing: border-box;
                }
                .sticker {
                  border: 2px solid #000;
                  padding: 8px;
                  height: 100%;
                  display: flex;
                  flex-direction: column;
                  box-sizing: border-box;
                }
                .header {
                  text-align: center;
                  border-bottom: 1px solid #000;
                  padding-bottom: 4px;
                  margin-bottom: 4px;
                }
                .header h2 {
                  margin: 0;
                  font-size: 18px;
                  font-weight: bold;
                  color: #000;
                }
                .header p {
                  margin: 2px 0 0 0;
                  font-size: 9px;
                  color: #666;
                }
                .sample-id {
                  text-align: center;
                  font-size: 24px;
                  font-weight: bold;
                  margin: 4px 0;
                  letter-spacing: 2px;
                  color: #000;
                }
                .barcode-container {
                  text-align: center;
                  margin: 4px 0;
                }
                .barcode-container svg {
                  max-width: 100%;
                  height: auto;
                }
                .qr-container {
                  text-align: center;
                  margin: 4px 0;
                }
                .qr-container img {
                  width: 80px;
                  height: 80px;
                }
                .details {
                  font-size: 10px;
                  line-height: 1.3;
                  margin-top: 4px;
                  color: #000;
                }
                .details-row {
                  margin: 2px 0;
                  color: #000;
                }
                .label {
                  font-weight: bold;
                  color: #000;
                }
              </style>
            </head>
            <body>
              <div class="sticker">
                <div class="header">
                  <h2>${orgName.toUpperCase()}</h2>
                  <p>Generated on Atlas Lab</p>
                </div>
                <div class="sample-id">${sample.sample_id}</div>
                <div class="barcode-container">
                  ${barcodeSVG}
                </div>
                <div class="qr-container">
                  <img src="${qrCodeDataURL}" alt="QR Code" />
                </div>
                <div class="details">
                  <div class="details-row">
                    <span class="label">Customer:</span> ${sample.customer_name}
                  </div>
                  ${(sample.customer_phone || sample.customer_email) ? `
                  <div class="details-row">
                    <span class="label">Contact:</span> ${[sample.customer_phone, sample.customer_email].filter(Boolean).join(' | ')}
                  </div>
                  ` : ''}
                  ${sample.project_name ? `
                  <div class="details-row">
                    <span class="label">Project:</span> ${sample.project_name}
                  </div>
                  ` : ''}
                  <div class="details-row">
                    <span class="label">Type:</span> ${sample.sample_type_name}
                  </div>
                  ${sample.name ? `
                  <div class="details-row">
                    <span class="label">Name:</span> ${sample.name}
                  </div>
                  ` : ''}
                  ${sample.department_names.length > 0 ? `
                  <div class="details-row">
                    <span class="label">Depts:</span> ${sample.department_names.join(', ')}
                  </div>
                  ` : ''}
                  ${sample.test_type_names.length > 0 ? `
                  <div class="details-row">
                    <span class="label">Tests:</span> ${sample.test_type_names.slice(0, 3).join(', ')}${sample.test_type_names.length > 3 ? '...' : ''}
                  </div>
                  ` : ''}
                </div>
              </div>
            </body>
          </html>
        `)
        printWindow.document.close()
        printWindow.focus()
        setTimeout(() => {
          printWindow.print()
          printWindow.close()
        }, 500)
      }
    }
  }

  return (
    <div className="space-y-4">
      <div
        ref={printRef}
        className="bg-white p-4 border-2 border-black"
        style={{
          width: '4in',
          minHeight: '3in',
          margin: '0 auto',
        }}
      >
        <div className="sticker">
          <div className="header">
            <h2 className="text-black">{organizationName.toUpperCase()}</h2>
            <p className="text-gray-600 text-xs mt-0.5">Generated on Atlas Lab</p>
          </div>
          
          <div className="sample-id text-black">{sample.sample_id}</div>
          
          <div className="barcode-container">
            <svg ref={barcodeRef}></svg>
          </div>
          
          <div className="qr-container">
            <canvas ref={qrCodeRef}></canvas>
          </div>
          
          <div className="details text-black">
            <div className="details-row text-black">
              <span className="label text-black">Customer:</span> <span className="text-black">{sample.customer_name}</span>
            </div>
            {(sample.customer_phone || sample.customer_email) && (
              <div className="details-row text-black">
                <span className="label text-black">Contact:</span> <span className="text-black">{[sample.customer_phone, sample.customer_email].filter(Boolean).join(' | ')}</span>
              </div>
            )}
            {sample.project_name && (
              <div className="details-row text-black">
                <span className="label text-black">Project:</span> <span className="text-black">{sample.project_name}</span>
              </div>
            )}
            <div className="details-row text-black">
              <span className="label text-black">Type:</span> <span className="text-black">{sample.sample_type_name}</span>
            </div>
            {sample.name && (
              <div className="details-row text-black">
                <span className="label text-black">Name:</span> <span className="text-black">{sample.name}</span>
              </div>
            )}
            {sample.department_names.length > 0 && (
              <div className="details-row text-black">
                <span className="label text-black">Depts:</span> <span className="text-black">{sample.department_names.join(', ')}</span>
              </div>
            )}
            {sample.test_type_names.length > 0 && (
              <div className="details-row text-black">
                <span className="label text-black">Tests:</span> <span className="text-black">{sample.test_type_names.slice(0, 3).join(', ')}
                {sample.test_type_names.length > 3 && '...'}</span>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="flex justify-center gap-2">
        <button
          onClick={handlePrint}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 font-medium"
        >
          Print Sticker
        </button>
        {onClose && (
          <button
            onClick={onClose}
            className="px-4 py-2 bg-muted text-muted-foreground rounded-md hover:bg-muted/80"
          >
            Close
          </button>
        )}
      </div>
    </div>
  )
}

