/**
 * Android Haptic Feedback service using Web Vibration API
 */

class HapticService {
  public enabled = true;

  private vibrate(pattern: number | number[]) {
    if (!this.enabled) return;
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch {
        // Ignored if browser restricts without user activation
      }
    }
  }

  light() {
    this.vibrate(12);
  }

  jump() {
    this.vibrate(25);
  }

  cheese() {
    this.vibrate([15, 25, 20]);
  }

  dodge() {
    this.vibrate(18);
  }

  impact() {
    this.vibrate([100, 40, 120]);
  }

  achievement() {
    this.vibrate([30, 50, 40, 60, 80]);
  }

  speedup() {
    this.vibrate([20, 30, 40]);
  }

  error() {
    this.vibrate([40, 40, 40]);
  }
}

export const haptics = new HapticService();
