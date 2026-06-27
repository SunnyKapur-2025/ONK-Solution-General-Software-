import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getActiveTenantUser } from '@/lib/active-tenant';
import { EmployeeSchema, validateBody } from '@/lib/validation/schemas';

const ALLOWED_COLUMNS = [
  'name',
  'designation',
  'department',
  'basic_salary',
  'hra_percent',
  'other_allowances',
  'pf_applicable',
  'esi_applicable',
  'tds_section',
  'tds_rate',
  'bank_account',
  'bank_name',
  'ifsc',
  'joining_date',
  'is_active',
] as const;

function pickAllowed(body: Record<string, unknown>): {
  ok: true;
  data: Record<string, unknown>;
} | { ok: false; error: string } {
  const allowed = new Set<string>(ALLOWED_COLUMNS);
  const extraneous = Object.keys(body).filter((k) => !allowed.has(k));
  if (extraneous.length > 0) {
    return { ok: false, error: `Unexpected fields: ${extraneous.join(', ')}` };
  }
  const picked: Record<string, unknown> = {};
  for (const key of ALLOWED_COLUMNS) {
    if (key in body) picked[key] = body[key];
  }
  return { ok: true, data: picked };
}

async function getContext() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  try {
    const tenantUser = await getActiveTenantUser(supabase, user.id);
    if (!tenantUser) {
      return { error: NextResponse.json({ error: 'No active tenant' }, { status: 403 }) };
    }
    return { supabase, user, tenantId: tenantUser.tenant_id };
  } catch (err) {
    console.error('[payroll/employees] tenant resolution failed', { userId: user.id, err });
    return { error: NextResponse.json({ error: 'No active tenant' }, { status: 403 }) };
  }
}

export async function GET() {
  const ctx = await getContext();
  if ('error' in ctx) return ctx.error;
  const { supabase, tenantId } = ctx;
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('[payroll/employees][GET] db error', { tenantId, error });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ employees: data ?? [] });
}

export async function POST(req: NextRequest) {
  const ctx = await getContext();
  if ('error' in ctx) return ctx.error;
  const { supabase, tenantId } = ctx;
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch (err) {
    console.error('[payroll/employees][POST] invalid json', err);
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const picked = pickAllowed(body);
  if (!picked.ok) {
    return NextResponse.json({ error: picked.error }, { status: 400 });
  }
  const validated = validateBody(EmployeeSchema, picked.data);
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }
  const payload = { ...validated.data, tenant_id: tenantId };
  const { data, error } = await supabase
    .from('employees')
    .insert(payload)
    .select()
    .single();
  if (error) {
    console.error('[payroll/employees][POST] insert failed', { tenantId, error });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ employee: data }, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const ctx = await getContext();
  if ('error' in ctx) return ctx.error;
  const { supabase, tenantId } = ctx;
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch (err) {
    console.error('[payroll/employees][PUT] invalid json', err);
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const { id, ...rest } = body as { id?: string } & Record<string, unknown>;
  if (!id) {
    return NextResponse.json({ error: 'Missing employee id' }, { status: 400 });
  }
  const picked = pickAllowed(rest);
  if (!picked.ok) {
    return NextResponse.json({ error: picked.error }, { status: 400 });
  }
  const validated = validateBody(EmployeeSchema.partial(), picked.data);
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }
  const updates = validated.data;
  const { data, error } = await supabase
    .from('employees')
    .update(updates)
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single();
  if (error) {
    console.error('[payroll/employees][PUT] update failed', { tenantId, id, error });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ employee: data });
}

export async function DELETE(req: NextRequest) {
  const ctx = await getContext();
  if ('error' in ctx) return ctx.error;
  const { supabase, tenantId } = ctx;
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Missing employee id' }, { status: 400 });
  }
  const { error } = await supabase
    .from('employees')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenantId);
  if (error) {
    console.error('[payroll/employees][DELETE] delete failed', { tenantId, id, error });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
