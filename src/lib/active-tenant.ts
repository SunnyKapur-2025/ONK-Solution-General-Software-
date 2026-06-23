import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

const ACTIVE_TENANT_COOKIE = 'onk_active_tenant'

export interface TenantUser {
  tenant_id: string
  role: string
  name: string
}

/**
 * Returns the active tenant membership for the authenticated user.
 * Reads onk_active_tenant cookie; falls back to first active membership.
 * Returns null if user has no memberships.
 */
export async function getActiveTenantUser(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<TenantUser | null> {
  const cookieStore = await cookies()
  const activeTenantId = cookieStore.get(ACTIVE_TENANT_COOKIE)?.value

  if (activeTenantId) {
    const { data } = await supabase
      .from('tenant_users')
      .select('tenant_id, role, name')
      .eq('user_id', userId)
      .eq('tenant_id', activeTenantId)
      .eq('is_active', true)
      .maybeSingle()
    if (data) return data as TenantUser
  }

  // Fallback: pick first active membership (oldest, for consistency)
  const { data } = await supabase
    .from('tenant_users')
    .select('tenant_id, role, name')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  return (data as TenantUser | null) ?? null
}
