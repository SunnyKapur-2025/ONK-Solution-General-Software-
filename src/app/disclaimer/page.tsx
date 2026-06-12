import Link from 'next/link'

export default function DisclaimerPage() {
  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-3xl mx-auto prose prose-slate">
        <Link href="/" className="text-blue-600 text-sm hover:underline no-underline">← Home</Link>
        <h1 className="mt-4">Disclaimer</h1>
        <p className="text-sm text-slate-500">Issued by: ONK Solutions | Designed & Developed by: Sunny Kapoor</p>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4 not-prose">
          <p className="text-red-900 font-semibold text-sm">Important — Please Read Before Use</p>
        </div>

        <h2>1. Not Financial or Tax Advice</h2>
        <p>This Software is a <strong>technology tool</strong> designed to assist in the mechanical extraction of trade data from broker contract notes and the generation of accounting entries in a format compatible with TallyPrime. It does <strong>not</strong> constitute financial advice, investment advice, or tax advice.</p>

        <h2>2. Accuracy of Journal Entries</h2>
        <p>While the Software applies standard Indian accounting principles (double-entry, FIFO cost basis, STCG/LTCG categorization), the correctness of journal entries depends on:</p>
        <ul>
          <li>Accurate PDF parsing (which may fail on heavily formatted or non-standard PDFs)</li>
          <li>Correct cost basis information entered by the user for existing holdings</li>
          <li>The user's specific tax situation and applicable rules</li>
        </ul>
        <p><strong>All journal entries must be reviewed and verified by a qualified Chartered Accountant before being posted in accounting software.</strong></p>

        <h2>3. Broker Compatibility</h2>
        <p>Parsers are built based on available sample contract notes. Brokers may change their PDF formats without notice. If a parser fails, the Manual Entry feature must be used.</p>

        <h2>4. Tally Compatibility</h2>
        <p>Tally XML export is designed for TallyPrime 3.x. Compatibility with older versions of Tally.ERP 9 or future TallyPrime versions is not guaranteed. Always test with a backup company before importing into production.</p>

        <h2>5. Limitation of Liability</h2>
        <p>ONK Solutions and Sunny Kapoor shall not be liable for any financial loss, tax liability, or data loss arising from the use of this Software. Use at your own risk.</p>

        <h2>6. SEBI / Tax Compliance</h2>
        <p>Users are responsible for ensuring their accounting and tax filings comply with SEBI regulations, Income Tax Act 1961, and applicable GST laws. This tool is an aid, not a compliance guarantee.</p>
      </div>
    </div>
  )
}
