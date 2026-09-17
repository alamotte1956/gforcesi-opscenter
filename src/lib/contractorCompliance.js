// Shared contractor compliance / document-expiry logic used by Compliance and Contractors pages.

const DOC_FIELDS = [
  { key: "w9", uri: "w9_document_uri", label: "W-9", expiry: null },
  { key: "coi", uri: "coi_document_uri", label: "General Liability COI", expiry: "coi_expiry" },
  { key: "mn_ic", uri: "mn_ic_exemption_document_uri", label: "MN IC Exemption Cert.", expiry: "mn_ic_exemption_expiry" },
  { key: "wc", uri: "workers_comp_document_uri", label: "Workers' Comp", expiry: "workers_comp_expiry" },
];

export function docExpiryStatus(dateStr) {
  if (!dateStr) return { state: "missing", label: "No expiry", days: null };
  const exp = new Date(dateStr + "T23:59:59");
  const today = new Date(new Date().toDateString());
  const days = Math.round((exp - today) / 86400000);
  if (days < 0) return { state: "expired", label: `Expired ${new Date(dateStr).toLocaleDateString()}`, days };
  if (days <= 30) return { state: "expiring", label: `Expires in ${days}d`, days };
  return { state: "valid", label: `Valid until ${new Date(dateStr).toLocaleDateString()}`, days };
}

export function contractorCompliance(c) {
  const docs = DOC_FIELDS.map((d) => {
    const uploaded = !!c[d.uri];
    const exp = d.expiry ? docExpiryStatus(c[d.expiry]) : null;
    const expired = d.expiry ? !!(exp && exp.state === "expired") : false;
    return { ...d, uploaded, exp, expired, complete: uploaded && !expired };
  });
  const allDocsComplete = docs.every((d) => d.complete);
  const allSigned = !!(c.w9_on_file && c.contract_signed && c.mn_ic_exemption_on_file && c.workers_comp_on_file && c.insurance_on_file && c.esign_consent);
  const canReceiveOffers = allDocsComplete && allSigned;
  const expiringSoon = docs.filter((d) => d.exp && d.exp.state === "expiring");
  const expiredDocs = docs.filter((d) => d.expired);
  return { docs, allDocsComplete, allSigned, canReceiveOffers, expiringSoon, expiredDocs };
}