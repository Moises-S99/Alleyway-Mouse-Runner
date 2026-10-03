/**
 * Standalone Offline Game Downloader
 * Downloads the exact identical Alleyway Mouse Runner application
 * pre-compiled into a 100% self-contained single-file HTML.
 * Uses safe Blob URLs to ensure browser never navigates away or quits the game.
 */

import { getCustomIcon } from './customIconManager';

export async function downloadStandaloneGame(): Promise<void> {
  // 1. If running over file:// or offline, save current document directly as a Blob
  if (typeof window !== 'undefined' && window.location.protocol === 'file:') {
    try {
      const docHtml = '<!doctype html>\n' + document.documentElement.outerHTML;
      const blob = new Blob([docHtml], { type: 'text/html;charset=utf-8' });
      triggerDownload(blob);
      return;
    } catch (e) {
      console.warn('Could not serialize current document, trying fetch...', e);
    }
  }

  // 2. Try fetching the pre-built standalone HTML bundle from the server
  try {
    const response = await fetch('/Raton_Callejero_Juego_Completo.html', {
      cache: 'no-cache',
    });

    if (response.ok) {
      let htmlText = await response.text();
      const customIcon = getCustomIcon();
      if (customIcon && customIcon.startsWith('data:')) {
        // Embed user's custom icon directly into the standalone HTML
        htmlText = htmlText.replace(
          /<link rel="icon"[^>]*>/i,
          `<link rel="icon" type="image/png" href="${customIcon}" />`
        );
        htmlText = htmlText.replace(
          /<link rel="apple-touch-icon"[^>]*>/i,
          `<link rel="apple-touch-icon" href="${customIcon}" />`
        );
      }
      const blob = new Blob([htmlText], { type: 'text/html;charset=utf-8' });
      triggerDownload(blob);
      return;
    }
  } catch (err) {
    console.warn('Fetch of standalone bundle failed, using document serialization fallback...', err);
  }

  // 3. Bulletproof fallback: serialize the current active page into a self-contained Blob
  try {
    const docHtml = '<!doctype html>\n' + document.documentElement.outerHTML;
    const blob = new Blob([docHtml], { type: 'text/html;charset=utf-8' });
    triggerDownload(blob);
  } catch (err) {
    console.error('All standalone game download strategies failed:', err);
  }
}

function triggerDownload(blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = 'Raton_Callejero_Juego_Completo.html';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1000);
}
