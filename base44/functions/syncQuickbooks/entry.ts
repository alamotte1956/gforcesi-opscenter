import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import {
  getConnection, qbQuery, qbCreate, qbGet,
  ensureCustomerId, resolveItemId, resolveExpenseAccountId, resolveBankAccountId,
  pushExpenseToQuickBooks,
} from '../../shared/quickbooks.ts';

// Real two-way QuickBooks Online sync. Admin-only. Requires the shared
// "quickbooks" connector to be authorized (getConnection("quickbooks")).
//
// Actions:
//   pushInvoice       { id }                 -> create/update a QB invoice
//   pushExpenses      { ids: string[] }      -> create QB purchases for approved expenses
//   pullCustomers     {}                     -> upsert QB customers into the Client entity
//   pullInvoiceStatus {}                     -> mark local invoices paid when QB Balance = 0
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    let payload: any = {};
    try { payload = await req.json(); } catch {}
    const action = payload.action;

    const { accessToken, realmId } = await getConnection(base44);

    if (action === 'pushInvoice') return await pushInvoice(base44, accessToken, realmId, payload.id);
    if (action === 'pushExpenses') return await pushExpenses(base44, accessToken, realmId, payload.ids || []);
    if (action === 'pullCustomers') return await pullCustomers(base44, accessToken, realmId);
    if (action === 'pullInvoiceStatus') return await pullInvoiceStatus(base44, accessToken, realmId);

    return Response.json({ error: 'Unknown action: ' + action }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

async function logSync(base44, sync_type, direction, status, entity_id, entity_type, entity_label, message) {
  await base44.entities.SyncLog.create({
    sync_type, direction, status, entity_id, entity_type, entity_label, message,
    timestamp: new Date().toISOString(),
  });
}

async function pushInvoice(base44, accessToken, realmId, invoiceId) {
  const invoice = await base44.entities.Invoice.get(invoiceId);
  if (!invoice) return Response.json({ error: 'Invoice not found' }, { status: 404 });

  const client = invoice.client_id ? await base44.entities.Client.get(invoice.client_id).catch(() => null) : null;
  if (!client) return Response.json({ error: 'A linked client is required to sync an invoice to QuickBooks' }, { status: 400 });

  const customerId = await ensureCustomerId(accessToken, realmId, client);
  if (!customerId) return Response.json({ error: 'Could not resolve or create a QuickBooks customer for this client' }, { status: 400 });

  const itemId = await resolveItemId(accessToken, realmId);
  if (!itemId) return Response.json({ error: 'No product/service Item found in QuickBooks. Create one in QuickBooks first.' }, { status: 400 });

  const total = Number(invoice.total || (Number(invoice.subtotal || 0) + Number(invoice.tax || 0)));
  const body: any = {
    DocNumber: invoice.invoice_number,
    CustomerRef: { value: String(customerId) },
    TxnDate: invoice.issue_date,
    DueDate: invoice.due_date || undefined,
    Line: [{
      Amount: total,
      DetailType: 'SalesItemLineDetail',
      Description: invoice.notes || invoice.project_name || 'Services',
      SalesItemLineDetail: { ItemRef: { value: String(itemId) }, Qty: 1, UnitPrice: total },
    }],
    PrivateNote: invoice.notes || undefined,
  };

  let result;
  if (invoice.quickbooks_invoice_id) {
    const existing = await qbGet(accessToken, realmId, 'invoice', String(invoice.quickbooks_invoice_id)).catch(() => null);
    body.Id = String(invoice.quickbooks_invoice_id);
    body.SyncToken = existing?.SyncToken || '0';
    body.sparse = true;
    result = await qbCreate(accessToken, realmId, 'invoice', body);
  } else {
    result = await qbCreate(accessToken, realmId, 'invoice', body);
  }

  const qbId = result?.Id;
  await base44.entities.Invoice.update(invoiceId, { quickbooks_invoice_id: qbId ? String(qbId) : undefined, status: 'synced' });
  if (!client.quickbooks_customer_id && customerId) {
    await base44.entities.Client.update(client.id, { quickbooks_customer_id: String(customerId) });
  }
  await logSync(base44, 'invoice', 'to_qb', 'success', invoiceId, 'Invoice', invoice.invoice_number,
    `Invoice ${invoice.invoice_number} ($${total.toLocaleString()}) synced to QuickBooks`);
  return Response.json({ ok: true, quickbooks_invoice_id: qbId ? String(qbId) : null, docNumber: result?.DocNumber });
}

async function pushExpenses(base44, accessToken, realmId, ids) {
  const bankId = await resolveBankAccountId(accessToken, realmId);
  if (!bankId) return Response.json({ error: 'No Bank account found in QuickBooks. Create a bank account first.' }, { status: 400 });
  const expenseAccountId = await resolveExpenseAccountId(accessToken, realmId);
  if (!expenseAccountId) return Response.json({ error: 'No Expense account found in QuickBooks. Create an expense account first.' }, { status: 400 });

  const results = [];
  for (const id of ids) {
    try {
      const exp = await base44.entities.Expense.get(id);
      if (!exp) { results.push({ id, ok: false, error: 'not found' }); continue; }
      const res = await pushExpenseToQuickBooks(base44, accessToken, realmId, exp, bankId, expenseAccountId);
      results.push({ id, ...res });
    } catch (e) {
      results.push({ id, ok: false, error: e.message });
    }
  }
  return Response.json({ ok: true, results });
}

async function pullCustomers(base44, accessToken, realmId) {
  const q = await qbQuery(accessToken, realmId,
    'SELECT Id, DisplayName, CompanyName, PrimaryEmailAddr, PrimaryPhone, BillAddr FROM Customer MAXRESULTS 1000');
  const customers = q.Customer || [];
  const localClients = await base44.entities.Client.list();
  let created = 0, updated = 0;
  for (const c of customers) {
    const data = {
      name: c.DisplayName,
      company: c.CompanyName || undefined,
      billing_email: c.PrimaryEmailAddr?.Address || undefined,
      billing_phone: c.PrimaryPhone?.FreeFormNumber || undefined,
      billing_address: c.BillAddr?.Line1 || undefined,
      quickbooks_customer_id: String(c.Id),
    };
    const existing = localClients.find((cl) => cl.quickbooks_customer_id === String(c.Id) || cl.name === c.DisplayName);
    if (existing) {
      await base44.entities.Client.update(existing.id, data);
      updated++;
    } else {
      await base44.entities.Client.create(data);
      created++;
    }
  }
  await logSync(base44, 'customer', 'from_qb', 'success', undefined, 'Customer', 'bulk',
    `Pulled ${customers.length} customers from QuickBooks (${created} new, ${updated} updated)`);
  return Response.json({ ok: true, pulled: customers.length, created, updated });
}

async function pullInvoiceStatus(base44, accessToken, realmId) {
  const q = await qbQuery(accessToken, realmId, 'SELECT Id, DocNumber, Balance, TotalAmt FROM Invoice MAXRESULTS 1000');
  const qbInvoices = q.Invoice || [];
  const local = await base44.entities.Invoice.list();
  let paid = 0;
  for (const li of local) {
    if (!li.quickbooks_invoice_id) continue;
    const match = qbInvoices.find((qi) => String(qi.Id) === String(li.quickbooks_invoice_id));
    if (!match) continue;
    if (Number(match.Balance) === 0 && li.status !== 'paid') {
      await base44.entities.Invoice.update(li.id, { status: 'paid' });
      paid++;
    }
  }
  await logSync(base44, 'invoice', 'from_qb', 'success', undefined, 'Invoice', 'bulk',
    `Pulled invoice status from QuickBooks (${paid} marked paid)`);
  return Response.json({ ok: true, paid });
}