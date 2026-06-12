import type { BrokerParser, ParsedContractNote, ParsedTrade, ParsedCharges } from '../types'

// Helpers
function parseDate(raw: string): string {
  // Handles DD/MM/YYYY → YYYY-MM-DD
  const m = raw.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (m) return `${m[3]}-${m[2]}-${m[1]}`
  return raw.trim()
}

function num(s: string): number {
  if (!s) return 0
  return parseFloat(s.replace(/,/g, '').trim()) || 0
}

export const adityaBirlaParser: BrokerParser = {
  parserKey: 'aditya-birla',
  brokerName: 'Aditya Birla Money Limited',

  detect(text: string): boolean {
    return (
      text.includes('ADITYA BIRLA MONEY') ||
      text.includes('adityabirlacapital.com') ||
      text.includes('AAACA7472K')
    )
  },

  parse(text: string): ParsedContractNote {
    const warnings: string[] = []
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean)

    // ── Header fields ──────────────────────────────────────────────────
    const contractNoteNo = lines.find(l => /Contract Note No\.\s*:\s*\d+/.test(l))
      ?.match(/Contract Note No\.\s*:\s*(\d+)/)?.[1] ?? ''

    const tradeDateRaw = lines.find(l => /Trade Date\s+\d{2}\/\d{2}\/\d{4}/.test(l))
      ?.match(/Trade Date\s+(\d{2}\/\d{2}\/\d{4})/)?.[1]
      ?? lines.find(l => /Trade Date/.test(l))?.match(/(\d{2}\/\d{2}\/\d{4})/)?.[1]
      ?? ''
    const tradeDate = tradeDateRaw ? parseDate(tradeDateRaw) : ''

    const gstInvoiceNo = lines.find(l => /GST Invoice No\.\s*:/.test(l))
      ?.match(/GST Invoice No\.\s*:\s*(\S+)/)?.[1] ?? ''

    // Client name: line immediately after "Mr " or "Mrs " pattern before address
    const clientNameLine = lines.find(l => /^Mr\s|^Mrs\s|^M\/S\s|^MS\s/i.test(l)) ?? ''
    const clientName = clientNameLine.trim()

    const clientPan = text.match(/PAN of Client\s*:\s*([A-Z0-9*]+)/i)?.[1] ?? ''
    const clientCode = text.match(/Trading\/Backoffice Code\s*:\s*(\S+)/)?.[1] ?? ''
    const clientGstin = text.match(/GST Identification No\.\s*:\s*([0-9A-Z]+)/)?.[1] ?? ''

    // ── Trades ─────────────────────────────────────────────────────────
    const trades: ParsedTrade[] = []

    // Pattern: NSE/BSE + order_no + order_time + trade_no + trade_time + security_name + B/S + qty + price + brokerage + net_rate + (closing_rate) + net_total
    const tradeLineRegex =
      /^(NSE|BSE|MCX|NCDX|NCX|BCX|BCOM)\s+(\S+)\s+(\d{2}:\d{2}:\d{2})\s*(\S+)\s+(\d{2}:\d{2}:\d{2})\s+(.+?)\s+(B|S)\s+([\d,]+)\s+([\d,.]+)\s+([\d,.]+)\s+([\d,.]+)(?:\s+([\d,.]+))?\s+(-?[\d,.]+)/

    // Also parse segment context from lines like:
    // "Cl. Corp. NCL  Cl. Segment : CM  Cl. Book Type : T1-NORMAL  Settlement Date : 03/06/2026  Settlement Number : 2026101  Product : SEBI MTF"
    let currentSegment = 'CM'
    let currentSettlementDate = ''
    let currentSettlementNo = ''
    let currentProduct = 'NORMAL'

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]

      // Detect segment/settlement context
      if (/Cl\. Segment\s*:/.test(line)) {
        currentSegment = line.match(/Cl\. Segment\s*:\s*(\w+)/)?.[1] ?? currentSegment
        currentSettlementDate = line.match(/Settlement Date\s*:\s*([\d/]+)/)?.[1]
          ? parseDate(line.match(/Settlement Date\s*:\s*([\d/]+)/)![1])
          : currentSettlementDate
        currentSettlementNo = line.match(/Settlement Number\s*:\s*(\S+)/)?.[1] ?? currentSettlementNo
        currentProduct = line.match(/Product\s*:\s*(.+)$/)?.[1]?.trim() ?? currentProduct
      }

      const m = line.match(tradeLineRegex)
      if (!m) continue

      const [, exchange, orderNo, , tradeNo, , rawSecurity, bs, qtyStr, grossRateStr, brkStr, netRateStr, , netTotalStr] = m

      const tradeType = bs === 'B' ? 'BUY' : 'SELL'
      const qty = num(qtyStr)
      const grossRate = num(grossRateStr)
      const brokPerUnit = num(brkStr)
      const netRate = num(netRateStr)
      const netTotal = Math.abs(num(netTotalStr))

      // Determine instrument type and product
      let instrumentType: ParsedTrade['instrumentType'] = 'EQ'
      let productType: ParsedTrade['productType'] = 'DELIVERY'

      if (currentSegment === 'FO') {
        instrumentType = rawSecurity.includes(' CE') ? 'CE'
          : rawSecurity.includes(' PE') ? 'PE'
          : 'FUT'
        productType = 'FUTURES'
      } else if (currentSegment === 'CDS') {
        instrumentType = 'CURRENCY_FUT'
        productType = 'FUTURES'
      } else if (currentProduct.includes('MTF')) {
        productType = 'MTF'
      } else if (currentProduct.includes('INTRADAY') || currentProduct.includes('MIS')) {
        productType = 'INTRADAY'
      }

      // Extract ISIN if present on same or next line
      let isin: string | undefined
      const isinMatch = (line + (lines[i + 1] ?? '')).match(/\b(IN[A-Z0-9]{10})\b/)
      if (isinMatch) isin = isinMatch[1]

      trades.push({
        exchange: exchange as ParsedTrade['exchange'],
        segment: currentSegment,
        productType,
        instrumentType,
        securityName: rawSecurity.trim(),
        isin,
        tradeType,
        quantity: qty,
        grossRate,
        brokeragePerUnit: brokPerUnit,
        netRate,
        netValue: netTotal,
        orderNo,
        tradeNo,
        settlementDate: currentSettlementDate,
        settlementNo: currentSettlementNo,
      })
    }

    if (trades.length === 0) {
      warnings.push('No trades extracted — PDF text layout may require manual review')
    }

    // ── Charges ────────────────────────────────────────────────────────
    const charges: ParsedCharges[] = []

    // Parse "Net Payin and Payout Summary" section
    // Example line: "NSE - T1-NORMAL - SEBI MTF  -66,019.54  66.00  2.03  0.07  -65,951.44"
    const payoutRegex =
      /^(NSE|BSE|MCX|NCDX)[\s\-]+(\w+)[\s\-]+(.+?)\s+(-?[\d,.]+)\s+([\d,.]+)\s*([\d,.]*)\s*([\d,.]*)\s*([\d,.]*)\s*(-?[\d,.]+)/
    for (const line of lines) {
      const m = line.match(payoutRegex)
      if (!m) continue
      const [, exchange, , product, grossObl, stt, exchangeChg, sebi, other, netObl] = m
      charges.push({
        exchange,
        product: product.trim(),
        grossObligation: num(grossObl),
        stt: num(stt),
        exchangeTransactionCharges: num(exchangeChg),
        sebiTurnoverFees: num(sebi),
        stampDuty: 0,
        otherCharges: num(other),
        brokerage: 0, // computed from trades
        cgst: 0,
        sgst: 0,
        igst: 0,
        taxableValue: 0,
        netObligation: num(netObl),
      })
    }

    // Parse GST summary table
    // "NSE - T1-NORMAL - SEBI MTF  -65,951.44  6.07  6.07  0.00  0.00  -65,939.30  67.46"
    const gstRegex =
      /^(NSE|BSE|MCX|NCDX)[\s\-]+(\w+)[\s\-]+(.+?)\s+(-?[\d,.]+)\s+([\d,.]+)\s+([\d,.]+)\s+([\d,.]+)\s+([\d,.]+)\s+(-?[\d,.]+)\s+([\d,.]+)/
    for (const line of lines) {
      const m = line.match(gstRegex)
      if (!m) continue
      const [, , , product, , cgst, sgst, igst, , netObl, taxableVal] = m
      // update matching charge entry
      const existing = charges.find(c => c.product?.includes(product.trim()))
      if (existing) {
        existing.cgst = num(cgst)
        existing.sgst = num(sgst)
        existing.igst = num(igst)
        existing.taxableValue = num(taxableVal)
        existing.netObligation = num(netObl)
      }
    }

    // Compute brokerage per charge block from trades
    for (const charge of charges) {
      const relatedTrades = trades.filter(t =>
        charge.product ? true : true // all trades contribute when product match not possible
      )
      charge.brokerage = relatedTrades.reduce(
        (sum, t) => sum + t.brokeragePerUnit * t.quantity, 0
      )
    }

    if (charges.length === 0) {
      warnings.push('Charges section could not be parsed — please verify manually')
    }

    return {
      brokerName: 'Aditya Birla Money Limited',
      parserKey: 'aditya-birla',
      contractNoteNo,
      gstInvoiceNo,
      tradeDate,
      clientName,
      clientPan,
      clientCode,
      clientGstin,
      trades,
      charges,
      rawText: text,
      parseWarnings: warnings,
    }
  },
}
