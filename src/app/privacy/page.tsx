import Link from 'next/link'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-3xl mx-auto prose prose-slate">
        <Link href="/" className="text-blue-600 text-sm hover:underline no-underline">← Home</Link>
        <h1 className="mt-4">Privacy Policy</h1>
        <p className="text-sm text-slate-500">Effective Date: 1 June 2025 | Last Updated: 1 June 2025</p>
        <p>This Privacy Policy describes how <strong>ONK Solutions</strong> ("we", "us", "our") handles your information when you use the Contract Notes & Tally Integration System ("Software"), designed and developed by Sunny Kapoor, ONK Solutions.</p>

        <h2>1. Information We Process</h2>
        <p>The Software processes the following data solely to provide the service:</p>
        <ul>
          <li><strong>Contract Note PDFs</strong> — uploaded by you from your broker. These contain your name, PAN (partially masked in PDF), trade details, and financial transaction data.</li>
          <li><strong>PDF Password</strong> — entered by you to unlock password-protected PDFs. This password is used only for the duration of the PDF extraction and is <strong>never stored</strong>.</li>
          <li><strong>Trade Data</strong> — extracted from contract notes (security names, quantities, prices, charges) for the purpose of generating journal entries.</li>
        </ul>

        <h2>2. How We Use Your Data</h2>
        <ul>
          <li>To parse your contract note PDF and extract trade information</li>
          <li>To generate correct accounting journal entries</li>
          <li>To export data in TallyPrime-compatible format</li>
          <li>To compute profit & loss and holdings for your reference</li>
        </ul>
        <p>We do <strong>not</strong> sell, share, or disclose your financial data to third parties.</p>

        <h2>3. Data Storage</h2>
        <p>If you use the cloud-hosted version, parsed trade data is stored in an encrypted database associated with your account. Raw PDF files are not stored permanently after parsing. If you self-host, all data remains on your own infrastructure.</p>

        <h2>4. PAN and Financial Data</h2>
        <p>Your PAN number is used solely as a PDF unlock password as required by your broker. It is transmitted over HTTPS and is not logged or stored in our systems.</p>

        <h2>5. Security</h2>
        <p>All data in transit is encrypted using TLS/HTTPS. Database data is encrypted at rest. We follow OWASP security best practices in development.</p>

        <h2>6. Your Rights</h2>
        <p>You may request deletion of all your data at any time by contacting us. You may also export all your data in JSON format from your account settings.</p>

        <h2>7. Contact</h2>
        <p>Sunny Kapoor, ONK Solutions<br />For privacy concerns: contact through the application support channel.</p>
      </div>
    </div>
  )
}
