'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type JournalEntry = {
  id: string | number;
  date: string;
  voucher_no: string;
  narration: string;
  debit_total: number;
  credit_total: number;
};

export default function JournalPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchEntries() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch('/api/day-book?voucher_type=journal', {
          cache: 'no-store',
        });
        if (!res.ok) {
          throw new Error(`Request failed with status ${res.status}`);
        }
        const data = await res.json();
        const rows: JournalEntry[] = Array.isArray(data)
          ? data
          : Array.isArray(data?.entries)
            ? data.entries
            : Array.isArray(data?.data)
              ? data.data
              : [];
        if (!cancelled) setEntries(rows);
      } catch (err) {
        console.error('[journal] failed to load journal entries', err);
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Failed to load journal entries',
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchEntries();
    return () => {
      cancelled = true;
    };
  }, []);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(value) || 0);

  const formatDate = (value: string) => {
    if (!value) return '-';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const totals = entries.reduce(
    (acc, e) => ({
      debit: acc.debit + (Number(e.debit_total) || 0),
      credit: acc.credit + (Number(e.credit_total) || 0),
    }),
    { debit: 0, credit: 0 },
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              Journal Entries
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Manual journal vouchers recorded in the day book.
            </p>
          </div>
          <Link
            href="/voucher"
            className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            + New Journal Entry
          </Link>
        </div>

        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          {loading ? (
            <div className="p-10 text-center text-sm text-gray-500">
              Loading journal entries...
            </div>
          ) : error ? (
            <div className="p-10 text-center text-sm text-red-600">
              {error}
            </div>
          ) : entries.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-sm font-medium text-gray-900">
                No journal entries yet
              </p>
              <p className="mt-1 text-sm text-gray-500">
                Create your first manual journal entry to get started.
              </p>
              <Link
                href="/voucher"
                className="mt-4 inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                + New Journal Entry
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                      Voucher No
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                      Narration
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">
                      Debit Total
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">
                      Credit Total
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {entries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                        {formatDate(entry.date)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                        {entry.voucher_no || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {entry.narration || '-'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-sm tabular-nums text-gray-900">
                        {formatCurrency(entry.debit_total)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-sm tabular-nums text-gray-900">
                        {formatCurrency(entry.credit_total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td
                      colSpan={3}
                      className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-600"
                    >
                      Totals
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-semibold tabular-nums text-gray-900">
                      {formatCurrency(totals.debit)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-semibold tabular-nums text-gray-900">
                      {formatCurrency(totals.credit)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
