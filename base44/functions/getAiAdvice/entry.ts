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
      ? `You are an AI assistant inside GForceSI OpsCenter, a 3D digital-twin field operations platform. The user (role: ${role}) has been idle on the "${page}" page and may need help. Here is a JSON snapshot of the current data on that page: ${JSON.stringify(summary)}. In a friendly tone, give a one-line description of what this page is for, then provide 3 to 4 numbered step-by-step instructions to complete the primary task on this page for their role, referencing the actual data shown. Output the description line first, then the steps each starting with "1. ", "2. ", etc. Keep each step under 25 words.`
      : `You are an AI assistant inside GForceSI OpsCenter, a 3D digital-twin field operations platform that manages jobs, contractors, clients, invoices, equipment, routes, and field reporting. The user (role: ${role}) is viewing the "${page}" page and wants to know how to complete their task here. Here is a JSON snapshot of the current data on that page: ${JSON.stringify(summary)}. First give a one-line summary of what this page is for. Then provide 4 to 6 numbered, step-by-step instructions that walk the user through completing the primary task on this page for their role — reference the actual records and data shown when relevant (e.g. specific job names, pending counts, overdue items). Keep each step under 25 words and make it concrete and actionable. Output only the summary line followed by the numbered steps, each starting with "1. ", "2. ", etc.`;
    const res = await base44.asServiceRole.integrations.Core.InvokeLLM({ prompt });
    return Response.json({ advice: typeof res === 'string' ? res : JSON.stringify(res) });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}