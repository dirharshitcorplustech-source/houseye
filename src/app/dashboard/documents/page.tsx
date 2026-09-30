/**
 * HOUSEYE.COM — Documents UI + S3 presign upload
 */

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth/get-session';
import { connectDB } from '@/lib/db/connect';
import { DocumentRecord } from '@/models';
import { LogoutButton } from '@/components/auth/LogoutButton';
import { UploadDocumentForm } from '@/components/forms/UploadDocumentForm';

export default async function DocumentsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role === 'TENANT') redirect('/tenant');
  if (user.isSuperAdmin) redirect('/admin');

  await connectDB();

  const docs = await DocumentRecord.find({
    accountId: user.accountId,
    deletedAt: null,
  })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  const canUpload =
    (user.role === 'OWNER' ||
      user.permissions.includes('document:upload')) &&
    user.subscriptionStatus === 'ACTIVE';

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 text-sm">
            <Link href="/dashboard" className="font-bold text-houseye-primary text-lg">
              Houseye
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-900 font-medium">Documents</span>
          </div>
          <LogoutButton />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Documents</h1>
          <p className="text-sm text-slate-500 mt-1">
            Agreements, ID proofs, receipts. Files go to private storage.
          </p>
        </div>

        {canUpload && <UploadDocumentForm />}

        <div className="space-y-2">
          {docs.length === 0 ? (
            <div className="bg-white border rounded-xl p-10 text-center text-slate-500">
              No documents yet.
            </div>
          ) : (
            docs.map((d) => (
              <div
                key={d._id.toString()}
                className="bg-white border rounded-xl px-4 py-3 text-sm flex justify-between gap-2"
              >
                <div>
                  <div className="font-medium text-slate-900">{d.title}</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {d.category} · {d.fileName}
                    {d.sizeBytes
                      ? ` · ${(d.sizeBytes / 1024).toFixed(1)} KB`
                      : ''}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {new Date(d.createdAt).toLocaleString('en-IN')}
                  </div>
                </div>
                {d.fileKey && (
                  <span className="text-xs text-slate-400 font-mono truncate max-w-[120px]">
                    stored
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
