// Matterport helpers shared across Job detail, Field app, Client portal, and sync UI.

export function parseMatterportUrl(input) {
  if (!input) return null;
  const s = String(input).trim();
  if (!s) return null;

  // Bare model id (Matterport ids are alphanumeric, no slashes)
  if (/^[A-Za-z0-9_-]+$/.test(s) && !s.includes(".") && s.length < 64) {
    return buildFromId(s);
  }

  try {
    const url = new URL(s.includes("://") ? s : `https://${s}`);
    const m = url.searchParams.get("m");
    if (m) return buildFromId(m);
    // path-style: /show/abc123
    const seg = url.pathname.split("/").filter(Boolean).pop();
    if (seg && /^[A-Za-z0-9_-]+$/.test(seg)) return buildFromId(seg);
  } catch {
    // not a URL
  }
  return null;
}

function buildFromId(id) {
  return {
    modelId: id,
    shareUrl: `https://my.matterport.com/show/?m=${id}`,
    embedUrl: `https://my.matterport.com/show/?m=${id}&brand=0&help=0`,
  };
}