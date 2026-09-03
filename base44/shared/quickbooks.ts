// Shared helpers for the QuickBooks Online REST API via the platform's
// shared "quickbooks" connector. Requires an authorized shared connection
// (getConnection("quickbooks")) — see base44/functions/syncQuickbooks.

const QB_BASE = "https://quickbooks.api.intuit.com/v3/company";

export async function getConnection(base44) {
  const conn = await base44.asServiceRole.connectors.getConnection("quickbooks");
  const accessToken = conn?.accessToken;
  const realmId = conn?.connectionConfig?.realmId;
  if (!accessToken || !realmId) {
    throw new Error("QuickBooks is not connected. Connect it from the setup chat first.");
  }
  return { accessToken, realmId };
}

export async function qbRequest(accessToken, realmId, method, path, body) {
  const res = await fetch(`${QB_BASE}/${realmId}/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  if (!res.ok) {
    const fault =
      data?.Fault?.Error?.[0]?.Detail ||
      data?.fault?.error?.[0]?.detail ||
      data?.error ||
      text ||
      `QuickBooks request failed (${res.status})`;
    throw new Error(typeof fault === "string" ? fault : JSON.stringify(fault));
  }
  return data;
}

export async function qbQuery(accessToken, realmId, sql) {
  const data = await qbRequest(accessToken, realmId, "GET", `query?query=${encodeURIComponent(sql)}`);
  return data?.QueryResponse || {};
}

export async function qbCreate(accessToken, realmId, entity, body) {
  const data = await qbRequest(accessToken, realmId, "POST", entity, body);
  return data?.[entity] || data;
}

export async function qbGet(accessToken, realmId, entity, id) {
  const data = await qbRequest(accessToken, realmId, "GET", `${entity}/${id}`);
  return data?.[entity] || data;
}

function escapeStr(s) {
  return String(s ?? "").replace(/'/g, "\\'");
}

export async function resolveCustomerId(accessToken, realmId, name) {
  if (!name) return null;
  const q = await qbQuery(
    accessToken,
    realmId,
    `SELECT Id, DisplayName FROM Customer WHERE DisplayName = '${escapeStr(name)}' MAXRESULTS 1`
  );
  const customers = q.Customer || [];
  return customers[0]?.Id || null;
}

export async function createCustomer(accessToken, realmId, client) {
  const body = {
    DisplayName: client.name,
    CompanyName: client.company || undefined,
    PrimaryEmailAddr: client.billing_email ? { Address: client.billing_email } : undefined,
    PrimaryPhone: client.billing_phone ? { FreeFormNumber: client.billing_phone } : undefined,
    BillAddr: client.billing_address ? { Line1: client.billing_address } : undefined,
  };
  const created = await qbCreate(accessToken, realmId, "customer", body);
  return created?.Id || null;
}

// Returns the QB customer Id for a local Client, creating the customer in QB
// when no match exists. Stores it back on the Client via the caller.
export async function ensureCustomerId(accessToken, realmId, client) {
  if (client?.quickbooks_customer_id) return String(client.quickbooks_customer_id);
  const existing = await resolveCustomerId(accessToken, realmId, client?.name);
  if (existing) return String(existing);
  const created = await createCustomer(accessToken, realmId, client);
  return created ? String(created) : null;
}

export async function resolveItemId(accessToken, realmId) {
  const q = await qbQuery(accessToken, realmId, "SELECT Id, Name FROM Item MAXRESULTS 1");
  const items = q.Item || [];
  return items[0]?.Id || null;
}

export async function resolveExpenseAccountId(accessToken, realmId) {
  const q = await qbQuery(
    accessToken,
    realmId,
    "SELECT Id, Name FROM Account WHERE AccountType = 'Expense' MAXRESULTS 1"
  );
  const accounts = q.Account || [];
  return accounts[0]?.Id || null;
}

export async function resolveBankAccountId(accessToken, realmId) {
  const q = await qbQuery(
    accessToken,
    realmId,
    "SELECT Id, Name FROM Account WHERE AccountType = 'Bank' MAXRESULTS 1"
  );
  const accounts = q.Account || [];
  return accounts[0]?.Id || null;
}