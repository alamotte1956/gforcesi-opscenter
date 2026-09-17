import { createClientFromRequest } from 'npm:@base44/sdk@0.8.48';

// Creates a Deliverable (3D model bundle) from a job's linked Matterport model,
// flowing it into the QA pipeline and client portal. Idempotent per job.
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

    const existing = await base44.asServiceRole.entities.Deliverable.filter({ job_id: job.id, deliverable_type: '3d_model' });
    if (existing && existing.length) return Response.json({ ok: true, deliverable_id: existing[0].id, created: false });

    const shareUrl = job.matterport_share_url || `https://my.matterport.com/show/?m=${job.matterport_model_id}`;
    const embedUrl = job.matterport_embed_url || `https://my.matterport.com/show/?m=${job.matterport_model_id}&brand=0&help=0`;
    const assetBundle = [
      '3D model (Matterport showcase)',
      'Dollhouse view',
      'Floorplans (2D)',
      'Measurements (Matterport measurement mode)',
      '360° panoramas',
      'Point cloud / OBJ export (on request)',
    ].join('\n');

    const created = await base44.asServiceRole.entities.Deliverable.create({
      job_id: job.id,
      job_title: job.title,
      project_id: job.project_id,
      project_name: job.project_name,
      client_id: job.client_id,
      client_name: job.client_name,
      site_address: job.site_address,
      deliverable_type: '3d_model',
      matterport_model_id: job.matterport_model_id,
      share_url: shareUrl,
      embed_url: embedUrl,
      download_url: '',
      status: 'processing',
      qa_status: 'pending',
      notes: `Auto-generated from Matterport model ${job.matterport_model_id}.\n\nAsset bundle:\n${assetBundle}`,
    });
    return Response.json({ ok: true, deliverable_id: created.id, created: true });
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }); }
}