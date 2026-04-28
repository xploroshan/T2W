import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseResponse } from '@/__tests__/helpers';

vi.mock('@/lib/db', () => ({
  prisma: {
    riderProfile: { update: vi.fn(), findUnique: vi.fn() },
  },
}));

vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock('@/lib/blob-upload', () => ({
  uploadImage: vi.fn(),
}));

import { POST } from '@/app/api/upload/route';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { uploadImage } from '@/lib/blob-upload';
import { NextRequest } from 'next/server';

const FAKE_BLOB_URL =
  'https://abc123.public.blob.vercel-storage.com/avatar/rider-1/png-xyz.png';

function createFormDataRequest(fields: Record<string, string | File>): NextRequest {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.append(key, value);
  }
  return new NextRequest(new URL('http://localhost:3000/api/upload'), {
    method: 'POST',
    body: formData,
  });
}

describe('POST /api/upload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(uploadImage).mockResolvedValue({
      url: FAKE_BLOB_URL,
      pathname: 'avatar/rider-1/png-xyz.png',
      contentType: 'image/png',
    });
  });

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const req = createFormDataRequest({ dataUrl: 'data:image/png;base64,abc' });
    const res = await POST(req);
    const { status, data } = await parseResponse(res);
    expect(status).toBe(401);
    expect(data.error).toContain('Not authenticated');
  });

  it('returns 400 when no file or dataUrl provided', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: 'u1', role: 'rider' } as never);

    const formData = new FormData();
    const req = new NextRequest(new URL('http://localhost:3000/api/upload'), {
      method: 'POST',
      body: formData,
    });
    const res = await POST(req);
    const { status, data } = await parseResponse(res);
    expect(status).toBe(400);
    expect(data.error).toContain('No file');
  });

  it('uploads to Blob and returns the public URL when dataUrl is provided', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: 'u1', role: 'rider' } as never);

    const req = createFormDataRequest({ dataUrl: 'data:image/png;base64,abc123' });
    const res = await POST(req);
    const { status, data } = await parseResponse(res);
    expect(status).toBe(200);
    expect(data.url).toBe(FAKE_BLOB_URL);
    expect(uploadImage).toHaveBeenCalledTimes(1);
    expect(uploadImage).toHaveBeenCalledWith(
      'data:image/png;base64,abc123',
      expect.objectContaining({ type: 'misc', scope: 'u1' })
    );
  });

  it('persists avatar to DB for owner using the Blob URL', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: 'u1', role: 'rider', linkedRiderId: 'rider-1',
    } as never);
    vi.mocked(prisma.riderProfile.update).mockResolvedValue({} as never);

    const req = createFormDataRequest({
      dataUrl: 'data:image/png;base64,abc',
      type: 'avatar',
      targetId: 'rider-1',
    });
    const res = await POST(req);
    const { status, data } = await parseResponse(res);
    expect(status).toBe(200);
    expect(data.persisted).toBe(true);
    expect(data.url).toBe(FAKE_BLOB_URL);
    expect(prisma.riderProfile.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'rider-1' },
        data: { avatarUrl: FAKE_BLOB_URL },
      })
    );
  });

  it('returns 403 when non-owner tries to update avatar', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: 'u1', role: 'rider', linkedRiderId: 'rider-99',
    } as never);

    const req = createFormDataRequest({
      dataUrl: 'data:image/png;base64,abc',
      type: 'avatar',
      targetId: 'rider-1',
    });
    const res = await POST(req);
    const { status, data } = await parseResponse(res);
    expect(status).toBe(403);
    expect(data.error).toContain('permission');
    expect(prisma.riderProfile.update).not.toHaveBeenCalled();
  });

  it('allows superadmin to update any avatar', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: 'u1', role: 'superadmin', linkedRiderId: 'rider-99',
    } as never);
    vi.mocked(prisma.riderProfile.update).mockResolvedValue({} as never);

    const req = createFormDataRequest({
      dataUrl: 'data:image/png;base64,abc',
      type: 'avatar',
      targetId: 'rider-1',
    });
    const res = await POST(req);
    const { status, data } = await parseResponse(res);
    expect(status).toBe(200);
    expect(data.persisted).toBe(true);
    expect(data.url).toBe(FAKE_BLOB_URL);
  });

  it('uploads a raw File to Blob', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: 'u1', role: 'rider' } as never);

    const file = new File(['test-image-content'], 'photo.png', { type: 'image/png' });
    const req = createFormDataRequest({ file: file as unknown as File });
    const res = await POST(req);
    const { status, data } = await parseResponse(res);
    expect(status).toBe(200);
    expect(data.url).toBe(FAKE_BLOB_URL);
    // The File should have been forwarded to uploadImage (not converted to base64)
    expect(uploadImage).toHaveBeenCalledTimes(1);
    // Across the Next.js form-data boundary the File instance comes from a
    // different realm than jsdom's, so `instanceof File` is unreliable here.
    // Verify by structural type instead.
    const arg = (uploadImage as unknown as { mock: { calls: unknown[][] } }).mock.calls[0][0] as {
      type?: string; arrayBuffer?: () => Promise<ArrayBuffer>;
    };
    expect(arg.type).toBe('image/png');
    expect(typeof arg.arrayBuffer).toBe('function');
  });

  it('rejects non-image files', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: 'u1', role: 'rider' } as never);

    const file = new File(['text content'], 'file.txt', { type: 'text/plain' });
    const req = createFormDataRequest({ file: file as unknown as File });
    const res = await POST(req);
    const { status, data } = await parseResponse(res);
    expect(status).toBe(400);
    expect(data.error).toContain('image');
    expect(uploadImage).not.toHaveBeenCalled();
  });

  it('rejects malformed dataUrl', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: 'u1', role: 'rider' } as never);

    const req = createFormDataRequest({ dataUrl: 'not-a-data-url' });
    const res = await POST(req);
    const { status, data } = await parseResponse(res);
    expect(status).toBe(400);
    expect(data.error).toContain('Invalid');
    expect(uploadImage).not.toHaveBeenCalled();
  });
});
