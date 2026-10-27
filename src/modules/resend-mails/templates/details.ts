import { fmtDate, fmtNaira, titleCase } from './email-layout.js';
import type { PaymentSuccessData, PlanAssignedData } from '../types.js';

type Row = { label: string; value: string };

// Rows are only added when the value exists, so older class-based plans
// (no weeks / quiz day / quiz size) still produce a clean email.
export function planDetailRows(d: PlanAssignedData): Row[] {
  const rows: Row[] = [];
  if (d.programmeTitle) rows.push({ label: 'Programme', value: d.programmeTitle });
  rows.push({ label: 'Starts', value: fmtDate(d.startDate) });
  if (d.endDate) rows.push({ label: 'Ends', value: fmtDate(d.endDate) });
  if (d.weeks) rows.push({ label: 'Duration', value: `${d.weeks} week${d.weeks === 1 ? '' : 's'}` });
  rows.push({ label: 'Topics', value: String(d.topicCount) });

  if (d.quizDay && d.quizSize) {
    const parts = [titleCase(d.quizDay), `${d.quizSize} questions`];
    if (d.quizDurationMinutes) parts.push(`${d.quizDurationMinutes} min`);
    rows.push({ label: 'Weekly quiz', value: parts.join(' · ') });
  }

  if (d.amountDueNaira != null) rows.push({ label: 'Amount due', value: fmtNaira(d.amountDueNaira) });
  return rows;
}

export function paymentDetailRows(d: PaymentSuccessData): Row[] {
  const rows: Row[] = [{ label: 'Amount paid', value: fmtNaira(d.amountNaira) }];
  if (d.programmeTitle) rows.push({ label: 'Programme', value: d.programmeTitle });
  rows.push({ label: 'Reference', value: d.reference });
  if (d.paidAt) rows.push({ label: 'Paid on', value: fmtDate(d.paidAt) });
  if (d.startDate) rows.push({ label: 'Plan starts', value: fmtDate(d.startDate) });
  return rows;
}