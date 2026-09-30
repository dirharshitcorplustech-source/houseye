/**
 * HOUSEYE.COM — Simple bill PDF (text-based, no heavy deps)
 * Returns application/pdf via minimal PDF generator.
 */

import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/get-session';
import { connectDB } from '@/lib/db/connect';
import { Bill } from '@/models';
import { isOwner, isSuperAdmin, hasPropertyScope } from '@/services/authorization';
import { Errors } from '@/lib/utils/response';

/** Minimal single-page PDF from plain text lines */
function textToPdf(lines: string[]): Uint8Array {
  const escape = (s: string) =>
    s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

  const contentLines: string[] = ['BT', '/F1 11 Tf', '50 780 Td', '14 TL'];
  lines.forEach((line, i) => {
    if (i === 0) contentLines.push(`(${escape(line)}) Tj`);
    else contentLines.push(`T* (${escape(line)}) Tj`);
  });
  contentLines.push('ET');
  const stream = contentLines.join('\n');

  const objects: string[] = [];
  objects.push('1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj');
  objects.push('2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj');
  objects.push(
    '3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources<< /Font<< /F1 5 0 R >> >> >>endobj'
  );
  objects.push(
    `4 0 obj<< /Length ${stream.length} >>stream\n${stream}\nendstream endobj`
  );
  objects.push('5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj');

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += obj + '\n';
  }
  const xrefPos = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i < offsets.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xrefPos}\n%%EOF`;

  return new TextEncoder().encode(pdf);
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { billId: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return Errors.unauthorized();

    await connectDB();
    const bill = await Bill.findById(params.billId).lean();
    if (!bill) {
      return new Response('Not found', { status: 404 });
    }

    if (user.role === 'TENANT') {
      if (bill.tenantUserId?.toString() !== user.id) {
        return Errors.forbidden();
      }
    } else if (!isSuperAdmin(user)) {
      if (bill.accountId.toString() !== user.accountId) {
        return Errors.forbidden();
      }
      if (!isOwner(user)) {
        const scope = hasPropertyScope(user, bill.propertyId.toString());
        if (!scope.allowed) return Errors.forbidden();
      }
    }

    const lines: string[] = [
      'HOUSEYE — BILL',
      `Bill: ${bill.billNumber}`,
      `Status: ${bill.status}`,
      `Property: ${bill.snapshot?.propertyName || '-'}`,
      `Unit: ${bill.snapshot?.unitNumber || '-'}`,
      `Tenant: ${bill.snapshot?.tenantName || '-'}`,
      `Due: ${new Date(bill.dueDate).toLocaleDateString('en-IN')}`,
      '',
      '--- Line items ---',
    ];

    for (const l of bill.lines || []) {
      lines.push(
        `${l.label}: Rs ${l.amount} (paid ${l.paid}, due ${l.remaining})`
      );
    }

    lines.push('');
    lines.push(`Total: Rs ${bill.totalAmount}`);
    lines.push(`Paid: Rs ${bill.totalPaid}`);
    lines.push(`Remaining: Rs ${bill.totalRemaining}`);
    if (bill.paymentLinkToken) {
      lines.push(`Pay token: ${bill.paymentLinkToken}`);
    }

    const pdf = textToPdf(lines);

    return new Response(Buffer.from(pdf), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${bill.billNumber}.pdf"`,
      },
    });
  } catch (err) {
    console.error('[Houseye] bill pdf:', err);
    return Errors.server();
  }
}
