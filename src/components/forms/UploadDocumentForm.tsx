'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function UploadDocumentForm() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('AGREEMENT');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError('Choose a file');
      return;
    }
    setLoading(true);
    setError('');
    try {
      // 1) Presign
      const presign = await fetch('/api/storage/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type || 'application/octet-stream',
          category: category.toLowerCase(),
        }),
      });
      const pre = await presign.json();
      if (!pre.success) {
        setError(pre.error?.message || 'Could not start upload');
        setLoading(false);
        return;
      }

      const uploadUrl = pre.data.uploadUrl as string;
      const key = pre.data.key as string;

      // 2) PUT file (S3 or dev stub)
      if (uploadUrl.includes('/api/dev/')) {
        // Dev stub — skip binary put
      } else {
        const put = await fetch(uploadUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': file.type || 'application/octet-stream',
          },
          body: file,
        });
        if (!put.ok) {
          setError('File upload failed');
          setLoading(false);
          return;
        }
      }

      // 3) Register metadata
      const reg = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title || file.name,
          fileName: file.name,
          category,
          mimeType: file.type,
          sizeBytes: file.size,
          fileKey: key,
        }),
      });
      const data = await reg.json();
      if (!data.success) {
        setError(data.error?.message || 'Register failed');
        setLoading(false);
        return;
      }

      setTitle('');
      setFile(null);
      router.refresh();
    } catch {
      setError('Upload error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="bg-white border rounded-xl p-4 space-y-3 text-sm"
    >
      <div className="font-medium">Upload document</div>
      <input
        placeholder="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full px-3 py-2 border rounded-lg"
        disabled={loading}
      />
      <select
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        className="w-full px-3 py-2 border rounded-lg"
        disabled={loading}
      >
        <option value="AGREEMENT">Agreement</option>
        <option value="ID_PROOF">ID proof</option>
        <option value="RECEIPT">Receipt</option>
        <option value="INVOICE">Invoice</option>
        <option value="OTHER">Other</option>
      </select>
      <input
        type="file"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
        className="w-full text-sm"
        disabled={loading}
      />
      {error && <p className="text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="px-4 py-2 bg-houseye-primary text-white rounded-lg disabled:opacity-60"
      >
        {loading ? 'Uploading…' : 'Upload'}
      </button>
    </form>
  );
}
