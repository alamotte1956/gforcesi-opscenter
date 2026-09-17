import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

function normalizeEmail(email) {
  const e = (email || '').trim().toLowerCase();
  const at = e.indexOf('@');
  if (at < 0) return e;
  const local = e.slice(0, at);
  const domain = e.slice(at + 1);
  if (domain === 'gmail.com' || domain === 'googlemail.com') return `${local.replace(/\./g, '')}@${domain}`;
  return e;
}

const DOC_FIELDS = ['w9_document_uri', 'coi_document_uri', 'mn_ic_exemption_document_uri', 'workers_comp_document_uri'];

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const fileUri = (body.file_uri || '').trim();
    if (!fileUri) return Response.json({ error: 'file_uri required' }, { status: 400 });

    const isAdmin = user.role === 'admin';
    if (!isAdmin) {
      const list = await base44.asServiceRole.entities.Contractor.list();
      const owns = list.some(
        (c) => normalizeEmail(c.email) === normalizeEmail(user.email) && DOC_FIELDS.some((f) => c[f] === fileUri)
      );
      if (!owns) return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { signed_url } = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({ file_uri: fileUri });
    return Response.json({ signed_url });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}