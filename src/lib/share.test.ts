// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { shareOrDownload } from './share';

const file = new File(['{}'], 'x.json', { type: 'application/json' });

afterEach(() => vi.unstubAllGlobals());

describe('shareOrDownload', () => {
  it('uses Web Share with the file when supported', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { share, canShare: () => true });
    expect(await shareOrDownload(file)).toBe('shared');
    expect(share).toHaveBeenCalledWith(
      expect.objectContaining({ files: [file] }),
    );
  });
  it('reports cancelled when the sheet is dismissed', async () => {
    const share = vi
      .fn()
      .mockRejectedValue(new DOMException('x', 'AbortError'));
    vi.stubGlobal('navigator', { share, canShare: () => true });
    expect(await shareOrDownload(file)).toBe('cancelled');
  });
  it('downloads when file sharing is unsupported', async () => {
    vi.stubGlobal('navigator', { share: vi.fn(), canShare: () => false });
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});
    URL.createObjectURL = vi.fn(() => 'blob:x');
    URL.revokeObjectURL = vi.fn();
    expect(await shareOrDownload(file)).toBe('downloaded');
    expect(click).toHaveBeenCalledOnce();
    click.mockRestore();
  });
});
