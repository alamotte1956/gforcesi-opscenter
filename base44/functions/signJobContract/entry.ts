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

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const contractId = (body.contract_id || '').trim();
    const signatureName = (body.signature_name || '').trim();
    const insuranceAck = !!body.insurance_acknowledged;
    const irsAck = !!body.irs_acknowledged;
    const esignConsent = !!body.esign_consent;
    if (!contractId) return Response.json({ error: 'contract_id required' }, { status: 400 });
    if (!signatureName) return Response.json({ error: 'signature_name required' }, { status: 400 });
    if (!insuranceAck || !irsAck || !esignConsent) return Response.json({ error: 'All acknowledgments are required' }, { status: 400 });

    const contract = await base44.asServiceRole.entities.JobContract.get(contractId);
    if (!contract) return Response.json({ error: 'Contract not found' }, { status: 404 });
    if (normalizeEmail(contract.contractor_email) !== normalizeEmail(user.email)) return Response.json({ error: 'Forbidden' }, { status: 403 });
    if (contract.status !== 'pending') return Response.json({ error: 'Contract already ' + contract.status, status: contract.status }, { status: 409 });

    const now = new Date().toISOString();
    const signatureBlock = `\n\nSIGNATURE\n\nSigned electronically by ${signatureName} (Contractor)\nEmail: ${contract.contractor_email}\nDate: ${new Date(now).toLocaleString()}\nAcknowledgments: Insurance \u2713 \u00b7 IRS/Tax \u2713 \u00b7 E-sign consent \u2713\nThis electronic signature is the legal equivalent of a handwritten signature.`;
    const finalizedTerms = (contract.terms || '') + signatureBlock;

    await base44.asServiceRole.entities.JobContract.update(contractId, {
      status: 'signed',
      signed_at: now,
      signature_name: signatureName,
      esign_consent: true,
      insurance_acknowledged: true,
      irs_acknowledged: true,
      terms: finalizedTerms,
    });

    return Response.json({ ok: true, contract_id: contractId, status: 'signed' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}