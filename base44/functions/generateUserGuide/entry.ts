import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { jsPDF } from 'npm:jspdf@4.0.0';

const guides = {
  admin: {
    title: 'Administrator Guide',
    intro: 'GForceSI OpsCenter is your integrated field operations and intelligence dashboard for 3D digital twin projects. As an administrator you have access to every area of the platform. This guide explains each area and what you can do there.',
    sections: [
      { name: 'Live Map (Dashboard)', body: 'A real-time map of your field crews and active jobs. Filter crews by status, click any crew or job for details, and see who is on duty, en route, or on site at a glance.' },
      { name: 'Jobs', body: 'An Excel-style grid of every job. Search and filter, then inline-edit status and priority. Client site opening/closing hours appear with warnings when a job is scheduled outside them. Open any job for a full detail page with deliverables, notes, Matterport 3D model, and an admin-only Work Quality Review with a high-resolution photo lightbox.' },
      { name: 'Route Planning', body: 'Plan daily routes with drag-and-drop job assignment. Toggle the Auto Route Plan to auto-assign every job to the nearest available crew and optimize stop order, or assign manually. View live ETAs and total drive distance per crew.' },
      { name: 'Projects', body: 'Project cards summarizing status and job-completion progress. Group related jobs under a project for each client, and link a Matterport 3D model to the project.' },
      { name: 'Contractors', body: 'Your contractor roster with role, live status, onboarding stage, skills, pay structure, and QuickBooks vendor ID. Change roles inline.' },
      { name: 'Contractor Onboarding', body: 'A multi-step wizard to onboard new contractors — profile, skills, pay, and mandatory legal disclosures with electronic signature.' },
      { name: 'Clients', body: 'Client cards with billing terms, QuickBooks customer ID, portal access level, site opening/closing hours, and outstanding invoice balances.' },
      { name: 'Invoices', body: 'Invoice list with QuickBooks sync status and financial summaries. Track draft, sent, synced, paid, and overdue invoices.' },
      { name: 'Expenses', body: 'Record and approve project expenses by category, link them to jobs, and sync approved expenses to QuickBooks.' },
      { name: 'Equipment', body: 'Asset tracking for scanners, drones, cameras, tablets, and vehicles. See checkout status, assigned contractor, and maintenance and calibration due dates.' },
      { name: 'Daily Reports', body: 'Field-submitted daily work reports with weather, hours, crew count, delays, and photos. Review and mark reports as reviewed.' },
      { name: 'Issues', body: 'Log and track on-site issues by severity and status, assign owners, attach photos, and follow through to resolution.' },
      { name: 'Inspections', body: 'QA inspections with checklists tied to jobs. Mark each checklist item pass or fail and track overall inspection status.' },
      { name: 'Analytics', body: 'Operations and financial KPIs — jobs completed, invoiced, collected, and crews on duty — plus a jobs-by-status chart and a Stage Duration tab that shows average time spent in each workflow stage and flags your bottleneck.' },
      { name: 'Integrations', body: 'Connect the services OpsCenter uses. Each admin connects their own Google account for Google Sheets; QuickBooks shows shared connection status. Google Calendar requires a connector to be registered first.' },
      { name: 'Matterport', body: 'Central management of Matterport 3D models — link or embed models on jobs and projects, and sync models to jobs automatically.' },
      { name: 'QuickBooks Settings', body: 'Manage the QuickBooks Online OAuth connection, choose automatic or manual sync, and review the sync log for invoices, payroll, customers, and contractors.' },
      { name: 'Compliance Center', body: 'Track federal and Minnesota legal requirements — contractor classification (W-9, IC exemption, workers comp, liability COI, e-sign), data privacy, and breach notification obligations.' },
      { name: 'User Management', body: 'Assign admin or user roles to app users and invite new users to the platform.' },
      { name: 'Data Import', body: 'Bulk-import clients, projects, or job sites from a Google Sheet link or an uploaded Excel file, with downloadable Excel and CSV templates for each entity and a column-mapping preview before import.' },
      { name: 'Messages', body: 'In-app team messaging with optional email delivery to other team members.' },
      { name: 'Client Portal', body: 'A client-facing view where clients see their work orders, projects, and invoices in real time. Admins can preview any client portal.' },
      { name: 'Field App', body: 'The mobile app for field crews — status, assigned jobs, navigation, job status advancement, daily reports, and messages. Admins can preview as any crew member.' },
      { name: 'AI Advisor', body: 'A floating button on every page that gives real-time, data-driven advice tailored to the page you are viewing.' },
    ],
  },
  dispatcher: {
    title: 'Dispatcher Guide',
    intro: 'As a dispatcher you coordinate field crews and daily routes. This guide covers the areas of GForceSI OpsCenter relevant to your role.',
    sections: [
      { name: 'Live Map (Dashboard)', body: 'See where every crew member is in real time, filter by status, and click a crew or job for details including ETA and current job.' },
      { name: 'Jobs', body: 'View and update the status and priority of every job. Watch for site-access-hour warnings so crews arrive when sites are open.' },
      { name: 'Route Planning', body: 'Your core tool. Drag jobs onto crews, or toggle Auto Route Plan to auto-assign every job to the nearest available crew and optimize stop order. Use Optimize all to re-sequence every crew route for minimum drive time.' },
      { name: 'Contractors', body: 'Check crew availability, status, and current job before assigning work.' },
      { name: 'Messages', body: 'Coordinate with crews and the back office in real time, with optional email delivery.' },
      { name: 'Field App', body: 'Preview the mobile experience your crews see — status, jobs, navigation, and messaging.' },
      { name: 'Daily Reports', body: 'Review daily work reports submitted by crews — weather, hours, delays, and photos — and mark them reviewed.' },
      { name: 'Issues', body: 'Track on-site issues crews report, assign owners, and monitor resolution.' },
      { name: 'Inspections', body: 'Schedule and review QA inspections with pass/fail checklists tied to jobs.' },
      { name: 'AI Advisor', body: 'Tap the sparkle button on any page for real-time suggestions on routing, assignments, and risks.' },
    ],
  },
  billing: {
    title: 'Billing Manager Guide',
    intro: 'As a billing manager you handle invoicing, clients, and QuickBooks sync. This guide covers the areas of GForceSI OpsCenter relevant to your role.',
    sections: [
      { name: 'Invoices', body: 'Create and track invoices through draft, sent, synced, paid, and overdue. Monitor QuickBooks sync status and outstanding totals.' },
      { name: 'Expenses', body: 'Record and approve project expenses by category, link them to jobs, and sync approved expenses to QuickBooks.' },
      { name: 'Clients', body: 'Manage client billing terms, QuickBooks customer ID, portal access, and outstanding balances.' },
      { name: 'QuickBooks Settings', body: 'Manage the QuickBooks Online connection, sync mode, and review the sync log for invoices, payments, customers, and contractors.' },
      { name: 'Analytics', body: 'Track financial KPIs — invoiced and collected amounts — and jobs-by-status.' },
      { name: 'Jobs', body: 'View job billable rates and status to know what is ready to invoice.' },
      { name: 'Messages', body: 'Communicate with the team about billing questions, with optional email delivery.' },
      { name: 'AI Advisor', body: 'Tap the sparkle button on any page for real-time advice on outstanding invoices and collections.' },
    ],
  },
  field: {
    title: 'Field Crew Guide',
    intro: 'The Field App is your mobile tool for the day. This guide explains everything you can do from your phone in GForceSI OpsCenter.',
    sections: [
      { name: 'Getting Started', body: 'Log in with the email linked to your contractor profile. If your account is not linked, contact your dispatcher.' },
      { name: 'Your Status', body: 'Set your availability: Available, En Route, On Site, or Off Duty. Dispatchers see this in real time on the live map.' },
      { name: 'Assigned Jobs', body: 'View the jobs assigned to you, with site address, project, scheduled time, and the client site opening and closing hours.' },
      { name: 'Navigation', body: 'Tap Navigate on any job to open turn-by-turn directions in Google Maps.' },
      { name: 'Advancing Job Status', body: 'Move each job forward through En Route, On Site, Scanning, Processing, and Complete with one tap so the office and client always know where things stand.' },
      { name: 'Daily Reports', body: 'Submit a daily work report — weather, hours worked, crew count, delays, and photos — straight from the job site.' },
      { name: 'Report an Issue', body: 'Log an on-site issue with severity and a photo so the back office can respond quickly.' },
      { name: 'Matterport Scan Capture', body: 'Capture or link a Matterport 3D scan for your job so the model is tied to the work order.' },
      { name: 'Messages', body: 'Chat with your dispatcher and team. Send a message in-app or also deliver it by email.' },
      { name: 'AI Advisor', body: 'Tap the sparkle button for real-time advice on your jobs and next steps.' },
    ],
  },
  client: {
    title: 'Client Portal Guide',
    intro: 'The Client Portal gives you a real-time view of your work orders, projects, and invoices with GForceSI. This guide explains what you can see and do.',
    sections: [
      { name: 'Getting Started', body: 'Log in with the email GForceSI linked to your portal account. If access is pending, contact GForceSI to enable it.' },
      { name: 'Work Orders', body: 'Every work order shows its site, schedule, assigned crew, and deliverables, with a 7-stage progress timeline from Scheduled to Invoiced.' },
      { name: 'Projects', body: 'View your projects with status and how many of their work orders are completed.' },
      { name: '3D Models', body: 'Open linked Matterport 3D digital twin models for your projects and work orders.' },
      { name: 'Invoices', body: 'See your invoices with issue and due dates, status, and totals.' },
      { name: 'AI Advisor', body: 'Tap the sparkle button for real-time insights on your projects and work orders.' },
    ],
  },
  user: {
    title: 'User Guide',
    intro: 'GForceSI OpsCenter is an integrated field operations and intelligence dashboard for 3D digital twin projects. This guide explains the main areas of the application.',
    sections: [
      { name: 'Dashboard', body: 'A real-time map and overview of field crews and jobs.' },
      { name: 'Jobs', body: 'Track and update jobs through their lifecycle.' },
      { name: 'Route Planning', body: 'Assign and optimize daily routes for field crews.' },
      { name: 'Projects, Contractors & Clients', body: 'Manage the projects, crews, and clients you work with.' },
      { name: 'Invoices & Equipment', body: 'Track billing and equipment assignments.' },
      { name: 'Integrations', body: 'Connect the services OpsCenter uses, such as Google Sheets and QuickBooks.' },
      { name: 'Matterport', body: 'Manage Matterport 3D digital twin models across jobs and projects.' },
      { name: 'AI Advisor', body: 'Tap the sparkle button on any page for real-time advice.' },
    ],
  },
};

function deriveType(user, contractor, client) {
  if (user.role === 'admin') return 'admin';
  if (contractor) {
    const field = ['Field Technician', 'Field Pilot'];
    if (field.includes(contractor.role)) return 'field';
    if (contractor.role === 'Dispatcher') return 'dispatcher';
    if (contractor.role === 'Billing Manager') return 'billing';
    return 'admin';
  }
  if (client) return 'client';
  return 'user';
}

function buildPdf(guide) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 48;
  const maxW = pageW - margin * 2;
  doc.setFillColor(6, 182, 212);
  doc.rect(0, 0, pageW, 72, 'F');
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(20);
  doc.text('GForceSI OpsCenter', margin, 44);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(11);
  doc.text(guide.title, margin, 62);
  let y = 104;
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(11);
  doc.splitTextToSize(guide.intro, maxW).forEach((l) => {
    if (y > pageH - margin) { doc.addPage(); y = margin; }
    doc.text(l, margin, y); y += 16;
  });
  y += 10;
  guide.sections.forEach((s) => {
    if (y > pageH - margin - 50) { doc.addPage(); y = margin; }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(13);
    doc.setTextColor(8, 145, 178);
    doc.text(s.name, margin, y); y += 18;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10.5);
    doc.setTextColor(51, 65, 85);
    doc.splitTextToSize(s.body, maxW).forEach((l) => {
      if (y > pageH - margin) { doc.addPage(); y = margin; }
      doc.text(l, margin, y); y += 14;
    });
    y += 10;
  });
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(9); doc.setTextColor(148, 163, 184);
    doc.text('GForceSI OpsCenter · User Guide', margin, pageH - 20);
    doc.text(`Page ${i} of ${pages}`, pageW - margin, pageH - 20, { align: 'right' });
  }
  return doc;
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    let type = body?.type;
    if (!type) {
      const cons = await base44.entities.Contractor.filter({ email: user.email }).catch(() => []);
      const cls = await base44.entities.Client.filter({ portal_email: user.email }).catch(() => []);
      type = deriveType(user, cons[0], cls[0]);
    }
    const guide = guides[type] || guides.user;
    const doc = buildPdf(guide);
    const u8 = new Uint8Array(doc.output('arraybuffer'));
    let bin = '';
    const chunk = 0x8000;
    for (let i = 0; i < u8.length; i += chunk) bin += String.fromCharCode.apply(null, u8.subarray(i, i + chunk));
    return Response.json({ pdf: btoa(bin), filename: `GForceSI-${type}-guide.pdf` });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}