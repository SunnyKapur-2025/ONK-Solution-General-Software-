import type { BrokerParser, ParsedContractNote } from '../types'

export const yesSecuritiesParser: BrokerParser = {
  parserKey: 'yes-securities',
  brokerName: 'Yes Securities (India) Limited',

  detect(text: string): boolean {
    return (
      text.includes('YES SECURITIES') ||
      text.includes('yessecurities.in') ||
      text.includes('YES BANK')
    )
  },

  parse(text: string): ParsedContractNote {
    return {
      brokerName: 'Yes Securities (India) Limited',
      parserKey: 'yes-securities',
      contractNoteNo: '',
      tradeDate: '',
      clientName: '',
      clientPan: '',
      trades: [],
      charges: [],
      rawText: text,
      parseWarnings: ['Yes Securities parser not yet implemented — please use Manual Entry'],
    }
  },
}
