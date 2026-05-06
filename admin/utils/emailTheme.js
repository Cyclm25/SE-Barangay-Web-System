function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderLines(lines = []) {
  return lines
    .map((line) => `<p style="margin:0 0 10px; font-size:14px; line-height:1.6; color:#374151;">${escapeHtml(line)}</p>`)
    .join("");
}

function renderKeyValues(items = []) {
  if (!items.length) return "";
  const rows = items
    .map(
      ({ label, value }) => `
        <tr>
          <td style="padding:6px 0; width:170px; font-size:13px; color:#6b7280;"><strong>${escapeHtml(label)}:</strong></td>
          <td style="padding:6px 0; font-size:13px; color:#111827;">${escapeHtml(value)}</td>
        </tr>
      `
    )
    .join("");
  return `<table style="width:100%; border-collapse:collapse; margin:6px 0 14px;">${rows}</table>`;
}

function buildThemedEmail({ title, subtitle, lines = [], keyValues = [], notice = "" }) {
  const safeTitle = escapeHtml(title || "Barangay 160 Notification");
  const safeSubtitle = escapeHtml(subtitle || "Barangay 160");
  const safeNotice = notice ? `<p style="margin:14px 0 0; font-size:12px; color:#6b7280;">${escapeHtml(notice)}</p>` : "";

  return `
  <div style="margin:0; padding:24px; background:#f3f6fb; font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:640px; margin:0 auto; background:#ffffff; border:1px solid #dbe4f0; border-radius:14px; overflow:hidden;">
      <div style="background:linear-gradient(135deg,#2957a1,#1e3f7a); padding:18px 22px;">
        <h2 style="margin:0; color:#ffffff; font-size:20px;">${safeTitle}</h2>
        <p style="margin:5px 0 0; color:#dbe7ff; font-size:12px;">${safeSubtitle}</p>
      </div>
      <div style="padding:22px;">
        ${renderKeyValues(keyValues)}
        ${renderLines(lines)}
        ${safeNotice}
      </div>
      <div style="padding:14px 22px; background:#f8fafc; border-top:1px solid #e5e7eb;">
        <p style="margin:0; font-size:11px; color:#9ca3af;">This message was sent by Barangay 160 System.</p>
      </div>
    </div>
  </div>`;
}

module.exports = { buildThemedEmail };

