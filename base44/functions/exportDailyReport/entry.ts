import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { jsPDF } from 'npm:jspdf@4.0.0';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const reportId = body?.report_id;
    if (!reportId) return Response.json({ error: 'report_id is required' }, { status: 400 });

    const report = await base44.asServiceRole.entities.DailyReport.get(reportId);
    if (!report) return Response.json({ error: 'Report not found' }, { status: 404 });

    // Enrich with job + project + client context if available
    let job = null;
    let project = null;
    let client = null;
    if (report.job_id) {
      job = await base44.asServiceRole.entities.Job.get(report.job_id).catch(() => null);
    }
    if (job?.project_id) {
      project = await base44.asServiceRole.entities.Project.get(job.project_id).catch(() => null);
    }
    if (job?.client_id || project?.client_id) {
      const cid = job?.client_id || project?.client_id;
      client = await base44.asServiceRole.entities.Client.get(cid).catch(() => null);
    }

    const doc = buildPdf(report, job, project, client);
    const pdfBytes = doc.output('arraybuffer');
    const filename = `DailyReport-${report.report_date}-${(report.job_title || 'site').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

function buildPdf(report, job, project, client) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 48;
  const maxW = pageW - margin * 2;
  let y = 0;

  // --- Header band ---
  doc.setFillColor(6, 182, 212);
  doc.rect(0, 0, pageW, 80, 'F');
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('GForceSI', margin, 42);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text('Daily Site Report', margin, 62);
  doc.setFontSize(10);
  doc.text(report.report_date || '', pageW - margin, 42, { align: 'right' });

  y = 110;

  // --- Title block ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text(report.job_title || 'Daily Site Report', margin, y);
  y += 6;

  // --- Meta info box ---
  y += 14;
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, maxW, 88, 6, 6, 'FD');
  const metaX = margin + 16;
  const metaW = maxW / 2 - 16;
  let metaY = y + 22;

  const metaRows = [
    ['Project', project?.name || '—'],
    ['Client', client?.name || job?.client_name || '—'],
    ['Site Address', job?.site_address || '—'],
    ['Filed By', report.filed_by_name || '—'],
    ['Weather', report.weather || '—'],
    ['Status', (report.status || '').replace('_', ' ')],
  ];

  metaRows.forEach((row, i) => {
    const col = i % 2;
    const rowY = metaY + Math.floor(i / 2) * 22;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(row[0].toUpperCase(), metaX + col * metaW, rowY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(String(row[1]), metaX + col * metaW, rowY + 13);
  });
  y += 88 + 20;

  // --- Key metrics row ---
  const metrics = [
    { label: 'Hours Worked', value: String(report.hours_worked || 0) },
    { label: 'Crew Count', value: String(report.crew_count || 0) },
    { label: 'Report Date', value: report.report_date || '—' },
  ];
  const cardW = (maxW - 16) / 3;
  metrics.forEach((m, i) => {
    const x = margin + i * (cardW + 8);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(x, y, cardW, 52, 5, 5, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(m.label.toUpperCase(), x + 12, y + 18);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(6, 182, 212);
    doc.text(m.value, x + 12, y + 40);
  });
  y += 52 + 24;

  // --- Section helper ---
  const section = (title, content) => {
    if (!content) return;
    if (y > pageH - margin - 60) { doc.addPage(); y = margin; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(8, 145, 178);
    doc.text(title, margin, y);
    y += 6;
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y, margin + maxW, y);
    y += 14;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10.5);
    doc.setTextColor(51, 65, 85);
    const lines = doc.splitTextToSize(content, maxW);
    lines.forEach((l) => {
      if (y > pageH - margin) { doc.addPage(); y = margin; }
      doc.text(l, margin, y);
      y += 15;
    });
    y += 14;
  };

  section('Work Completed', report.work_completed);
  section('Delays / Issues', report.delays);
  section('Notes', report.notes);

  // --- Footer on every page ---
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('GForceSI OpsCenter · Daily Site Report', margin, pageH - 24);
    doc.text(`Page ${i} of ${pages}`, pageW - margin, pageH - 24, { align: 'right' });
  }

  return doc;
}