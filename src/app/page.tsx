import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-col flex-1 items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="text-center text-white px-6 max-w-xl">
        <div className="mb-4">
          <span className="text-5xl font-bold tracking-tight">
            <span className="text-blue-400">ONK</span> Solutions
          </span>
        </div>
        <p className="text-slate-300 text-lg mb-2">
          Business Management Software for the Indian Service Industry
        </p>
        <p className="text-slate-500 text-sm mb-10">
          Accounting · GST · TDS · Payroll · Invoicing · Reports
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/auth/login"
            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/auth/register"
            className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Get Started
          </Link>
        </div>
      </div>
    </main>
  );
}
