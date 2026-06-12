import type { BrokerParser, ParsedContractNote } from '../types'

export const zerodhaParser: BrokerParser = {
  parserKey: 'zerodha',
  brokerName: 'Zerodha Broking Limited',

  detect(text: string): boolean {
    return (
      text.includes('ZERODHA') ||
      text.includes('zerodha.com') ||
      text.includes('RAINBOW INDUSTRIES')
    )
  },

  parse(text: string): ParsedContractNote {
    return {
      brokerName: 'Zerodha Broking Limited',
      parserKey: 'zerodha',
      contractNoteNo: '',
      tradeDate: '',
      clientName: '',
      clientPan: '',
      trades: [],
      charges: [],
      rawText: text,
      parseWarnings: ['Zerodha parser not yet implemented — please use Manual Entry'],
    }
  },
}
