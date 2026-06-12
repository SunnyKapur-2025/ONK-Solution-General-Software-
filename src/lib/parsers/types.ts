export type TradeType = 'BUY' | 'SELL'
export type Segment = 'CM' | 'FO' | 'CDS' | 'COM'
export type Exchange = 'NSE' | 'BSE' | 'MCX' | 'NCDX' | 'NCX' | 'BCX' | 'BCOM'
export type ProductType = 'DELIVERY' | 'INTRADAY' | 'MTF' | 'FUTURES' | 'OPTIONS' | 'NORMAL'
export type InstrumentType = 'EQ' | 'FUT' | 'CE' | 'PE' | 'CURRENCY_FUT' | 'CURRENCY_OPT' | 'COMMODITY_FUT'

export interface ParsedTrade {
  exchange: Exchange | string
  segment: Segment | string
  productType: ProductType | string
  instrumentType: InstrumentType | string
  securityName: string
  symbol?: string
  isin?: string
  expiryDate?: string
  strikePrice?: number
  optionType?: 'CE' | 'PE'
  tradeType: TradeType
  quantity: number
  grossRate: number
  brokeragePerUnit: number
  netRate: number
  netValue: number          // net total before levies
  orderNo?: string
  tradeNo?: string
  tradeTime?: string
  settlementDate?: string
  settlementNo?: string
  remarks?: string
}

export interface ParsedCharges {
  exchange?: string
  segment?: string
  product?: string
  grossObligation: number
  stt: number
  exchangeTransactionCharges: number
  sebiTurnoverFees: number
  stampDuty: number
  otherCharges: number
  brokerage: number
  cgst: number
  sgst: number
  igst: number
  taxableValue: number      // brokerage value on which GST applied
  netObligation: number     // final payable (+) or receivable (-)
}

export interface ParsedContractNote {
  brokerName: string
  parserKey: string
  contractNoteNo: string
  gstInvoiceNo?: string
  tradeDate: string          // YYYY-MM-DD
  clientName: string
  clientPan: string
  clientCode?: string
  clientGstin?: string
  trades: ParsedTrade[]
  charges: ParsedCharges[]
  rawText: string
  parseWarnings: string[]
}

export interface BrokerParser {
  parserKey: string
  brokerName: string
  detect(text: string): boolean
  parse(text: string): ParsedContractNote
}
