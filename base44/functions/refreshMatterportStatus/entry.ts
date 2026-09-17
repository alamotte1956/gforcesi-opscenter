import { createClientFromRequest } from 'npm:@base44/sdk@0.8.48';
import { secrets } from 'base44:runtime';

// Pulls a single Matterport model's live state and updates the linked job.
// Requires MATTERPORT_CLIENT_ID + MATTERPORT_CLIENT_SECRET (Secrets).
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });
    const body = await req.json().catch(() => ({}));
    const jobId = (body.job_id || '').trim();
    if (!jobId) return Response.json({ error: 'job_id required' }, { status: 400 });
    const job = await base44.asServiceRole.entities.Job.get(jobId);
    if (!job) return Response.json({ error: 'Job not found' }, { status: 404 });
    if (!job.matterport_model_id) return Response.json({ error: 'No Matterport model linked to this job' }, { status: 400 });

    const clientId = secrets.get('MATTERPORT_CLIENT_ID');
    const clientSecret = secrets.get('MATTERPORT_CLIENT_SECRET');
    if (!clientId || !clientSecret) {
      return Response.json({ error: 'Matterport API credentials not configured. Add MATTERPORT_CLIENT_ID and MATTERPORT_CLIENT_SECRET in Secrets to enable status sync.' }, { status: 400 });
    }

    const auth = btoa(`${clientId}:${clientSecret}`);
    const gqlRes = await fetch('https://api.matterport.com/api/models/graph', {
      method: 'POST',
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `query getModel($id: ID!){ model(id: $id){ id name state visibility created modified publication { url(branding: default) } } }`,
        variables: { id: job.matterport_model_id },
      }),
    });
    if (!gqlRes.ok) return Response.json({ error: 'Matterport query failed: ' + (await gqlRes.text()) }, { status: 502 });
    const gqlJson = await gqlRes.json();
    if (gqlJson.errors) return Response.json({ error: 'Matterport: ' + JSON.stringify(gqlJson.errors) }, { status: 502 });
    const m = gqlJson.data && gqlJson.data.model;
    if (!m) return Response.json({ error: 'Model not found in the linked Matterport account' }, { status: 404 });

    const stateMap = { active: 'complete', processing: 'scanning', failed: 'scheduled', disabled: 'scheduled', inactive: 'complete' };
    const mappedStatus = stateMap[m.state] || 'processing';
    const shareUrl = (m.publication && m.publication.url) || `https://my.matterport.com/show/?m=${m.id}`;
    const embedUrl = `https://my.matterport.com/show/?m=${m.id}&brand=0&help=0`;
    const patch = {
      matterport_model_id: m.id,
      matterport_share_url: shareUrl,
      matterport_embed_url: embedUrl,
      matterport_synced_at: new Date().toISOString(),
      status: job.status === 'invoiced' ? 'invoiced' : mappedStatus,
    };
    await base44.asServiceRole.entities.Job.update(job.id, patch);
    return Response.json({ ok: true, state: m.state, status: patch.status, name: m.name });
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }); }
}