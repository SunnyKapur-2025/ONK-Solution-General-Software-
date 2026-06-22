'use client'

export interface InvoiceItem {
  description: string
  qty: number
  rate: number
  gstRate: number
  amount: number
  cgst: number
  sgst: number
  igst: number
}

export interface InvoiceProps {
  // Company details
  companyName: string
  companyAddress: string
  companyCity: string
  companyState: string
  companyPincode: string
  companyPhone: string
  companyEmail: string
  companyGSTIN: string
  companyPAN: string
  logoUrl?: string
  sealUrl?: string
  signatureUrl?: string
  // Invoice details
  invoiceNumber: string
  invoiceDate: string
  dueDate?: string
  // Customer
  customerName: string
  customerAddress?: string
  customerGSTIN?: string
  // Line items
  items: InvoiceItem[]
  // Totals
  subtotal: number
  totalCGST: number
  totalSGST: number
  totalIGST: number
  totalAmount: number
  // Customization
  invoiceTitle?: string
  bankName?: string
  bankAccountNo?: string
  bankIFSC?: string
  bankBranch?: string
  footerText?: string
  showBankDetails?: boolean
  showSeal?: boolean
  showSignature?: boolean
  termsAndConditions?: string
}

// Convert number to words (Indian format)
function numberToWords(num: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen',
    'Eighteen', 'Nineteen']
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

  function convertHundreds(n: number): string {
    if (n === 0) return ''
    if (n < 20) return ones[n]
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '')
    return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' ' + convertHundreds(n % 100) : '')
  }

  const wholePart = Math.floor(num)
  const decimalPart = Math.round((num - wholePart) * 100)

  if (wholePart === 0) return 'Zero'

  let result = ''
  if (wholePart >= 10000000) {
    result += convertHundreds(Math.floor(wholePart / 10000000)) + ' Crore '
    const rem = wholePart % 10000000
    if (rem >= 100000) result += convertHundreds(Math.floor(rem / 100000)) + ' Lakh '
    const rem2 = rem % 100000
    if (rem2 >= 1000) result += convertHundreds(Math.floor(rem2 / 1000)) + ' Thousand '
    const rem3 = rem2 % 1000
    if (rem3 > 0) result += convertHundreds(rem3)
  } else if (wholePart >= 100000) {
    result += convertHundreds(Math.floor(wholePart / 100000)) + ' Lakh '
    const rem = wholePart % 100000
    if (rem >= 1000) result += convertHundreds(Math.floor(rem / 1000)) + ' Thousand '
    const rem2 = rem % 1000
    if (rem2 > 0) result += convertHundreds(rem2)
  } else if (wholePart >= 1000) {
    result += convertHundreds(Math.floor(wholePart / 1000)) + ' Thousand '
    const rem = wholePart % 1000
    if (rem > 0) result += convertHundreds(rem)
  } else {
    result = convertHundreds(wholePart)
  }

  result = result.trim() + ' Rupees'
  if (decimalPart > 0) {
    result += ' and ' + convertHundreds(decimalPart) + ' Paise'
  }
  return result + ' Only'
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
}

export default function InvoiceTemplate({
  companyName,
  companyAddress,
  companyCity,
  companyState,
  companyPincode,
  companyPhone,
  companyEmail,
  companyGSTIN,
  companyPAN,
  logoUrl,
  sealUrl,
  signatureUrl,
  invoiceNumber,
  invoiceDate,
  dueDate,
  customerName,
  customerAddress,
  customerGSTIN,
  items,
  subtotal,
  totalCGST,
  totalSGST,
  totalIGST,
  totalAmount,
  invoiceTitle = 'Tax Invoice',
  bankName,
  bankAccountNo,
  bankIFSC,
  bankBranch,
  footerText,
  showBankDetails = true,
  showSeal = true,
  showSignature = true,
  termsAndConditions,
}: InvoiceProps) {
  const amountInWords = numberToWords(totalAmount)

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #invoice-print-area, #invoice-print-area * { visibility: visible; }
          #invoice-print-area { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div
        id="invoice-print-area"
        className="bg-white text-slate-800 font-sans"
        style={{ maxWidth: '794px', margin: '0 auto', padding: '32px', fontSize: '12px', lineHeight: '1.5' }}
      >
        {/* Outer border */}
        <div style={{ border: '1px solid #94a3b8', padding: '0' }}>

          {/* Header */}
          <div style={{ borderBottom: '2px solid #1e3a5f', padding: '16px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            {/* Logo */}
            <div style={{ width: '80px', minWidth: '80px' }}>
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="Company Logo" style={{ maxWidth: '80px', maxHeight: '60px', objectFit: 'contain' }} />
              ) : (
                <div style={{ width: '80px', height: '60px', background: '#f1f5f9', border: '1px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#94a3b8', borderRadius: '4px' }}>
                  Logo
                </div>
              )}
            </div>

            {/* Company details - center */}
            <div style={{ flex: 1, textAlign: 'center', padding: '0 16px' }}>
              <div style={{ fontSize: '20px', fontWeight: '700', color: '#1e3a5f', letterSpacing: '0.5px' }}>{companyName}</div>
              <div style={{ fontSize: '11px', color: '#475569', marginTop: '4px' }}>{companyAddress}</div>
              <div style={{ fontSize: '11px', color: '#475569' }}>{companyCity}, {companyState} - {companyPincode}</div>
              <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>
                Ph: {companyPhone} | Email: {companyEmail}
              </div>
              <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>
                GSTIN: <strong>{companyGSTIN}</strong> | PAN: <strong>{companyPAN}</strong>
              </div>
            </div>

            {/* Invoice title box */}
            <div style={{ textAlign: 'right', minWidth: '130px' }}>
              <div style={{ background: '#1e3a5f', color: '#fff', padding: '6px 12px', fontWeight: '700', fontSize: '13px', letterSpacing: '1px', borderRadius: '4px', marginBottom: '8px' }}>
                {invoiceTitle.toUpperCase()}
              </div>
              <div style={{ fontSize: '11px', color: '#475569' }}>Original for Recipient</div>
            </div>
          </div>

          {/* Invoice meta + Bill To */}
          <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0' }}>
            {/* Bill To */}
            <div style={{ flex: 1, padding: '12px 16px', borderRight: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '10px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Bill To</div>
              <div style={{ fontWeight: '700', fontSize: '13px', color: '#1e293b' }}>{customerName}</div>
              {customerAddress && <div style={{ color: '#475569', marginTop: '3px' }}>{customerAddress}</div>}
              {customerGSTIN && (
                <div style={{ marginTop: '4px', color: '#475569' }}>
                  GSTIN: <strong>{customerGSTIN}</strong>
                </div>
              )}
            </div>

            {/* Invoice details */}
            <div style={{ padding: '12px 16px', minWidth: '220px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <td style={{ padding: '2px 0', color: '#64748b', fontWeight: '600', fontSize: '11px' }}>Invoice No:</td>
                    <td style={{ padding: '2px 0 2px 8px', fontWeight: '700', color: '#1e293b' }}>{invoiceNumber}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '2px 0', color: '#64748b', fontWeight: '600', fontSize: '11px' }}>Invoice Date:</td>
                    <td style={{ padding: '2px 0 2px 8px', color: '#1e293b' }}>{invoiceDate}</td>
                  </tr>
                  {dueDate && (
                    <tr>
                      <td style={{ padding: '2px 0', color: '#64748b', fontWeight: '600', fontSize: '11px' }}>Due Date:</td>
                      <td style={{ padding: '2px 0 2px 8px', color: '#dc2626' }}>{dueDate}</td>
                    </tr>
                  )}
                  <tr>
                    <td style={{ padding: '2px 0', color: '#64748b', fontWeight: '600', fontSize: '11px' }}>Place of Supply:</td>
                    <td style={{ padding: '2px 0 2px 8px', color: '#1e293b' }}>{companyState}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Items table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <thead>
              <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #94a3b8' }}>
                <th style={{ padding: '8px 6px', textAlign: 'center', fontWeight: '600', color: '#334155', borderRight: '1px solid #e2e8f0', width: '30px' }}>#</th>
                <th style={{ padding: '8px 6px', textAlign: 'left', fontWeight: '600', color: '#334155', borderRight: '1px solid #e2e8f0' }}>Description of Goods / Services</th>
                <th style={{ padding: '8px 6px', textAlign: 'right', fontWeight: '600', color: '#334155', borderRight: '1px solid #e2e8f0', width: '45px' }}>Qty</th>
                <th style={{ padding: '8px 6px', textAlign: 'right', fontWeight: '600', color: '#334155', borderRight: '1px solid #e2e8f0', width: '70px' }}>Rate (₹)</th>
                <th style={{ padding: '8px 6px', textAlign: 'right', fontWeight: '600', color: '#334155', borderRight: '1px solid #e2e8f0', width: '75px' }}>Amount (₹)</th>
                <th style={{ padding: '8px 6px', textAlign: 'center', fontWeight: '600', color: '#334155', borderRight: '1px solid #e2e8f0', width: '35px' }}>CGST%</th>
                <th style={{ padding: '8px 6px', textAlign: 'right', fontWeight: '600', color: '#334155', borderRight: '1px solid #e2e8f0', width: '65px' }}>CGST (₹)</th>
                <th style={{ padding: '8px 6px', textAlign: 'center', fontWeight: '600', color: '#334155', borderRight: '1px solid #e2e8f0', width: '35px' }}>SGST%</th>
                <th style={{ padding: '8px 6px', textAlign: 'right', fontWeight: '600', color: '#334155', borderRight: '1px solid #e2e8f0', width: '65px' }}>SGST (₹)</th>
                <th style={{ padding: '8px 6px', textAlign: 'center', fontWeight: '600', color: '#334155', borderRight: '1px solid #e2e8f0', width: '35px' }}>IGST%</th>
                <th style={{ padding: '8px 6px', textAlign: 'right', fontWeight: '600', color: '#334155', width: '65px' }}>IGST (₹)</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0', background: idx % 2 === 0 ? '#fff' : '#f8fafc' }}>
                  <td style={{ padding: '7px 6px', textAlign: 'center', color: '#64748b', borderRight: '1px solid #e2e8f0' }}>{idx + 1}</td>
                  <td style={{ padding: '7px 6px', color: '#1e293b', borderRight: '1px solid #e2e8f0' }}>{item.description}</td>
                  <td style={{ padding: '7px 6px', textAlign: 'right', color: '#1e293b', borderRight: '1px solid #e2e8f0' }}>{item.qty}</td>
                  <td style={{ padding: '7px 6px', textAlign: 'right', color: '#1e293b', borderRight: '1px solid #e2e8f0' }}>{fmt(item.rate)}</td>
                  <td style={{ padding: '7px 6px', textAlign: 'right', fontWeight: '600', color: '#1e293b', borderRight: '1px solid #e2e8f0' }}>{fmt(item.amount)}</td>
                  <td style={{ padding: '7px 6px', textAlign: 'center', color: '#1e293b', borderRight: '1px solid #e2e8f0' }}>{item.cgst > 0 ? item.gstRate / 2 : 0}%</td>
                  <td style={{ padding: '7px 6px', textAlign: 'right', color: '#1e293b', borderRight: '1px solid #e2e8f0' }}>{item.cgst > 0 ? fmt(item.cgst) : '—'}</td>
                  <td style={{ padding: '7px 6px', textAlign: 'center', color: '#1e293b', borderRight: '1px solid #e2e8f0' }}>{item.sgst > 0 ? item.gstRate / 2 : 0}%</td>
                  <td style={{ padding: '7px 6px', textAlign: 'right', color: '#1e293b', borderRight: '1px solid #e2e8f0' }}>{item.sgst > 0 ? fmt(item.sgst) : '—'}</td>
                  <td style={{ padding: '7px 6px', textAlign: 'center', color: '#1e293b', borderRight: '1px solid #e2e8f0' }}>{item.igst > 0 ? item.gstRate : 0}%</td>
                  <td style={{ padding: '7px 6px', textAlign: 'right', color: '#1e293b' }}>{item.igst > 0 ? fmt(item.igst) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals section */}
          <div style={{ display: 'flex', borderTop: '1px solid #94a3b8' }}>
            {/* Amount in words + bank details */}
            <div style={{ flex: 1, padding: '12px 16px', borderRight: '1px solid #e2e8f0' }}>
              <div style={{ marginBottom: '8px' }}>
                <span style={{ fontWeight: '600', fontSize: '11px', color: '#64748b' }}>Amount in Words: </span>
                <span style={{ fontWeight: '700', color: '#1e293b' }}>{amountInWords}</span>
              </div>

              {showBankDetails && (bankName || bankAccountNo) && (
                <div style={{ marginTop: '10px', padding: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '4px' }}>
                  <div style={{ fontWeight: '700', fontSize: '11px', color: '#334155', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Bank Details</div>
                  {bankName && <div style={{ color: '#475569' }}><strong>Bank:</strong> {bankName}</div>}
                  {bankAccountNo && <div style={{ color: '#475569' }}><strong>A/C No:</strong> {bankAccountNo}</div>}
                  {bankIFSC && <div style={{ color: '#475569' }}><strong>IFSC:</strong> {bankIFSC}</div>}
                  {bankBranch && <div style={{ color: '#475569' }}><strong>Branch:</strong> {bankBranch}</div>}
                </div>
              )}
            </div>

            {/* Totals table */}
            <div style={{ minWidth: '250px', padding: '12px 16px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <tbody>
                  <tr>
                    <td style={{ padding: '3px 0', color: '#475569' }}>Subtotal</td>
                    <td style={{ padding: '3px 0', textAlign: 'right', color: '#1e293b' }}>₹{fmt(subtotal)}</td>
                  </tr>
                  {totalCGST > 0 && (
                    <tr>
                      <td style={{ padding: '3px 0', color: '#475569' }}>CGST</td>
                      <td style={{ padding: '3px 0', textAlign: 'right', color: '#1e293b' }}>₹{fmt(totalCGST)}</td>
                    </tr>
                  )}
                  {totalSGST > 0 && (
                    <tr>
                      <td style={{ padding: '3px 0', color: '#475569' }}>SGST</td>
                      <td style={{ padding: '3px 0', textAlign: 'right', color: '#1e293b' }}>₹{fmt(totalSGST)}</td>
                    </tr>
                  )}
                  {totalIGST > 0 && (
                    <tr>
                      <td style={{ padding: '3px 0', color: '#475569' }}>IGST</td>
                      <td style={{ padding: '3px 0', textAlign: 'right', color: '#1e293b' }}>₹{fmt(totalIGST)}</td>
                    </tr>
                  )}
                  <tr>
                    <td colSpan={2}>
                      <div style={{ borderTop: '1px solid #94a3b8', margin: '4px 0' }} />
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px 0', fontWeight: '700', fontSize: '14px', color: '#1e3a5f' }}>Grand Total</td>
                    <td style={{ padding: '4px 0', textAlign: 'right', fontWeight: '700', fontSize: '14px', color: '#1e3a5f' }}>₹{fmt(totalAmount)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Terms & conditions */}
          {termsAndConditions && (
            <div style={{ borderTop: '1px solid #e2e8f0', padding: '10px 16px' }}>
              <div style={{ fontWeight: '600', fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: '4px' }}>Terms & Conditions</div>
              <div style={{ color: '#475569', fontSize: '11px', whiteSpace: 'pre-line' }}>{termsAndConditions}</div>
            </div>
          )}

          {/* Footer + Signature */}
          <div style={{ borderTop: '1px solid #e2e8f0', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            {/* Footer text */}
            <div style={{ flex: 1 }}>
              {footerText && (
                <div style={{ color: '#64748b', fontSize: '11px', fontStyle: 'italic' }}>{footerText}</div>
              )}
              <div style={{ color: '#94a3b8', fontSize: '10px', marginTop: footerText ? '4px' : '0' }}>
                This is a computer-generated invoice. No signature required if digitally authorized.
              </div>
            </div>

            {/* Seal + Signature */}
            <div style={{ textAlign: 'center', minWidth: '160px' }}>
              <div style={{ fontWeight: '600', fontSize: '11px', color: '#334155', marginBottom: '8px' }}>
                For {companyName}
              </div>
              <div style={{ position: 'relative', height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {showSeal && sealUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={sealUrl}
                    alt="Company Seal"
                    style={{ position: 'absolute', width: '70px', height: '70px', objectFit: 'contain', opacity: 0.7, left: '10px' }}
                  />
                )}
                {showSignature && signatureUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={signatureUrl}
                    alt="Authorized Signature"
                    style={{ position: 'relative', zIndex: 1, maxWidth: '120px', maxHeight: '60px', objectFit: 'contain' }}
                  />
                )}
                {!(showSignature && signatureUrl) && !(showSeal && sealUrl) && (
                  <div style={{ height: '60px', borderBottom: '1px solid #cbd5e1', width: '140px' }} />
                )}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', borderTop: '1px solid #94a3b8', paddingTop: '4px', marginTop: '4px' }}>
                Authorized Signatory
              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  )
}
