import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchElevationStats } from '@/lib/elevation';

describe('fetchElevationStats', () => {
  const originalKey = process.env.GOOGLE_MAPS_SERVER_API_KEY;

  beforeEach(() => {
    process.env.GOOGLE_MAPS_SERVER_API_KEY = 'test-key';
  });

  afterEach(() => {
    process.env.GOOGLE_MAPS_SERVER_API_KEY = originalKey;
    vi.restoreAllMocks();
  });

  it('returns null when no API key is configured', async () => {
    delete process.env.GOOGLE_MAPS_SERVER_API_KEY;
    const result = await fetchElevationStats([
      { lat: 12, lng: 77 },
      { lat: 13, lng: 78 },
    ]);
    expect(result).toBeNull();
  });

  it('returns null for paths with fewer than 2 points', async () => {
    expect(await fetchElevationStats([])).toBeNull();
    expect(await fetchElevationStats([{ lat: 12, lng: 77 }])).toBeNull();
  });

  it('returns null when Google responds with non-OK status', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'REQUEST_DENIED', error_message: 'nope' }),
      })
    );
    const result = await fetchElevationStats([
      { lat: 12, lng: 77 },
      { lat: 13, lng: 78 },
    ]);
    expect(result).toBeNull();
  });

  it('returns null on fetch failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')));
    const result = await fetchElevationStats([
      { lat: 12, lng: 77 },
      { lat: 13, lng: 78 },
    ]);
    expect(result).toBeNull();
  });

  it('sums positive deltas as gain and negative as loss, ignoring sub-3m noise', async () => {
    // Sequence: 100 → 102 (noise, ignored) → 110 (+8 gain) → 105 (-5 loss)
    //           → 105.5 (noise) → 120 (+15 gain) → 100 (-20 loss)
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 'OK',
          results: [
            { elevation: 100 },
            { elevation: 102 },
            { elevation: 110 },
            { elevation: 105 },
            { elevation: 105.5 },
            { elevation: 120 },
            { elevation: 100 },
          ],
        }),
      })
    );
    const result = await fetchElevationStats([
      { lat: 12.0, lng: 77.0 },
      { lat: 12.1, lng: 77.1 },
    ]);
    expect(result).toEqual({ gainM: 23, lossM: 25 });
  });
});
