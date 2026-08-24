import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const recipientId = body?.recipient_id;
    const message = body?.body;
    const senderName = body?.sender_name || user.full_name || user.email || 'A team member';
    if (!recipientId || !message) return Response.json({ error: 'recipient_id and body are required' }, { status: 400 });

    let email = null;
    try {
      const c = await base44.entities.Contractor.get(recipientId);
      email = c?.email;
    } catch (e) {}
    if (!email) {
      try {
        const u = await base44.entities.User.get(recipientId);
        email = u?.email;
      } catch (e) {}
    }
    if (!email) return Response.json({ error: 'Recipient has no email address on file' }, { status: 400 });

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: email,
      subject: `New message from ${senderName} — GForceSI Ops`,
      body: `${senderName} sent you a message via GForceSI Ops:\n\n${message}\n\n— Reply in the app or respond to this email directly.`,
    });

    return Response.json({ ok: true, sent_to: email });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}