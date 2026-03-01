export function startActivityAndObserve({
  userId = "demo",
  intervalMs = 1000,
  idleThresholdMs = 15000,
  onResult = () => {},
  onError = () => {},
} = {}) {
  let stopped = false;
  let lastActivity = Date.now();

  const mark = () => { lastActivity = Date.now(); };

  // Track activity inside renderer window
  window.addEventListener("keydown", mark);
  window.addEventListener("mousedown", mark);
  window.addEventListener("mousemove", mark, { passive: true });
  window.addEventListener("wheel", mark, { passive: true });
  window.addEventListener("touchstart", mark, { passive: true });

  async function tick() {
    if (stopped) return;

    const idleMs = Date.now() - lastActivity;
    const status = idleMs > idleThresholdMs ? "idle" : "focused";

    try {
      const resp = await window.api.sendObservation({ userId, status });
      if (resp?.ok) onResult({ status, idleMs, ...resp.data });
      else onError(resp);
    } catch (e) {
      onError({ ok: false, error: String(e) });
    }

    setTimeout(tick, intervalMs);
  }

  tick();

  return () => {
    stopped = true;
    window.removeEventListener("keydown", mark);
    window.removeEventListener("mousedown", mark);
    window.removeEventListener("mousemove", mark);
    window.removeEventListener("wheel", mark);
    window.removeEventListener("touchstart", mark);
  };
}