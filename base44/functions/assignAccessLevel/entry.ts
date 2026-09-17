import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

const ROLE_TO_LEVEL = {
  "Field Technician": "field",
  "Field Pilot": "field",
  "Dispatcher": "dispatcher",
  "Billing Manager": "billing",
  "Admin": "full",
};

// Gmail/Googlemail ignore dots in the local part; normalize so invites that
// were sent to one variant still match a user who registered with another.
function normalizeEmail(email) {
  const e = (email || '').trim().toLowerCase();
  const at = e.indexOf('@');
  if (at < 0) return e;
  const local = e.slice(0, at);
  const domain = e.slice(at + 1);
  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    return `${local.replace(/\./g, '')}@${domain}`;
  }
  return e;
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    // Allow workflow (no-user) invocations; block non-admin direct calls.
    const user = await base44.auth.me().catch(() => null);
    if (user && user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const rawEmail = (body.email || '').trim();
    if (!rawEmail) return Response.json({ error: 'email required' }, { status: 400 });

    const target = normalizeEmail(rawEmail);

    const users = await base44.asServiceRole.entities.User.list();
    const u = users.find((x) => normalizeEmail(x.email) === target);
    if (!u) return Response.json({ assigned: false, reason: 'user not found', email: rawEmail });
    if (u.role === 'admin') return Response.json({ assigned: false, reason: 'admin user' });
    if (u.access_level) return Response.json({ assigned: false, reason: 'already assigned', access_level: u.access_level });

    const contractors = await base44.asServiceRole.entities.Contractor.list();
    const c = contractors.find((x) => normalizeEmail(x.email) === target);
    if (c && ROLE_TO_LEVEL[c.role]) {
      if (c.onboarding_status !== 'complete') return Response.json({ assigned: false, reason: 'onboarding incomplete', contractor: c.name, onboarding_status: c.onboarding_status });
      await base44.asServiceRole.entities.User.update(u.id, { access_level: ROLE_TO_LEVEL[c.role] });
      return Response.json({ assigned: true, access_level: ROLE_TO_LEVEL[c.role], contractor: c.name, contractor_role: c.role });
    }

    const clients = await base44.asServiceRole.entities.Client.list();
    const cl = clients.find((x) => normalizeEmail(x.portal_email) === target && x.portal_access_level && x.portal_access_level !== 'none');
    if (cl) {
      await base44.asServiceRole.entities.User.update(u.id, { access_level: 'client' });
      return Response.json({ assigned: true, access_level: 'client', client: cl.name });
    }

    return Response.json({ assigned: false, reason: 'no matching contractor or client', email: rawEmail, normalized: target });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}