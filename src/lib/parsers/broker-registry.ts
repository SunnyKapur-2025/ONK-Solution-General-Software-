import type { BrokerParser, ParsedContractNote } from './types'
import { adityaBirlaParser } from './brokers/aditya-birla'
import { angelOneParser } from './brokers/angel-one'
import { yesSecuritiesParser } from './brokers/yes-securities'
import { kotakParser } from './brokers/kotak'
import { zerodhaParser } from './brokers/zerodha'

const PARSERS: BrokerParser[] = [
  adityaBirlaParser,
  angelOneParser,
  yesSecuritiesParser,
  kotakParser,
  zerodhaParser,
]

export function detectBroker(text: string): BrokerParser | null {
  return PARSERS.find(p => p.detect(text)) ?? null
}

export function parseByKey(parserKey: string, text: string): ParsedContractNote {
  const parser = PARSERS.find(p => p.parserKey === parserKey)
  if (!parser) throw new Error(`No parser registered for key: ${parserKey}`)
  return parser.parse(text)
}

export function parseAuto(text: string): ParsedContractNote {
  const parser = detectBroker(text)
  if (!parser) {
    return {
      brokerName: 'Unknown',
      parserKey: 'unknown',
      contractNoteNo: '',
      tradeDate: '',
      clientName: '',
      clientPan: '',
      trades: [],
      charges: [],
      rawText: text,
      parseWarnings: ['Broker could not be auto-detected. Please select broker manually.'],
    }
  }
  return parser.parse(text)
}

export { PARSERS }
