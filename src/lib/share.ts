export type ShareResult = 'shared' | 'downloaded' | 'cancelled';

/**
 * Shares a file through the Web Share sheet where the browser can share files,
 * otherwise triggers a download. A dismissed share sheet reports 'cancelled'.
 */
export async function shareOrDownload(file: File): Promise<ShareResult> {
  const nav = typeof navigator === 'undefined' ? undefined : navigator;
  if (nav?.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: file.name });
      return 'shared';
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        return 'cancelled';
      }
      // Any other failure: fall back to a plain download.
    }
  }
  download(file);
  return 'downloaded';
}

function download(file: File): void {
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  a.rel = 'noopener';
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
