import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const jobId = body.job_id;
    const photoUrl = body.photo_url;
    if (!jobId || !photoUrl || typeof photoUrl !== 'string') {
      return Response.json({ error: 'Invalid input' }, { status: 400 });
    }

    const job = await base44.asServiceRole.entities.Job.get(jobId);
    if (!job) return Response.json({ error: 'Job not found' }, { status: 404 });

    let allowed = user.role === 'admin';
    if (!allowed) {
      const cons = await base44.asServiceRole.entities.Contractor.filter({ email: user.email });
      const myId = cons[0]?.id;
      if (myId && (job.assigned_contractor_ids || []).includes(myId)) allowed = true;
    }
    if (!allowed) return Response.json({ error: 'Not assigned to this job' }, { status: 403 });

    const entry = {
      url: photoUrl,
      uploaded_by_name: body.uploaded_by_name || user.full_name || user.email,
      uploaded_at: new Date().toISOString(),
    };
    await base44.asServiceRole.entities.Job.updateMany({ id: jobId }, { $push: { photos: entry } });
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}