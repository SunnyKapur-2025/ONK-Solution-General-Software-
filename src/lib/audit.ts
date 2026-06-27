import type { SupabaseClient } from '@supabase/supabase-js';

export interface AuditParams {
  tenantId: string;
  userId: string | null;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}

/**
 * Insert an audit event. Audit logging must never break the calling request,
 * so all errors are swallowed and logged to the console.
 */
export async function logAudit(
  supabase: SupabaseClient,
  params: AuditParams,
): Promise<void> {
  try {
    const { error } = await supabase.from('audit_events').insert({
      tenant_id: params.tenantId,
      user_id: params.userId,
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId ?? null,
      metadata: params.metadata ?? null,
      ip_address: params.ipAddress ?? null,
    });
    if (error) {
      console.error('[audit] failed to insert audit event', {
        action: params.action,
        entityType: params.entityType,
        error: error.message,
      });
    }
  } catch (err) {
    console.error('[audit] unexpected error logging audit event', {
      action: params.action,
      entityType: params.entityType,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
