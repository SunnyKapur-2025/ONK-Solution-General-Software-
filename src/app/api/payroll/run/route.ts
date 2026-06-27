import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getActiveTenantUser } from '@/lib/active-tenant';

type PayrollRow = {
  gross?: number;
  net?: number;
  total_gross?: number;
  total_net?: number;
};

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let tenantId: string;
  try {
    const tenantUser = await getActiveTenantUser(supabase, user.id);
    if (!tenantUser) {
      return NextResponse.json({ error: 'No active tenant' }, { status: 403 });
    }
    tenantId = tenantUser.tenant_id;
  } catch (err) {
    console.error('[payroll/run] tenant resolution failed', { userId: user.id, err });
    return NextResponse.json({ error: 'No active tenant' }, { status: 403 });
  }

  let body: { month?: number; year?: number; rows?: PayrollRow[] };
  try {
    body = await req.json();
  } catch (err) {
    console.error('[payroll/run] invalid json', err);
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { month, year, rows } = body;
  if (!month || !year || !Array.isArray(rows)) {
    return NextResponse.json(
      { error: 'month, year, and rows[] are required' },
      { status: 400 }
    );
  }

  const total_gross = rows.reduce(
    (acc, r) => acc + Number(r.gross ?? r.total_gross ?? 0),
    0
  );
  const total_net = rows.reduce(
    (acc, r) => acc + Number(r.net ?? r.total_net ?? 0),
    0
  );

  const { data, error } = await supabase
    .from('payroll_runs')
    .insert({
      tenant_id: tenantId,
      month,
      year,
      total_gross,
      total_net,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error('[payroll/run] insert failed', { tenantId, month, year, error });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ payroll_run: data }, { status: 201 });
}
