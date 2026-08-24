import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const page = body?.page || 'dashboard';
    const summary = body?.summary || {};
    const role = body?.role || user.role || 'user';
    const stuck = body?.stuck === true;
    const prompt = stuck
      ? `You are an AI assistant inside GForceSI OpsCenter, a 3D digital-twin field operations platform. The user (role: ${role}) has been idle on the "${page}" page and may need help. Here is a JSON snapshot of the current data on that page: ${JSON.stringify(summary)}. In a friendly tone, briefly explain what they can do on this page and give 2 to 3 concrete next steps to use it effectively for their role. Keep the whole response under 120 words and output only bullet lines, each starting with "• ".`
      : `You are an AI operations advisor for GForceSI OpsCenter, a 3D digital-twin field operations platform that manages jobs, contractors, clients, invoices, equipment, and routes. The user (role: ${role}) is viewing the "${page}" page. Here is a JSON snapshot of the current data on that page: ${JSON.stringify(summary)}. Provide 3 to 5 concise, actionable bullet points of real-time advice relevant to this page's data — flag risks, suggest next actions, and highlight opportunities. Keep each bullet under 22 words. Output only bullet lines, each starting with "• ".`;
    const res = await base44.asServiceRole.integrations.Core.InvokeLLM({ prompt });
    return Response.json({ advice: typeof res === 'string' ? res : JSON.stringify(res) });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}