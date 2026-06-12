import type { BrokerParser, ParsedContractNote } from '../types'

export const kotakParser: BrokerParser = {
  parserKey: 'kotak',
  brokerName: 'Kotak Securities Limited',

  detect(text: string): boolean {
    return (
      text.includes('KOTAK SECURITIES') ||
      text.includes('kotaksecurities.com')
    )
  },

  parse(text: string): ParsedContractNote {
    return {
      brokerName: 'Kotak Securities Limited',
      parserKey: 'kotak',
      contractNoteNo: '',
      tradeDate: '',
      clientName: '',
      clientPan: '',
      trades: [],
      charges: [],
      rawText: text,
      parseWarnings: ['Kotak Securities parser not yet implemented — please use Manual Entry'],
    }
  },
}
