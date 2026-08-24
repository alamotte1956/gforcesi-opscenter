import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from 'base44:runtime';

// Pulls models (spaces) from the Matterport API and upserts Jobs by matterport_model_id.
// Requires MATTERPORT_CLIENT_ID + MATTERPORT_CLIENT_SECRET (Settings → Environment Variables).
// Admin-only. New models are created under the supplied project_id.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

    const clientId = secrets.get('MATTERPORT_CLIENT_ID');
    const clientSecret = secrets.get('MATTERPORT_CLIENT_SECRET');
    if (!clientId || !clientSecret) {
      return Response.json(
        { error: 'Matterport API credentials not configured. Add MATTERPORT_CLIENT_ID and MATTERPORT_CLIENT_SECRET in Settings → Environment Variables to enable sync.' },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const projectId = body.project_id || null;
    if (!projectId) {
      return Response.json({ error: 'Select a project to sync Matterport models into.' }, { status: 400 });
    }

    // 1. OAuth client-credentials token
    const tokenRes = await fetch('https://api.matterport.com/api/oauth/token?grant_type=client_credentials', {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + btoa(`${clientId}:${clientSecret}`),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    if (!tokenRes.ok) {
      return Response.json({ error: 'Matterport auth failed: ' + (await tokenRes.text()) }, { status: 502 });
    }
    const tokenJson = await tokenRes.json();
    const accessToken = tokenJson.access_token;
    if (!accessToken) return Response.json({ error: 'Matterport did not return an access token.' }, { status: 502 });

    // 2. List models via GraphQL
    const gqlRes = await fetch('https://api.matterport.com/api/v2/graphql', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: 'query { models { results { id name created modified state visibility } } }',
      }),
    });
    if (!gqlRes.ok) {
      return Response.json({ error: 'Matterport query failed: ' + (await gqlRes.text()) }, { status: 502 });
    }
    const gqlJson = await gqlRes.json();
    const models = (gqlJson.data && gqlJson.data.models && gqlJson.data.models.results) || [];

    const stateMap = { active: 'complete', processing: 'scanning', failed: 'scheduled', disabled: 'scheduled' };
    const nowIso = new Date().toISOString();

    const existing = await base44.asServiceRole.entities.Job.list();
    const byModel = {};
    existing.forEach((j) => { if (j.matterport_model_id) byModel[j.matterport_model_id] = j; });

    // Resolve project + client names for newly created jobs
    const project = await base44.asServiceRole.entities.Project.get(projectId).catch(() => null);
    const projectName = project?.name;
    const clientIdField = project?.client_id;
    const clientName = project?.client_name;

    let created = 0, updated = 0;
    for (const m of models.slice(0, 100)) {
      const shareUrl = `https://my.matterport.com/show/?m=${m.id}`;
      const embedUrl = `https://my.matterport.com/show/?m=${m.id}&brand=0&help=0`;
      const mappedStatus = stateMap[m.state] || 'scheduled';
      const existingJob = byModel[m.id];
      if (existingJob) {
        await base44.asServiceRole.entities.Job.update(existingJob.id, {
          matterport_model_id: m.id,
          matterport_share_url: shareUrl,
          matterport_embed_url: embedUrl,
          matterport_synced_at: nowIso,
          status: existingJob.status === 'invoiced' ? 'invoiced' : mappedStatus,
        });
        updated++;
      } else {
        await base44.asServiceRole.entities.Job.create({
          title: m.name || `Matterport ${m.id}`,
          project_id: projectId,
          project_name: projectName,
          client_id: clientIdField,
          client_name: clientName,
          site_address: 'Imported from Matterport',
          status: mappedStatus,
          matterport_model_id: m.id,
          matterport_share_url: shareUrl,
          matterport_embed_url: embedUrl,
          matterport_synced_at: nowIso,
        });
        created++;
      }
    }

    return Response.json({ created, updated, total: models.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}