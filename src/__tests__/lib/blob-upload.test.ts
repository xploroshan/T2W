import { describe, it, expect } from 'vitest';
import { decodeDataUrl } from '@/lib/blob-upload';

describe('decodeDataUrl', () => {
  it('decodes a base64 PNG data URL', () => {
    // 1x1 transparent PNG
    const dataUrl =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkAAIAAAUAAen63NgAAAAASUVORK5CYII=';
    const { bytes, mime } = decodeDataUrl(dataUrl);
    expect(mime).toBe('image/png');
    // PNG signature: 89 50 4E 47 0D 0A 1A 0A
    expect(bytes[0]).toBe(0x89);
    expect(bytes[1]).toBe(0x50);
    expect(bytes[2]).toBe(0x4e);
    expect(bytes[3]).toBe(0x47);
  });

  it('decodes a base64 JPEG data URL', () => {
    const dataUrl = 'data:image/jpeg;base64,/9j/4AAQ';
    const { mime } = decodeDataUrl(dataUrl);
    expect(mime).toBe('image/jpeg');
  });

  it('throws for non-image data URLs', () => {
    expect(() => decodeDataUrl('data:text/plain;base64,SGVsbG8=')).toThrow(
      /not an image/i
    );
  });

  it('throws for non-data URLs', () => {
    expect(() => decodeDataUrl('https://example.com/image.png')).toThrow();
    expect(() => decodeDataUrl('not-a-url')).toThrow();
  });

  it('throws for malformed data URLs without a comma', () => {
    expect(() => decodeDataUrl('data:image/png;base64')).toThrow(/malformed/i);
  });
});
