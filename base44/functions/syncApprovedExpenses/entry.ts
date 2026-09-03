import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import {
  getConnection, resolveBankAccountId, resolveExpenseAccountId, pushExpenseToQuickBooks,
} from '../../shared/quickbooks.ts';

// Weekly automated push of approved expenses into QuickBooks Online.
// Scheduled (no-user) invocations are allowed; non-admin direct calls are blocked.
// Requires the shared "quickbooks" connector to be authorized.
//
// Gathers every Expense with status "approved", creates a QB Purchase for each,
// marks them "synced", and logs each to SyncLog. Pass { dry_run: true } to preview.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (user && user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    let input = {};
    try { input = await req.json(); } catch {}
    const dryRun = !!input.dry_run;

    const { accessToken, realmId } = await getConnection(base44);

    const approved = await base44.asServiceRole.entities.Expense.filter({ status: 'approved' });
    if (!approved.length) {
      return Response.json({ ok: true, dryRun, found: 0, pushed: 0, results: [], message: 'No approved expenses to sync.' });
    }

    if (dryRun) {
      return Response.json({
        ok: true, dryRun, found: approved.length,
        results: approved.map((e) => ({ id: e.id, description: e.description, amount: e.amount, date: e.date })),
      });
    }

    const bankId = await resolveBankAccountId(accessToken, realmId);
    if (!bankId) return Response.json({ error: 'No Bank account found in QuickBooks. Create a bank account first.' }, { status: 400 });
    const expenseAccountId = await resolveExpenseAccountId(accessToken, realmId);
    if (!expenseAccountId) return Response.json({ error: 'No Expense account found in QuickBooks. Create an expense account first.' }, { status: 400 });

    const results = [];
    let pushed = 0;
    for (const exp of approved) {
      try {
        const res = await pushExpenseToQuickBooks(base44, accessToken, realmId, exp, bankId, expenseAccountId);
        results.push({ id: exp.id, ...res });
        pushed++;
      } catch (e) {
        results.push({ id: exp.id, ok: false, error: e.message });
      }
    }
    return Response.json({ ok: true, dryRun, found: approved.length, pushed, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}