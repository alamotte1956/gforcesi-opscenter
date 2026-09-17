import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';
import { qbQuery, pick, toArray, enumVal, build } from '../../shared/quickbase.ts';

const JOB_STATUS = ['scheduled', 'en_route', 'on_site', 'scanning', 'processing', 'complete', 'invoiced'];
const PRIORITY = ['low', 'medium', 'high', 'urgent'];
const ROLE = ['Field Technician', 'Field Pilot', 'Dispatcher', 'Billing Manager', 'Admin'];
const PAY_TYPE = ['hourly', 'flat', 'salary'];
const BILLABLE_RATE_TYPE = ['hourly', 'per_sqft', 'flat', 'daily'];
const PROJECT_STATUS = ['active', 'on_hold', 'completed'];
const CLIENT_TERMS = ['Net 15', 'Net 30', 'Net 45', 'Due on Receipt'];

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });
    const realm = secrets.get('QUICKBASE_REALM');
    const token = secrets.get('QUICKBASE_USER_TOKEN');
    if (!realm || !token) return Response.json({ error: 'Quickbase not configured. Set QUICKBASE_REALM and QUICKBASE_USER_TOKEN in Secrets.' }, { status: 400 });
    const body = await req.json().catch(() => ({}));
    const targets = body.targets || ['client', 'project', 'contractor', 'job'];
    const sv = base44.asServiceRole.entities;
    const results = {};

    // Clients first (jobs/projects link to them by name)
    let clients = await sv.Client.list();
    let clientByName = Object.fromEntries(clients.map((c) => [c.name, c]));
    if (targets.includes('client')) {
      const tid = secrets.get('QUICKBASE_CLIENT_TABLE_ID');
      if (!tid) results.client = { error: 'QUICKBASE_CLIENT_TABLE_ID not set' };
      else {
        try {
          const recs = await qbQuery(realm, token, tid);
          let created = 0, updated = 0, errors = 0, err = '';
          for (const r of recs) {
            const name = pick(r, 'Name', 'Client Name', 'Client');
            if (!name) { errors++; err = 'Missing Name'; continue; }
            const payload = build({
              name,
              company: pick(r, 'Company'),
              billing_contact_name: pick(r, 'Billing Contact', 'Contact Name', 'Contact'),
              billing_email: pick(r, 'Billing Email', 'Email'),
              billing_phone: pick(r, 'Billing Phone', 'Phone'),
              billing_address: pick(r, 'Billing Address', 'Address'),
              terms: enumVal(pick(r, 'Terms'), CLIENT_TERMS),
              portal_email: pick(r, 'Portal Email'),
              notes: pick(r, 'Notes'),
              quickbase_id: r._rid != null ? String(r._rid) : undefined,
            });
            const found = clients.find((c) => (r._rid != null && c.quickbase_id === String(r._rid)) || c.name === name);
            try {
              if (found) { await sv.Client.update(found.id, payload); updated++; }
              else { const c = await sv.Client.create(payload); clients.push(c); clientByName[c.name] = c; created++; }
            } catch (e) { errors++; err = e.message; }
          }
          results.client = { pulled: recs.length, created, updated, errors, error: err || undefined };
        } catch (e) { results.client = { error: e.message }; }
      }
    }

    // Projects (link to client by name)
    let projects = await sv.Project.list();
    let projectByName = Object.fromEntries(projects.map((p) => [p.name, p]));
    if (targets.includes('project')) {
      const tid = secrets.get('QUICKBASE_PROJECT_TABLE_ID');
      if (!tid) results.project = { error: 'QUICKBASE_PROJECT_TABLE_ID not set' };
      else {
        try {
          const recs = await qbQuery(realm, token, tid);
          let created = 0, updated = 0, errors = 0, err = '';
          for (const r of recs) {
            const name = pick(r, 'Name', 'Project Name', 'Project');
            if (!name) { errors++; err = 'Missing Name'; continue; }
            const clientName = pick(r, 'Client', 'Client Name');
            const client = clientName ? clientByName[clientName] : null;
            const payload = build({
              name,
              client_id: client ? client.id : undefined,
              client_name: clientName,
              description: pick(r, 'Description'),
              status: enumVal(pick(r, 'Status'), PROJECT_STATUS),
              region: pick(r, 'Region'),
              start_date: pick(r, 'Start Date'),
              end_date: pick(r, 'End Date'),
              notes: pick(r, 'Notes'),
              quickbase_id: r._rid != null ? String(r._rid) : undefined,
            });
            const found = projects.find((p) => (r._rid != null && p.quickbase_id === String(r._rid)) || p.name === name);
            try {
              if (found) { await sv.Project.update(found.id, payload); updated++; }
              else { const p = await sv.Project.create(payload); projects.push(p); projectByName[p.name] = p; created++; }
            } catch (e) { errors++; err = e.message; }
          }
          results.project = { pulled: recs.length, created, updated, errors, error: err || undefined };
        } catch (e) { results.project = { error: e.message }; }
      }
    }

    // Contractors
    if (targets.includes('contractor')) {
      const tid = secrets.get('QUICKBASE_CONTRACTOR_TABLE_ID');
      if (!tid) results.contractor = { error: 'QUICKBASE_CONTRACTOR_TABLE_ID not set' };
      else {
        try {
          const recs = await qbQuery(realm, token, tid);
          const existing = await sv.Contractor.list();
          let created = 0, updated = 0, errors = 0, err = '';
          for (const r of recs) {
            const name = pick(r, 'Name', 'Contractor Name', 'Contractor');
            if (!name) { errors++; err = 'Missing Name'; continue; }
            const email = pick(r, 'Email');
            const payload = build({
              name,
              email,
              phone: pick(r, 'Phone', 'Mobile'),
              role: enumVal(pick(r, 'Role'), ROLE),
              region: pick(r, 'Region'),
              pay_type: enumVal(pick(r, 'Pay Type'), PAY_TYPE),
              pay_rate: pick(r, 'Pay Rate', 'Rate'),
              skills: toArray(pick(r, 'Skills')),
              certifications: toArray(pick(r, 'Certifications', 'Certs')),
              base_address: pick(r, 'Base Address', 'Address'),
              quickbase_id: r._rid != null ? String(r._rid) : undefined,
            });
            const found = existing.find((c) => (r._rid != null && c.quickbase_id === String(r._rid)) || (email && c.email === email) || c.name === name);
            try {
              if (found) { await sv.Contractor.update(found.id, payload); updated++; }
              else { await sv.Contractor.create(payload); created++; }
            } catch (e) { errors++; err = e.message; }
          }
          results.contractor = { pulled: recs.length, created, updated, errors, error: err || undefined };
        } catch (e) { results.contractor = { error: e.message }; }
      }
    }

    // Jobs (link to project + client by name)
    if (targets.includes('job')) {
      const tid = secrets.get('QUICKBASE_JOB_TABLE_ID');
      if (!tid) results.job = { error: 'QUICKBASE_JOB_TABLE_ID not set' };
      else {
        try {
          const recs = await qbQuery(realm, token, tid);
          const existing = await sv.Job.list();
          let created = 0, updated = 0, errors = 0, err = '';
          for (const r of recs) {
            const title = pick(r, 'Title', 'Job Title', 'Job Name', 'Name');
            if (!title) { errors++; err = 'Missing Title'; continue; }
            const projectName = pick(r, 'Project', 'Project Name');
            const clientName = pick(r, 'Client', 'Client Name');
            const project = projectName ? projectByName[projectName] : null;
            const client = clientName ? clientByName[clientName] : null;
            const siteAddress = pick(r, 'Site Address', 'Site', 'Address');
            const payload = build({
              title,
              project_id: project ? project.id : undefined,
              project_name: projectName,
              client_id: client ? client.id : undefined,
              client_name: clientName,
              site_address: siteAddress,
              latitude: pick(r, 'Latitude'),
              longitude: pick(r, 'Longitude'),
              status: enumVal(pick(r, 'Status'), JOB_STATUS),
              priority: enumVal(pick(r, 'Priority'), PRIORITY),
              scheduled_start: pick(r, 'Scheduled Start', 'Start Date', 'Start'),
              scheduled_end: pick(r, 'Scheduled End', 'End Date', 'End'),
              estimated_duration_hours: pick(r, 'Estimated Duration Hours', 'Duration Hours', 'Duration'),
              billable_rate_type: enumVal(pick(r, 'Billable Rate Type', 'Rate Type'), BILLABLE_RATE_TYPE),
              billable_rate: pick(r, 'Billable Rate', 'Rate'),
              notes: pick(r, 'Notes'),
              quickbase_id: r._rid != null ? String(r._rid) : undefined,
            });
            if (!payload.project_id || !payload.site_address) { errors++; err = 'Missing linked project or site address'; continue; }
            const found = existing.find((j) => (r._rid != null && j.quickbase_id === String(r._rid)) || (j.title === title && j.site_address === siteAddress));
            try {
              if (found) { await sv.Job.update(found.id, payload); updated++; }
              else { await sv.Job.create(payload); created++; }
            } catch (e) { errors++; err = e.message; }
          }
          results.job = { pulled: recs.length, created, updated, errors, error: err || undefined };
        } catch (e) { results.job = { error: e.message }; }
      }
    }

    return Response.json({ ok: true, results });
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }); }
}