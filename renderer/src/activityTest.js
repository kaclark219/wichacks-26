export function startActivityAndObserve({
  userId = "demo",
  intervalMs = 1000,
  idleThresholdMs = 15000,
  onResult = () => {},
  onError = () => {},
} = {}) {
  let stopped = false;

  async function tick() {
    if (stopped) return;

    try {
      const { lastGlobalActivity } = await window.api.getGlobalActivity();
      const idleMs = Date.now() - lastGlobalActivity;
      const status = idleMs > idleThresholdMs ? "idle" : "focused";

      const resp = await window.api.sendObservation({ userId, status });
      if (resp?.ok) onResult({ status, idleMs, ...resp.data });
      else onError(resp);
    } catch (e) {
      onError({ ok: false, error: String(e) });
    }

    setTimeout(tick, intervalMs);
  }

  tick();
  return () => { stopped = true; };
}