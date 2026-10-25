let sentinel: WakeLockSentinel | null = null;
let wanted = false;

async function acquire(): Promise<void> {
  if (!wanted || sentinel || !('wakeLock' in navigator)) return;
  try {
    sentinel = await navigator.wakeLock.request('screen');
    sentinel.addEventListener('release', () => {
      sentinel = null;
    });
  } catch {
    // not allowed (e.g. battery saver) – ignore
  }
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') void acquire();
});

export function setWakeLock(on: boolean): void {
  wanted = on;
  if (on) void acquire();
  else {
    void sentinel?.release();
    sentinel = null;
  }
}
