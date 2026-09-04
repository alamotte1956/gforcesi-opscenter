import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

const ONBOARDING_URL = 'https://scanprosoft.com/register?returnTo=%2Fcontractors%2Fonboarding';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

    const body = await req.json();
    const name = (body?.name || '').trim();
    const email = (body?.email || '').trim();
    if (!name || !email) return Response.json({ error: 'name and email are required' }, { status: 400 });

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: email,
      from_name: "GForceSI Ops",
      subject: "You're invited to onboard with GForceSI",
      body: `Hello ${name},\n\nYou've been invited to join GForceSI as a field contractor. To complete your onboarding — your profile, pay details, and all required legal forms (I-9, W-4, W-4MN, W-9, and your independent contractor agreement) — please create your account using the link below:\n\n${ONBOARDING_URL}\n\nUse the email address this invitation was sent to. After you verify your email, you'll be taken straight to your onboarding form. If you already have an account, there's a "Log in" link on that page. If you have any questions, reply to this email or contact the GForceSI operations team.\n\nWelcome aboard,\nThe GForceSI Team`,
    });

    return Response.json({ ok: true, sent_to: email });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}