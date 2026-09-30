import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/get-session';
import { connectDB } from '@/lib/db/connect';
import { Payment } from '@/models';
import { isOwner, isSuperAdmin } from '@/services/authorization';
import { Errors } from '@/lib/utils/response';

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
  objects.push(
    '5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj'
  );
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
  { params }: { params: { paymentId: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return Errors.unauthorized();
    await connectDB();
    const payment = await Payment.findById(params.paymentId).lean();
    if (!payment || payment.status !== 'APPROVED') {
      return new Response('Not found', { status: 404 });
    }
    if (user.role === 'TENANT') {
      if (payment.tenantUserId?.toString() !== user.id) return Errors.forbidden();
    } else if (
      !isSuperAdmin(user) &&
      payment.accountId.toString() !== user.accountId
    ) {
      return Errors.forbidden();
    }

    const lines = [
      'HOUSEYE — PAYMENT RECEIPT',
      `Receipt: ${payment.receiptNumber || payment._id.toString()}`,
      `Amount: Rs ${payment.amount}`,
      `Method: ${payment.method}`,
      `Status: ${payment.status}`,
      `Ref: ${payment.transactionRef || payment.gatewayRef || '-'}`,
      `Date: ${new Date(
        (payment as { approvedAt?: Date }).approvedAt || payment.createdAt
      ).toLocaleString('en-IN')}`,
    ];
    const pdf = textToPdf(lines);
    return new Response(pdf, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="receipt-${
          payment.receiptNumber || payment._id
        }.pdf"`,
      },
    });
  } catch (err) {
    console.error('[Houseye] receipt pdf', err);
    return Errors.server();
  }
}
