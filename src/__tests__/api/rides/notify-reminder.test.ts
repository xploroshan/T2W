import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createNextRequest, parseResponse, mockSuperAdmin, mockCoreMember, mockRider } from '@/__tests__/helpers';

vi.mock('@/lib/db', () => ({
  prisma: {
    ride: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock('@/lib/email', () => ({
  sendRideReminderEmails: vi.fn().mockResolvedValue(undefined),
}));

import { POST } from '@/app/api/rides/[id]/notify-reminder/route';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { sendRideReminderEmails } from '@/lib/email';

const mockGetCurrentUser = getCurrentUser as ReturnType<typeof vi.fn>;
const mockFindUnique = prisma.ride.findUnique as ReturnType<typeof vi.fn>;
const mockSendReminder = sendRideReminderEmails as ReturnType<typeof vi.fn>;

const BASE_RIDE = {
  id: 'ride-1',
  rideNumber: '#001',
  title: 'Jungle Ride',
  startLocation: 'Bangalore',
  endLocation: 'Coorg',
  startDate: new Date('2026-05-10'),
  endDate: new Date('2026-05-12'),
  distanceKm: 350,
  description: 'Great ride',
  posterUrl: null,
  fee: 500,
  leadRider: 'Admin',
};

const makeRequest = (rideId: string, body: Record<string, unknown> = {}) =>
  createNextRequest(`http://localhost:3000/api/rides/${rideId}/notify-reminder`, {
    method: 'POST',
    body,
  });

const makeParams = (id: string) =>
  ({ params: Promise.resolve({ id }) } as { params: Promise<{ id: string }> });

describe('POST /api/rides/[id]/notify-reminder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue(mockSuperAdmin);
    mockFindUnique.mockResolvedValue({ ...BASE_RIDE });
  });

  describe('authorization', () => {
    it('returns 403 when user is not authenticated', async () => {
      mockGetCurrentUser.mockResolvedValue(null);

      const { status } = await parseResponse(
        await POST(makeRequest('ride-1', { notifyMode: 'all' }), makeParams('ride-1'))
      );
      expect(status).toBe(403);
    });

    it('returns 403 when user is a regular rider', async () => {
      mockGetCurrentUser.mockResolvedValue(mockRider);

      const { status } = await parseResponse(
        await POST(makeRequest('ride-1', { notifyMode: 'all' }), makeParams('ride-1'))
      );
      expect(status).toBe(403);
    });

    it('allows superadmin to send reminder', async () => {
      mockGetCurrentUser.mockResolvedValue(mockSuperAdmin);

      const { status } = await parseResponse(
        await POST(makeRequest('ride-1', { notifyMode: 'all' }), makeParams('ride-1'))
      );
      expect(status).toBe(200);
    });

    it('allows core_member to send reminder', async () => {
      mockGetCurrentUser.mockResolvedValue(mockCoreMember);

      const { status } = await parseResponse(
        await POST(makeRequest('ride-1', { notifyMode: 'all' }), makeParams('ride-1'))
      );
      expect(status).toBe(200);
    });
  });

  describe('ride lookup', () => {
    it('returns 404 when ride does not exist', async () => {
      mockFindUnique.mockResolvedValue(null);

      const { status } = await parseResponse(
        await POST(makeRequest('missing-ride', { notifyMode: 'all' }), makeParams('missing-ride'))
      );
      expect(status).toBe(404);
    });

    it('passes the correct rideId to findUnique', async () => {
      await POST(makeRequest('ride-xyz', { notifyMode: 'all' }), makeParams('ride-xyz'));

      expect(mockFindUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'ride-xyz' } })
      );
    });
  });

  describe('email dispatch', () => {
    it('returns queued:true and correct mode on success', async () => {
      const { status, data } = await parseResponse(
        await POST(makeRequest('ride-1', { notifyMode: 'all' }), makeParams('ride-1'))
      );

      expect(status).toBe(200);
      expect(data.queued).toBe(true);
      expect(data.mode).toBe('all');
    });

    it('calls sendRideReminderEmails with rideId, ride data, and notifyMode=all', async () => {
      await POST(makeRequest('ride-1', { notifyMode: 'all' }), makeParams('ride-1'));

      expect(mockSendReminder).toHaveBeenCalledWith(
        'ride-1',
        expect.objectContaining({ id: 'ride-1', title: 'Jungle Ride' }),
        'all'
      );
    });

    it('uses notifyMode=selected when body specifies selected', async () => {
      await POST(makeRequest('ride-1', { notifyMode: 'selected' }), makeParams('ride-1'));

      expect(mockSendReminder).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        'selected'
      );
      const { data } = await parseResponse(
        await POST(makeRequest('ride-1', { notifyMode: 'selected' }), makeParams('ride-1'))
      );
      expect(data.mode).toBe('selected');
    });

    it('defaults notifyMode to all when an unknown value is provided', async () => {
      await POST(makeRequest('ride-1', { notifyMode: 'unknown-value' }), makeParams('ride-1'));

      expect(mockSendReminder).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        'all'
      );
    });

    it('defaults notifyMode to all when notifyMode is omitted', async () => {
      await POST(makeRequest('ride-1', {}), makeParams('ride-1'));

      expect(mockSendReminder).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        'all'
      );
    });
  });
});
