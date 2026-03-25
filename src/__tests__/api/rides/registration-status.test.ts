import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createNextRequest, parseResponse, mockSuperAdmin, mockCoreMember, mockRider } from '@/__tests__/helpers';

vi.mock('@/lib/db', () => ({
  prisma: {
    rideRegistration: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    rideParticipation: {
      upsert: vi.fn(),
      updateMany: vi.fn(),
    },
    ride: {
      update: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(),
}));

import { PATCH } from '@/app/api/rides/[id]/registrations/[regId]/route';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

const mockGetCurrentUser = getCurrentUser as ReturnType<typeof vi.fn>;
const mockFindFirst = prisma.rideRegistration.findFirst as ReturnType<typeof vi.fn>;
const mockFindMany = prisma.rideRegistration.findMany as ReturnType<typeof vi.fn>;
const mockUpdate = prisma.rideRegistration.update as ReturnType<typeof vi.fn>;
const mockUserFindUnique = prisma.user.findUnique as ReturnType<typeof vi.fn>;
const mockParticipationUpsert = prisma.rideParticipation.upsert as ReturnType<typeof vi.fn>;
const mockParticipationUpdateMany = prisma.rideParticipation.updateMany as ReturnType<typeof vi.fn>;
const mockRideUpdate = prisma.ride.update as ReturnType<typeof vi.fn>;

function callPATCH(rideId: string, regId: string, body: Record<string, unknown>) {
  const req = createNextRequest(`http://localhost:3000/api/rides/${rideId}/registrations/${regId}`, {
    method: 'PATCH',
    body,
  });
  return PATCH(req, { params: Promise.resolve({ id: rideId, regId }) });
}

/** Helper: set up mocks so syncRideRidersFromRegistrations works correctly */
function mockSyncReturningNames(names: string[]) {
  mockFindMany.mockResolvedValue(names.map((n) => ({ riderName: n })));
  mockRideUpdate.mockResolvedValue({});
}

describe('PATCH /api/rides/[id]/registrations/[regId]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: sync returns empty (override per test as needed)
    mockSyncReturningNames([]);
  });

  it('returns 403 for non-admin user', async () => {
    mockGetCurrentUser.mockResolvedValue(mockRider);

    const { status, data } = await parseResponse(
      await callPATCH('ride-1', 'reg-1', { approvalStatus: 'confirmed' })
    );

    expect(status).toBe(403);
    expect(data.error).toBe('Forbidden');
  });

  it('returns 403 for unauthenticated request', async () => {
    mockGetCurrentUser.mockResolvedValue(null);

    const { status } = await parseResponse(
      await callPATCH('ride-1', 'reg-1', { approvalStatus: 'confirmed' })
    );

    expect(status).toBe(403);
  });

  it('returns 400 for invalid approval status', async () => {
    mockGetCurrentUser.mockResolvedValue(mockSuperAdmin);

    const { status, data } = await parseResponse(
      await callPATCH('ride-1', 'reg-1', { approvalStatus: 'invalid' })
    );

    expect(status).toBe(400);
    expect(data.error).toContain('Invalid status');
  });

  it('returns 404 when registration not found', async () => {
    mockGetCurrentUser.mockResolvedValue(mockSuperAdmin);
    mockFindFirst.mockResolvedValue(null);

    const { status, data } = await parseResponse(
      await callPATCH('ride-1', 'reg-999', { approvalStatus: 'confirmed' })
    );

    expect(status).toBe(404);
    expect(data.error).toBe('Registration not found');
  });

  it('confirms a registration and creates participation', async () => {
    mockGetCurrentUser.mockResolvedValue(mockSuperAdmin);
    mockFindFirst.mockResolvedValue({ id: 'reg-1', userId: 'user-10', rideId: 'ride-1' });
    mockUpdate.mockResolvedValue({ id: 'reg-1', approvalStatus: 'confirmed' });
    mockUserFindUnique.mockResolvedValue({ linkedRiderId: 'rider-10' });
    mockParticipationUpsert.mockResolvedValue({});
    mockSyncReturningNames(['Alice', 'Bob']);

    const { status, data } = await parseResponse(
      await callPATCH('ride-1', 'reg-1', { approvalStatus: 'confirmed' })
    );

    expect(status).toBe(200);
    expect(data.registration.approvalStatus).toBe('confirmed');
    expect(mockParticipationUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          riderProfileId_rideId: {
            riderProfileId: 'rider-10',
            rideId: 'ride-1',
          },
        },
        create: expect.objectContaining({ points: 5 }),
      })
    );
  });

  it('marks as dropout and sets droppedOut flag on participation', async () => {
    mockGetCurrentUser.mockResolvedValue(mockSuperAdmin);
    mockFindFirst.mockResolvedValue({ id: 'reg-1', userId: 'user-10', rideId: 'ride-1' });
    mockUpdate.mockResolvedValue({ id: 'reg-1', approvalStatus: 'dropout' });
    mockUserFindUnique.mockResolvedValue({ linkedRiderId: 'rider-10' });
    mockParticipationUpdateMany.mockResolvedValue({ count: 1 });
    mockSyncReturningNames(['Alice']); // Bob dropped out

    const { status, data } = await parseResponse(
      await callPATCH('ride-1', 'reg-1', { approvalStatus: 'dropout' })
    );

    expect(status).toBe(200);
    expect(data.registration.approvalStatus).toBe('dropout');
    expect(mockParticipationUpdateMany).toHaveBeenCalledWith({
      where: { riderProfileId: 'rider-10', rideId: 'ride-1' },
      data: { droppedOut: true },
    });
  });

  it('rejects a registration without affecting participation', async () => {
    mockGetCurrentUser.mockResolvedValue(mockCoreMember);
    mockFindFirst.mockResolvedValue({ id: 'reg-1', userId: 'user-10', rideId: 'ride-1' });
    mockUpdate.mockResolvedValue({ id: 'reg-1', approvalStatus: 'rejected' });
    mockUserFindUnique.mockResolvedValue({ linkedRiderId: 'rider-10' });
    mockSyncReturningNames([]);

    const { status, data } = await parseResponse(
      await callPATCH('ride-1', 'reg-1', { approvalStatus: 'rejected' })
    );

    expect(status).toBe(200);
    expect(data.registration.approvalStatus).toBe('rejected');
    // Neither upsert nor updateMany should be called for rejected status
    expect(mockParticipationUpsert).not.toHaveBeenCalled();
    expect(mockParticipationUpdateMany).not.toHaveBeenCalled();
  });

  it('allows core_member to update registration status', async () => {
    mockGetCurrentUser.mockResolvedValue(mockCoreMember);
    mockFindFirst.mockResolvedValue({ id: 'reg-1', userId: 'user-10', rideId: 'ride-1' });
    mockUpdate.mockResolvedValue({ id: 'reg-1', approvalStatus: 'confirmed' });
    mockUserFindUnique.mockResolvedValue({ linkedRiderId: null });
    mockSyncReturningNames(['Alice']);

    const { status } = await parseResponse(
      await callPATCH('ride-1', 'reg-1', { approvalStatus: 'confirmed' })
    );

    expect(status).toBe(200);
  });

  it('accepts all three valid statuses', async () => {
    for (const approvalStatus of ['confirmed', 'rejected', 'dropout']) {
      vi.clearAllMocks();
      mockGetCurrentUser.mockResolvedValue(mockSuperAdmin);
      mockFindFirst.mockResolvedValue({ id: 'reg-1', userId: 'user-10', rideId: 'ride-1' });
      mockUpdate.mockResolvedValue({ id: 'reg-1', approvalStatus });
      mockUserFindUnique.mockResolvedValue({ linkedRiderId: null });
      mockSyncReturningNames([]);

      const { status } = await parseResponse(
        await callPATCH('ride-1', 'reg-1', { approvalStatus })
      );

      expect(status).toBe(200);
    }
  });

  // ── Ride.riders cache sync (single source of truth) ──

  it('syncs Ride.riders cache from confirmed registrations on confirm', async () => {
    mockGetCurrentUser.mockResolvedValue(mockSuperAdmin);
    mockFindFirst.mockResolvedValue({ id: 'reg-1', userId: 'user-10', rideId: 'ride-1' });
    mockUpdate.mockResolvedValue({ id: 'reg-1', approvalStatus: 'confirmed' });
    mockUserFindUnique.mockResolvedValue({ linkedRiderId: 'rider-10' });
    mockParticipationUpsert.mockResolvedValue({});
    mockSyncReturningNames(['Alice', 'Bob', 'Charlie']);

    await callPATCH('ride-1', 'reg-1', { approvalStatus: 'confirmed' });

    // Verify syncRideRidersFromRegistrations was called
    expect(mockFindMany).toHaveBeenCalledWith({
      where: { rideId: 'ride-1', approvalStatus: 'confirmed' },
      select: { riderName: true },
      orderBy: { registeredAt: 'asc' },
    });
    expect(mockRideUpdate).toHaveBeenCalledWith({
      where: { id: 'ride-1' },
      data: { riders: JSON.stringify(['Alice', 'Bob', 'Charlie']) },
    });
  });

  it('syncs Ride.riders cache on rejection (removes rejected rider from cache)', async () => {
    mockGetCurrentUser.mockResolvedValue(mockSuperAdmin);
    mockFindFirst.mockResolvedValue({ id: 'reg-1', userId: 'user-10', rideId: 'ride-1' });
    mockUpdate.mockResolvedValue({ id: 'reg-1', approvalStatus: 'rejected' });
    mockUserFindUnique.mockResolvedValue({ linkedRiderId: null });
    // After rejection, only confirmed riders remain
    mockSyncReturningNames(['Alice', 'Bob']);

    await callPATCH('ride-1', 'reg-1', { approvalStatus: 'rejected' });

    expect(mockRideUpdate).toHaveBeenCalledWith({
      where: { id: 'ride-1' },
      data: { riders: JSON.stringify(['Alice', 'Bob']) },
    });
  });

  it('syncs Ride.riders cache on dropout (dropout rider excluded from cache)', async () => {
    mockGetCurrentUser.mockResolvedValue(mockSuperAdmin);
    mockFindFirst.mockResolvedValue({ id: 'reg-1', userId: 'user-10', rideId: 'ride-1' });
    mockUpdate.mockResolvedValue({ id: 'reg-1', approvalStatus: 'dropout' });
    mockUserFindUnique.mockResolvedValue({ linkedRiderId: 'rider-10' });
    mockParticipationUpdateMany.mockResolvedValue({ count: 1 });
    // After dropout, only remaining confirmed riders are in cache
    mockSyncReturningNames(['Alice']);

    await callPATCH('ride-1', 'reg-1', { approvalStatus: 'dropout' });

    expect(mockRideUpdate).toHaveBeenCalledWith({
      where: { id: 'ride-1' },
      data: { riders: JSON.stringify(['Alice']) },
    });
  });

  it('Ride.riders cache becomes empty when all riders are rejected/dropout', async () => {
    mockGetCurrentUser.mockResolvedValue(mockSuperAdmin);
    mockFindFirst.mockResolvedValue({ id: 'reg-1', userId: 'user-10', rideId: 'ride-1' });
    mockUpdate.mockResolvedValue({ id: 'reg-1', approvalStatus: 'rejected' });
    mockUserFindUnique.mockResolvedValue({ linkedRiderId: null });
    mockSyncReturningNames([]); // No confirmed riders left

    await callPATCH('ride-1', 'reg-1', { approvalStatus: 'rejected' });

    expect(mockRideUpdate).toHaveBeenCalledWith({
      where: { id: 'ride-1' },
      data: { riders: JSON.stringify([]) },
    });
  });

  it('does not skip participation when user has no linkedRiderId', async () => {
    mockGetCurrentUser.mockResolvedValue(mockSuperAdmin);
    mockFindFirst.mockResolvedValue({ id: 'reg-1', userId: 'user-10', rideId: 'ride-1' });
    mockUpdate.mockResolvedValue({ id: 'reg-1', approvalStatus: 'confirmed' });
    mockUserFindUnique.mockResolvedValue({ linkedRiderId: null });
    mockSyncReturningNames(['TestRider']);

    const { status } = await parseResponse(
      await callPATCH('ride-1', 'reg-1', { approvalStatus: 'confirmed' })
    );

    expect(status).toBe(200);
    // No participation created since no linkedRiderId
    expect(mockParticipationUpsert).not.toHaveBeenCalled();
    // But Ride.riders cache still synced
    expect(mockRideUpdate).toHaveBeenCalled();
  });
});
