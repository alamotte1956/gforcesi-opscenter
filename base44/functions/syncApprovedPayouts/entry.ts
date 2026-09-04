import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import {
  getConnection, resolveBankAccountId, resolveExpenseAccountId, pushPayoutToQuickBooks,
} from '../../shared/quickbooks.ts';

// Weekly automated push of approved contractor payouts (time entries) into
// QuickBooks Online as vendor Purchases, so payroll can be run faster.
// Scheduled (no-user) invocations are allowed; non-admin direct calls are blocked.
// Requires the shared "quickbooks" connector to be authorized.
//
// Gathers every Payout with status "approved" and no quickbooks_id, creates a
// QB Purchase for each (with the contractor as the vendor), marks them "synced",
// and logs each to SyncLog. Pass { dry_run: true } to preview.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (user && user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    let input = {};
    try { input = await req.json(); } catch {}
    const dryRun = !!input.dry_run;

    const { accessToken, realmId } = await getConnection(base44);

    const [approved, contractors] = await Promise.all([
      base44.asServiceRole.entities.Payout.filter({ status: 'approved' }),
      base44.asServiceRole.entities.Contractor.list(),
    ]);
    // Only payouts not yet pushed to QuickBooks
    const pending = approved.filter((p) => !p.quickbooks_id);
    if (!pending.length) {
      return Response.json({ ok: true, dryRun, found: 0, pushed: 0, results: [], message: 'No approved payouts to sync.' });
    }

    if (dryRun) {
      return Response.json({
        ok: true, dryRun, found: pending.length,
        results: pending.map((p) => ({ id: p.id, contractor: p.contractor_name, amount: p.amount, date: p.date, hours: p.hours })),
      });
    }

    const bankId = await resolveBankAccountId(accessToken, realmId);
    if (!bankId) return Response.json({ error: 'No Bank account found in QuickBooks. Create a bank account first.' }, { status: 400 });
    const expenseAccountId = await resolveExpenseAccountId(accessToken, realmId);
    if (!expenseAccountId) return Response.json({ error: 'No Expense account found in QuickBooks. Create an expense account first.' }, { status: 400 });

    const contractorById = (id) => contractors.find((c) => c.id === id);
    const results = [];
    let pushed = 0;
    for (const p of pending) {
      try {
        const contractor = contractorById(p.contractor_id);
        const res = await pushPayoutToQuickBooks(base44, accessToken, realmId, p, contractor, bankId, expenseAccountId);
        results.push({ id: p.id, ...res });
        pushed++;
      } catch (e) {
        results.push({ id: p.id, ok: false, error: e.message });
      }
    }
    return Response.json({ ok: true, dryRun, found: pending.length, pushed, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}