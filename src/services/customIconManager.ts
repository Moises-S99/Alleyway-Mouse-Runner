/**
 * Custom Icon Manager
 * Handles loading, saving, and updating the game's custom icon
 * from user device images (PNG, JPG, WebP, SVG).
 * Default icon is now the high-resolution artwork of the mouse in the red hoodie (/app-icon.png).
 */

import { DEFAULT_ICON_BASE64 } from '../assets/defaultIconBase64';

const STORAGE_KEY = 'mouse_runner_custom_icon';
export const DEFAULT_APP_ICON = DEFAULT_ICON_BASE64;

export function getCustomIcon(): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return saved;
  } catch {}
  return DEFAULT_APP_ICON;
}

export function hasUserCustomIcon(): boolean {
  try {
    return !!localStorage.getItem(STORAGE_KEY);
  } catch {
    return false;
  }
}

export function saveCustomIcon(dataUrl: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, dataUrl);
    applyIconToDOM(dataUrl);
  } catch (err) {
    console.error('Error saving custom icon:', err);
  }
}

export function resetCustomIcon(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    applyIconToDOM(DEFAULT_APP_ICON);
  } catch (err) {
    console.error('Error resetting custom icon:', err);
  }
}

export function applyIconToDOM(dataUrl?: string | null): void {
  try {
    const iconUrl = dataUrl || getCustomIcon();
    const favicon = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
    if (favicon) {
      favicon.href = iconUrl;
    }

    const appleIcon = document.querySelector<HTMLLinkElement>("link[rel='apple-touch-icon']");
    if (appleIcon) {
      appleIcon.href = iconUrl;
    }
  } catch (err) {
    console.warn('Could not update DOM favicon tags:', err);
  }
}
