'use client'

import { useState, useEffect } from 'react'
import OwnerDashboard from '@/components/dashboard/OwnerDashboard'

export default function TenantDashboardPage() {
  const [data, setData] = useState<Parameters<typeof OwnerDashboard>[0]['data'] | null>(null)
  const [meta, setMeta] = useState({ tenantName: '', userName: '' })

  useEffect(() => {
    Promise.all([
      fetch('/api/dashboard').then(r => r.json()),
      fetch('/api/me').then(r => r.json()).catch(() => ({})),
    ]).then(([dashboard, me]) => {
      setData(dashboard)
      setMeta({ tenantName: me.tenantName || '', userName: me.userName || '' })
    })
  }, [])

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        <div className="text-center">
          <div className="text-2xl mb-2">⏳</div>
          <p className="text-sm">Loading dashboard…</p>
        </div>
      </div>
    )
  }

  return <OwnerDashboard data={data} tenantName={meta.tenantName} userName={meta.userName} />
}
