/**
 * Live Tally sync via TallyPrime's built-in HTTP XML server.
 * TallyPrime must be running and Gateway of Tally must be open.
 * Default port: 9000. Configure in Tally: F12 > Advanced Config > Client/Server > Enable.
 */

import axios from 'axios'

const TALLY_HOST = process.env.TALLY_HOST ?? 'localhost'
const TALLY_PORT = process.env.TALLY_PORT ?? '9000'
const TALLY_URL = `http://${TALLY_HOST}:${TALLY_PORT}`

export interface TallySyncResult {
  success: boolean
  response?: string
  error?: string
}

export async function syncToTally(xml: string): Promise<TallySyncResult> {
  try {
    const response = await axios.post(TALLY_URL, xml, {
      headers: { 'Content-Type': 'text/xml' },
      timeout: 15000,
    })
    const body = response.data as string

    if (body.includes('LINEERROR') || body.includes('IMPORTERROR')) {
      return {
        success: false,
        response: body,
        error: extractTallyError(body),
      }
    }

    return { success: true, response: body }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    if (message.includes('ECONNREFUSED') || message.includes('ECONNRESET')) {
      return {
        success: false,
        error: 'Tally is not running or not reachable. Please open TallyPrime and ensure HTTP server is enabled (F12 > Advanced Config).',
      }
    }
    return { success: false, error: message }
  }
}

export async function checkTallyConnection(): Promise<{ connected: boolean; version?: string; error?: string }> {
  const pingXML = `<ENVELOPE><HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER><BODY><EXPORTDATA><REQUESTDESC><REPORTNAME>List of Companies</REPORTNAME></REQUESTDESC></EXPORTDATA></BODY></ENVELOPE>`
  try {
    const res = await axios.post(TALLY_URL, pingXML, {
      headers: { 'Content-Type': 'text/xml' },
      timeout: 5000,
    })
    return { connected: true, version: 'TallyPrime' }
  } catch {
    return { connected: false, error: 'Tally not reachable' }
  }
}

function extractTallyError(xml: string): string {
  const match = xml.match(/<LINEERROR>(.*?)<\/LINEERROR>/i)
    || xml.match(/<IMPORTERROR>(.*?)<\/IMPORTERROR>/i)
  return match ? match[1] : 'Unknown Tally error — check the XML manually'
}
