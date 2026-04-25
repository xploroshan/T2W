import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// `after()` from next/server requires a live Next.js request context which
// doesn't exist in Vitest. Replace it with a pass-through that runs the
// callback immediately so tests can still assert on side-effects.
vi.mock('next/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next/server')>();
  return { ...actual, after: vi.fn((cb: () => unknown) => cb()) };
});
