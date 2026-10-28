// One branded shell for every Arqademy email: navy header with the "N" mark and
// "NEXT CLASS · Powered by Arqademy", white card body, teal button — the same look
// as the student dashboard. Table-based with inline styles because that is what
// Gmail/Outlook/Apple Mail render reliably. Web fonts are NOT loaded (most mail
// clients block them), so the font stacks fall back to system fonts.

export type EmailContent = {
  preheader: string; // the grey preview line shown next to the subject in the inbox
  heading: string;
  paragraphs: string[];
  details?: { label: string; value: string }[];
  callout?: { title: string; lines: { label: string; value: string }[] };
  cta?: { label: string; url: string };
  footnote?: string;
  code?: string; // for OTPs, shown in a monospace font
};

const C = {
  navy: '#0d1b3d',
  teal: '#0E9B94',
  tealSoft: '#eef6f6',
  canvas: '#f4f6f9',
  ink: '#0d1b3d',
  ink2: '#4b5771',
  ink3: '#7c89a3',
  line: '#e3e8f0',
};

const FONT = `'Nunito','Segoe UI',Helvetica,Arial,sans-serif`;
const HEAD_FONT = `'Comfortaa','Nunito','Segoe UI',Helvetica,Arial,sans-serif`;

/** Escapes anything a person typed (names, emails…) before it goes into HTML. */
export function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

export function fmtNaira(amount: number): string {
  return `₦${amount.toLocaleString('en-NG')}`;
}

/** Accepts 'YYYY-MM-DD' (treated as a plain calendar date) or a real Date/timestamp. */
export function fmtDate(value: string | Date): string {
  const isPlainDate = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
  const date = isPlainDate ? new Date(`${value}T00:00:00Z`) : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: isPlainDate ? 'UTC' : 'Africa/Lagos',
  });
}

export function renderEmail(c: EmailContent): { html: string; text: string } {
  const paragraphs = c.paragraphs
    .map((p) => `<p style="margin:0 0 14px;font-size:14px;line-height:1.65;color:${C.ink2};">${esc(p)}</p>`)
    .join('');

  const details = c.details?.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0 8px;border:1px solid ${C.line};border-radius:10px;border-collapse:separate;border-spacing:0;">${c.details
        .map((d, i) => {
          const last = i === c.details!.length - 1;
          const border = last ? '' : `border-bottom:1px solid ${C.line};`;
          return `<tr>
<td style="padding:10px 14px;${border}width:36%;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:${C.ink3};">${esc(d.label)}</td>
<td style="padding:10px 14px;${border}font-size:13.5px;font-weight:700;color:${C.ink};">${esc(d.value)}</td>
</tr>`;
        })
        .join('')}</table>`
    : '';

  const callout = c.callout
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0 8px;background:${C.tealSoft};border-left:4px solid ${C.teal};border-radius:8px;"><tr><td style="padding:14px 16px;">
<div style="font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:${C.teal};margin-bottom:8px;">${esc(c.callout.title)}</div>
${c.callout.lines
  .map(
    (l) =>
      `<div style="font-size:13px;color:${C.ink2};margin:5px 0;">${esc(l.label)}: <span style="font-family:Consolas,Menlo,monospace;font-weight:700;color:${C.ink};">${esc(l.value)}</span></div>`
  )
  .join('')}
</td></tr></table>`
    : '';

  const cta = c.cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0 4px;"><tr><td style="background:${C.teal};border-radius:10px;">
<a href="${esc(c.cta.url)}" style="display:inline-block;padding:13px 26px;font-family:${FONT};font-size:14px;font-weight:700;color:#03211F;text-decoration:none;">${esc(c.cta.label)}</a>
</td></tr></table>`
    : '';

  const footnote = c.footnote
    ? `<p style="margin:18px 0 0;font-size:12px;line-height:1.6;color:${C.ink3};">${esc(c.footnote)}</p>`
    : '';

    const code = c.code
  ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0 8px;"><tr><td align="center" style="padding:18px 12px;background:${C.tealSoft};border:1px dashed ${C.teal};border-radius:10px;font-family:Consolas,Menlo,monospace;font-size:32px;font-weight:700;letter-spacing:.35em;color:${C.ink};">${esc(c.code)}</td></tr></table>`
  : '';

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>${esc(c.heading)}</title>
</head>
<body style="margin:0;padding:0;background:${C.canvas};font-family:${FONT};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${esc(c.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.canvas};padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
  <tr><td style="background:${C.navy};background-image:linear-gradient(135deg,#14294F 0%,#0D1B3D 55%,#070F26 100%);border-radius:14px 14px 0 0;padding:26px 24px 22px;">
    <div style="font-family:${HEAD_FONT};font-size:28px;line-height:1;font-weight:700;letter-spacing:-.02em;color:#ffffff;">AR<span style="color:#12BFB4;">qademy</span></div>
    <div style="margin-top:10px;font-size:10px;font-weight:700;letter-spacing:.32em;text-transform:uppercase;color:#12BFB4;">Powering Next Minds</div>
  </td></tr>
  <tr><td style="height:3px;background:${C.teal};font-size:0;line-height:0;">&nbsp;</td></tr>
  <tr><td style="background:#ffffff;border:1px solid ${C.line};border-top:0;border-radius:0 0 14px 14px;padding:28px 24px;">
    <h1 style="margin:0 0 14px;font-family:${HEAD_FONT};font-size:21px;line-height:1.3;font-weight:700;color:${C.ink};">${esc(c.heading)}</h1>
    ${code}${paragraphs}${details}${callout}${cta}${footnote}
  </td></tr>
  <tr><td style="padding:16px 8px;text-align:center;font-size:11px;line-height:1.6;color:${C.ink3};">
    Arqademy &middot; Next Class<br>This is an automated message &mdash; please don&rsquo;t reply to it.
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

  const textLines: string[] = [c.heading, '', ...c.paragraphs, ''];
  if (c.details?.length) textLines.push(...c.details.map((d) => `${d.label}: ${d.value}`), '');
  if (c.callout) textLines.push(c.callout.title, ...c.callout.lines.map((l) => `${l.label}: ${l.value}`), '');
  if (c.cta) textLines.push(`${c.cta.label}: ${c.cta.url}`, '');
  if (c.footnote) textLines.push(c.footnote, '');
  textLines.push('—', 'Arqademy · Next Class');

  return { html, text: textLines.join('\n') };
}