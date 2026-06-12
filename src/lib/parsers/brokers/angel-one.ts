import type { BrokerParser, ParsedContractNote } from '../types'

// Stub parser — will be completed when Angel One sample PDF is received
export const angelOneParser: BrokerParser = {
  parserKey: 'angel-one',
  brokerName: 'Angel One Limited',

  detect(text: string): boolean {
    return (
      text.includes('ANGEL ONE') ||
      text.includes('Angel Broking') ||
      text.includes('angelone.in') ||
      text.includes('angelbroking.com')
    )
  },

  parse(text: string): ParsedContractNote {
    return {
      brokerName: 'Angel One Limited',
      parserKey: 'angel-one',
      contractNoteNo: '',
      tradeDate: '',
      clientName: '',
      clientPan: '',
      trades: [],
      charges: [],
      rawText: text,
      parseWarnings: ['Angel One parser not yet implemented — please use Manual Entry'],
    }
  },
}
