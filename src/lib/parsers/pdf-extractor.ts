import pdfParse from 'pdf-parse'

export interface PDFExtractResult {
  text: string
  numPages: number
  error?: string
}

/**
 * Extracts text from a PDF buffer.
 * Tries without password first; if that fails, retries with provided password.
 */
export async function extractPDFText(
  buffer: Buffer,
  password?: string
): Promise<PDFExtractResult> {
  const options: Record<string, unknown> = {
    // Prevent pdf-parse from looking for test files on disk
    max: 0,
  }
  if (password) {
    options.password = password
  }

  try {
    const data = await pdfParse(buffer, options)
    return { text: data.text, numPages: data.numpages }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)

    // Password-protected and no password supplied
    if (message.toLowerCase().includes('password') && !password) {
      return {
        text: '',
        numPages: 0,
        error: 'PASSWORD_REQUIRED',
      }
    }

    // Wrong password
    if (message.toLowerCase().includes('password')) {
      return {
        text: '',
        numPages: 0,
        error: 'WRONG_PASSWORD',
      }
    }

    return { text: '', numPages: 0, error: message }
  }
}
